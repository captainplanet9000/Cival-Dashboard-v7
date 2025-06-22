/**
 * Comprehensive Logging System
 * Structured logging for trading platform with multiple transports
 */

interface LogLevel {
  DEBUG: number
  INFO: number
  WARN: number
  ERROR: number
  CRITICAL: number
}

interface LogEntry {
  timestamp: string
  level: keyof LogLevel
  message: string
  data?: any
  userId?: string
  sessionId?: string
  component?: string
  action?: string
  tradeId?: string
  orderId?: string
  agentId?: string
  errorId?: string
  performanceMetrics?: {
    executionTime?: number
    memoryUsage?: number
    requestId?: string
  }
  context?: {
    url?: string
    userAgent?: string
    viewport?: { width: number; height: number }
    networkStatus?: string
  }
}

interface LoggerConfig {
  level: keyof LogLevel
  enableConsole: boolean
  enableRemote: boolean
  enableStorage: boolean
  batchSize: number
  flushInterval: number
  maxStorageEntries: number
  remoteEndpoint: string
}

class Logger {
  private config: LoggerConfig
  private logLevels: LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
  }
  private logBuffer: LogEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private sessionId: string

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'INFO',
      enableConsole: true,
      enableRemote: true,
      enableStorage: true,
      batchSize: 10,
      flushInterval: 5000,
      maxStorageEntries: 1000,
      remoteEndpoint: '/api/system/logs',
      ...config
    }

    this.sessionId = this.generateSessionId()
    this.startPeriodicFlush()
    this.setupErrorHandlers()
    this.setupPerformanceMonitoring()
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private shouldLog(level: keyof LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level]
  }

  private createLogEntry(
    level: keyof LogLevel,
    message: string,
    data?: any,
    context?: Partial<LogEntry>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight
        } : undefined,
        networkStatus: typeof navigator !== 'undefined' && 'connection' in navigator 
          ? (navigator as any).connection?.effectiveType 
          : undefined
      },
      ...context
    }

    if (data !== undefined) {
      entry.data = this.sanitizeData(data)
    }

    return entry
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') return data
    if (data === null || data === undefined) return data
    if (typeof data === 'number' || typeof data === 'boolean') return data

    try {
      // Remove sensitive information
      const sensitiveKeys = ['password', 'token', 'key', 'secret', 'privateKey', 'apiKey']
      const sanitized = JSON.parse(JSON.stringify(data))
      
      const sanitizeObject = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject)
        }
        
        if (obj && typeof obj === 'object') {
          const result: any = {}
          for (const [key, value] of Object.entries(obj)) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
              result[key] = '[REDACTED]'
            } else {
              result[key] = sanitizeObject(value)
            }
          }
          return result
        }
        
        return obj
      }

      return sanitizeObject(sanitized)
    } catch (error) {
      return '[Circular or Invalid Data]'
    }
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return

    const timestamp = new Date(entry.timestamp).toLocaleTimeString()
    const prefix = `[${timestamp}] ${entry.level}:`
    
    switch (entry.level) {
      case 'DEBUG':
        console.debug(prefix, entry.message, entry.data)
        break
      case 'INFO':
        console.info(prefix, entry.message, entry.data)
        break
      case 'WARN':
        console.warn(prefix, entry.message, entry.data)
        break
      case 'ERROR':
      case 'CRITICAL':
        console.error(prefix, entry.message, entry.data)
        break
    }
  }

  private logToStorage(entry: LogEntry): void {
    if (!this.config.enableStorage || typeof window === 'undefined') return

    try {
      const storageKey = 'trading-platform-logs'
      const existing = localStorage.getItem(storageKey)
      let logs: LogEntry[] = existing ? JSON.parse(existing) : []
      
      logs.push(entry)
      
      // Maintain max storage limit
      if (logs.length > this.config.maxStorageEntries) {
        logs = logs.slice(-this.config.maxStorageEntries)
      }
      
      localStorage.setItem(storageKey, JSON.stringify(logs))
    } catch (error) {
      console.warn('Failed to log to localStorage:', error)
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry)
    
    if (this.logBuffer.length >= this.config.batchSize) {
      this.flushLogs()
    }
  }

  private async flushLogs(): Promise<void> {
    if (!this.config.enableRemote || this.logBuffer.length === 0) return

    const logsToSend = [...this.logBuffer]
    this.logBuffer = []

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: logsToSend,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`Logging service responded with ${response.status}`)
      }
    } catch (error) {
      console.warn('Failed to send logs to remote service:', error)
      // Add logs back to buffer for retry
      this.logBuffer.unshift(...logsToSend)
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushLogs()
    }, this.config.flushInterval)
  }

  private setupErrorHandlers(): void {
    if (typeof window === 'undefined') return

    // Global error handler
    window.addEventListener('error', (event) => {
      this.error('Global JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      })
    })

    // AG-UI error handler
    window.addEventListener('ag-ui-error', (event: any) => {
      this.error('AG-UI Protocol Error', event.detail)
    })
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('performance' in window)) return

    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        
        this.info('Page Load Performance', {
          loadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
        })
      }, 0)
    })

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        this.debug('Memory Usage', {
          used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
        })
      }, 30000) // Every 30 seconds
    }
  }

  // Public logging methods
  debug(message: string, data?: any, context?: Partial<LogEntry>): void {
    if (!this.shouldLog('DEBUG')) return
    
    const entry = this.createLogEntry('DEBUG', message, data, context)
    this.logToConsole(entry)
    this.logToStorage(entry)
    this.addToBuffer(entry)
  }

  info(message: string, data?: any, context?: Partial<LogEntry>): void {
    if (!this.shouldLog('INFO')) return
    
    const entry = this.createLogEntry('INFO', message, data, context)
    this.logToConsole(entry)
    this.logToStorage(entry)
    this.addToBuffer(entry)
  }

  warn(message: string, data?: any, context?: Partial<LogEntry>): void {
    if (!this.shouldLog('WARN')) return
    
    const entry = this.createLogEntry('WARN', message, data, context)
    this.logToConsole(entry)
    this.logToStorage(entry)
    this.addToBuffer(entry)
  }

  error(message: string, data?: any, context?: Partial<LogEntry>): void {
    if (!this.shouldLog('ERROR')) return
    
    const entry = this.createLogEntry('ERROR', message, data, {
      ...context,
      errorId: context?.errorId || Date.now().toString(36)
    })
    this.logToConsole(entry)
    this.logToStorage(entry)
    this.addToBuffer(entry)
  }

  critical(message: string, data?: any, context?: Partial<LogEntry>): void {
    const entry = this.createLogEntry('CRITICAL', message, data, {
      ...context,
      errorId: context?.errorId || Date.now().toString(36)
    })
    this.logToConsole(entry)
    this.logToStorage(entry)
    this.addToBuffer(entry)
    this.flushLogs() // Immediate flush for critical errors
  }

  // Trading-specific logging methods
  logTrade(action: string, data: any, context?: Partial<LogEntry>): void {
    this.info(`Trading: ${action}`, data, {
      ...context,
      component: 'trading',
      action
    })
  }

  logOrder(action: string, orderId: string, data: any, context?: Partial<LogEntry>): void {
    this.info(`Order: ${action}`, data, {
      ...context,
      component: 'order-management',
      action,
      orderId
    })
  }

  logAgent(agentId: string, action: string, data: any, context?: Partial<LogEntry>): void {
    this.info(`Agent: ${action}`, data, {
      ...context,
      component: 'agent',
      action,
      agentId
    })
  }

  logRisk(action: string, data: any, context?: Partial<LogEntry>): void {
    this.warn(`Risk: ${action}`, data, {
      ...context,
      component: 'risk-management',
      action
    })
  }

  logPerformance(operation: string, executionTime: number, data?: any): void {
    this.debug(`Performance: ${operation}`, data, {
      component: 'performance',
      action: operation,
      performanceMetrics: {
        executionTime,
        memoryUsage: typeof performance !== 'undefined' && 'memory' in performance 
          ? (performance as any).memory?.usedJSHeapSize 
          : undefined
      }
    })
  }

  // Utility methods
  async getLogs(level?: keyof LogLevel, limit: number = 100): Promise<LogEntry[]> {
    if (typeof window === 'undefined') return []

    try {
      const storageKey = 'trading-platform-logs'
      const logs: LogEntry[] = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      let filtered = logs
      if (level) {
        filtered = logs.filter(log => this.logLevels[log.level] >= this.logLevels[level])
      }
      
      return filtered.slice(-limit)
    } catch (error) {
      console.warn('Failed to retrieve logs from storage:', error)
      return []
    }
  }

  clearLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trading-platform-logs')
    }
    this.logBuffer = []
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flushLogs()
  }
}

// Create global logger instance
const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO',
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  enableStorage: true
})

export { Logger, logger }
export type { LogEntry, LoggerConfig }