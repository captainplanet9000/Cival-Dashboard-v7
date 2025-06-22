/**
 * Trading-specific error handling and recovery
 */

import { logger } from './logger'

// Trading Error Types
export class TradingError extends Error {
  public code: string
  public severity: 'low' | 'medium' | 'high' | 'critical'
  public recoverable: boolean
  public timestamp: number
  public context: any

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    recoverable: boolean = true,
    context?: any
  ) {
    super(message)
    this.name = 'TradingError'
    this.code = code
    this.severity = severity
    this.recoverable = recoverable
    this.timestamp = Date.now()
    this.context = context || {}

    // Log the error
    logger.error(`Trading Error [${code}]`, {
      message: this.message,
      code: this.code,
      severity: this.severity,
      recoverable: this.recoverable,
      context: this.context,
      stack: this.stack
    })
  }
}

export class OrderExecutionError extends TradingError {
  constructor(message: string, orderId: string, exchange: string, context?: any) {
    super(message, 'ORDER_EXECUTION_FAILED', 'high', true, {
      orderId,
      exchange,
      ...context
    })
    this.name = 'OrderExecutionError'
  }
}

export class InsufficientFundsError extends TradingError {
  constructor(required: number, available: number, asset: string) {
    super(
      `Insufficient funds: Required ${required} ${asset}, Available ${available} ${asset}`,
      'INSUFFICIENT_FUNDS',
      'medium',
      false,
      { required, available, asset }
    )
    this.name = 'InsufficientFundsError'
  }
}

export class RiskLimitExceededError extends TradingError {
  constructor(metric: string, value: number, limit: number) {
    super(
      `Risk limit exceeded: ${metric} = ${value}, Limit = ${limit}`,
      'RISK_LIMIT_EXCEEDED',
      'critical',
      false,
      { metric, value, limit }
    )
    this.name = 'RiskLimitExceededError'
  }
}

export class MarketDataError extends TradingError {
  constructor(symbol: string, source: string, reason: string) {
    super(
      `Market data error for ${symbol} from ${source}: ${reason}`,
      'MARKET_DATA_ERROR',
      'medium',
      true,
      { symbol, source, reason }
    )
    this.name = 'MarketDataError'
  }
}

export class ExchangeConnectionError extends TradingError {
  constructor(exchange: string, reason: string) {
    super(
      `Exchange connection failed: ${exchange} - ${reason}`,
      'EXCHANGE_CONNECTION_ERROR',
      'high',
      true,
      { exchange, reason }
    )
    this.name = 'ExchangeConnectionError'
  }
}

export class AgentExecutionError extends TradingError {
  constructor(agentId: string, action: string, reason: string) {
    super(
      `Agent execution failed: ${agentId} - ${action} - ${reason}`,
      'AGENT_EXECUTION_ERROR',
      'medium',
      true,
      { agentId, action, reason }
    )
    this.name = 'AgentExecutionError'
  }
}

// Error Recovery Strategies
interface RecoveryStrategy {
  name: string
  canRecover: (error: TradingError) => boolean
  recover: (error: TradingError) => Promise<boolean>
  maxRetries: number
  backoffMs: number
}

class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = []
  private retryAttempts: Map<string, number> = new Map()

  constructor() {
    this.registerDefaultStrategies()
  }

  private registerDefaultStrategies() {
    // Retry strategy for temporary network issues
    this.registerStrategy({
      name: 'network-retry',
      canRecover: (error) => 
        ['EXCHANGE_CONNECTION_ERROR', 'MARKET_DATA_ERROR'].includes(error.code) &&
        error.recoverable,
      recover: async (error) => {
        await this.delay(1000) // Wait 1 second
        logger.info(`Attempting recovery for ${error.code}`, { 
          strategy: 'network-retry',
          attempt: this.getRetryCount(error.code) + 1
        })
        return true // Indicate that a retry should be attempted
      },
      maxRetries: 3,
      backoffMs: 1000
    })

    // Reduce position size on insufficient funds
    this.registerStrategy({
      name: 'reduce-position-size',
      canRecover: (error) => error.code === 'INSUFFICIENT_FUNDS',
      recover: async (error) => {
        const { required, available } = error.context
        const newSize = available * 0.95 // Use 95% of available funds
        
        logger.warn('Reducing position size due to insufficient funds', {
          originalSize: required,
          newSize,
          available
        })

        // Emit event to adjust order size
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('adjust-order-size', {
            detail: { newSize, reason: 'insufficient-funds' }
          }))
        }

        return true
      },
      maxRetries: 1,
      backoffMs: 0
    })

    // Emergency stop on critical risk limit breach
    this.registerStrategy({
      name: 'emergency-stop',
      canRecover: (error) => 
        error.code === 'RISK_LIMIT_EXCEEDED' && 
        error.severity === 'critical',
      recover: async (error) => {
        logger.critical('Executing emergency stop due to critical risk limit breach', error.context)

        try {
          // Stop all trading activity
          await fetch('/api/trading/emergency-stop', { method: 'POST' })
          
          // Emit emergency event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('emergency-stop', {
              detail: { reason: error.message, timestamp: Date.now() }
            }))
          }

          return true
        } catch (recoveryError) {
          logger.critical('Failed to execute emergency stop', recoveryError)
          return false
        }
      },
      maxRetries: 1,
      backoffMs: 0
    })

    // Agent restart strategy
    this.registerStrategy({
      name: 'restart-agent',
      canRecover: (error) => error.code === 'AGENT_EXECUTION_ERROR',
      recover: async (error) => {
        const { agentId } = error.context
        
        logger.warn(`Attempting to restart agent ${agentId}`, error.context)

        try {
          // Stop the failing agent
          await fetch(`/api/agents/${agentId}/stop`, { method: 'POST' })
          
          // Wait a moment
          await this.delay(2000)
          
          // Restart the agent
          await fetch(`/api/agents/${agentId}/start`, { method: 'POST' })
          
          return true
        } catch (recoveryError) {
          logger.error(`Failed to restart agent ${agentId}`, recoveryError)
          return false
        }
      },
      maxRetries: 2,
      backoffMs: 5000
    })
  }

  registerStrategy(strategy: RecoveryStrategy) {
    this.strategies.push(strategy)
  }

  async handleError(error: TradingError): Promise<boolean> {
    // Find applicable recovery strategy
    const strategy = this.strategies.find(s => s.canRecover(error))
    
    if (!strategy) {
      logger.warn('No recovery strategy found for error', { 
        errorCode: error.code,
        errorMessage: error.message 
      })
      return false
    }

    const retryCount = this.getRetryCount(error.code)
    
    if (retryCount >= strategy.maxRetries) {
      logger.error('Max retry attempts exceeded for error', { 
        errorCode: error.code,
        retryCount,
        maxRetries: strategy.maxRetries 
      })
      return false
    }

    try {
      // Increment retry count
      this.retryAttempts.set(error.code, retryCount + 1)

      // Apply backoff delay
      const delay = strategy.backoffMs * Math.pow(2, retryCount) // Exponential backoff
      if (delay > 0) {
        await this.delay(delay)
      }

      // Attempt recovery
      const recovered = await strategy.recover(error)
      
      if (recovered) {
        logger.info('Error recovery successful', { 
          errorCode: error.code,
          strategy: strategy.name,
          attempt: retryCount + 1
        })
        // Reset retry count on successful recovery
        this.retryAttempts.delete(error.code)
        return true
      } else {
        logger.warn('Error recovery failed', { 
          errorCode: error.code,
          strategy: strategy.name,
          attempt: retryCount + 1
        })
        return false
      }
    } catch (recoveryError) {
      logger.error('Recovery strategy threw an error', {
        originalError: error.code,
        recoveryError: recoveryError,
        strategy: strategy.name
      })
      return false
    }
  }

  private getRetryCount(errorCode: string): number {
    return this.retryAttempts.get(errorCode) || 0
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  clearRetryCount(errorCode: string) {
    this.retryAttempts.delete(errorCode)
  }

  getRetryStatistics() {
    return Array.from(this.retryAttempts.entries()).map(([errorCode, count]) => ({
      errorCode,
      retryCount: count
    }))
  }
}

// Global error recovery manager
export const errorRecoveryManager = new ErrorRecoveryManager()

// Error handling utilities
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      const startTime = performance.now()
      const result = await fn(...args)
      const endTime = performance.now()
      
      logger.logPerformance(context || fn.name, endTime - startTime)
      return result
    } catch (error) {
      if (error instanceof TradingError) {
        const recovered = await errorRecoveryManager.handleError(error)
        if (recovered) {
          // Retry the operation
          return await fn(...args)
        }
      } else {
        // Convert to TradingError
        const tradingError = new TradingError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR',
          'medium',
          false,
          { originalError: error, context }
        )
        await errorRecoveryManager.handleError(tradingError)
      }
      
      throw error
    }
  }
}

// Error boundary hook for React components
// Note: ErrorBoundary implementation would be needed for full functionality

// API error handler utility
export const handleApiError = async (response: Response, context?: string): Promise<any> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }))
    
    const error = new TradingError(
      errorData.message || `API request failed with status ${response.status}`,
      `API_ERROR_${response.status}`,
      response.status >= 500 ? 'high' : 'medium',
      response.status < 500, // 4xx errors are usually not recoverable
      {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        context,
        errorData
      }
    )

    throw error
  }

  return response.json()
}

// All classes are already exported with export declarations above