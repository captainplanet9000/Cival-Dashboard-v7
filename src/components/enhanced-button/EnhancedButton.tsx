'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { backendApi } from '@/lib/api/backend-client'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Shield,
  Settings,
  MoreHorizontal
} from 'lucide-react'

export interface TradingAction {
  id: string
  type: 'buy' | 'sell' | 'stop_loss' | 'take_profit' | 'cancel' | 'modify'
  symbol: string
  quantity?: number
  price?: number
  stopPrice?: number
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  confirmationRequired: boolean
  estimatedImpact?: {
    portfolioPercent: number
    feeEstimate: number
    slippage: number
  }
}

export interface EnhancedButtonProps {
  action: TradingAction
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
  showConfirmation?: boolean
  showProgress?: boolean
  showRiskIndicator?: boolean
  countdown?: number // seconds
  className?: string
  onExecute?: (action: TradingAction) => Promise<void>
  onCancel?: () => void
  onConfirm?: () => void
}

export function EnhancedButton({
  action,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  showConfirmation = true,
  showProgress = false,
  showRiskIndicator = true,
  countdown,
  className,
  onExecute,
  onCancel,
  onConfirm
}: EnhancedButtonProps) {
  const { publishEvent } = useAGUIProtocol()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [countdownValue, setCountdownValue] = useState(countdown || 0)
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'success' | 'error' | 'cancelled'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  // Start countdown if provided
  useEffect(() => {
    if (countdown && countdown > 0) {
      setCountdownValue(countdown)
      countdownRef.current = setInterval(() => {
        setCountdownValue(prev => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current)
            }
            handleAutoExecute()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [countdown])

  // Auto-execute when countdown reaches zero
  const handleAutoExecute = async () => {
    if (!action.confirmationRequired) {
      await handleExecute()
    }
  }

  // Handle button click
  const handleClick = () => {
    if (isExecuting) return
    
    publishEvent('button.trading_action_triggered', {
      action: action.type as 'buy' | 'sell' | 'close' | 'hedge',
      symbol: action.symbol,
      amount: action.quantity,
      confirmation_required: action.confirmationRequired && showConfirmation
    })
    
    if (action.confirmationRequired && showConfirmation && !isConfirming) {
      setIsConfirming(true)
      onConfirm?.()
    } else {
      handleExecute()
    }
  }

  // Execute the trading action
  const handleExecute = async () => {
    try {
      setIsExecuting(true)
      setProgress(0)
      setExecutionStatus('idle')
      setErrorMessage(null)
      
      // Simulate progress
      if (showProgress) {
        let currentProgress = 0
        progressRef.current = setInterval(() => {
          currentProgress += 20
          setProgress(currentProgress)
          if (currentProgress >= 100) {
            if (progressRef.current) {
              clearInterval(progressRef.current)
            }
          }
        }, 200)
      }
      
      // Execute the action
      await onExecute?.(action)
      
      // Simulate API call for demo
      if (!onExecute) {
        await simulateExecution()
      }
      
      setExecutionStatus('success')
      setIsConfirming(false)
      
      publishEvent('trade.executed', {
        symbol: action.symbol,
        type: action.type,
        success: true
      })
      
    } catch (error) {
      setExecutionStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Execution failed')
      
      publishEvent('system.notification', {
        type: 'error',
        message: error instanceof Error ? error.message : 'Trading action failed',
        level: 'error'
      })
    } finally {
      setIsExecuting(false)
      if (progressRef.current) {
        clearInterval(progressRef.current)
      }
    }
  }

  // Simulate execution for demo
  const simulateExecution = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 10% chance of failure for demo
        if (Math.random() < 0.1) {
          reject(new Error('Market conditions unfavorable'))
        } else {
          resolve()
        }
      }, 1000)
    })
  }

  // Handle cancel
  const handleCancel = () => {
    setIsConfirming(false)
    setIsExecuting(false)
    setExecutionStatus('cancelled')
    
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    if (progressRef.current) {
      clearInterval(progressRef.current)
    }
    
    onCancel?.()
    
    publishEvent('trade.order_cancelled', {
      order_id: action.id,
      reason: 'User cancelled'
    })
  }

  // Get button icon based on action type
  const getActionIcon = () => {
    switch (action.type) {
      case 'buy': return <TrendingUp className="h-4 w-4" />
      case 'sell': return <TrendingDown className="h-4 w-4" />
      case 'stop_loss': return <Shield className="h-4 w-4" />
      case 'take_profit': return <CheckCircle className="h-4 w-4" />
      case 'cancel': return <XCircle className="h-4 w-4" />
      case 'modify': return <Settings className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  // Get risk indicator color
  const getRiskColor = () => {
    switch (action.riskLevel) {
      case 'low': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'high': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  // Get status icon
  const getStatusIcon = () => {
    switch (executionStatus) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />
      default: return null
    }
  }

  // Determine button variant based on action type and status
  const getButtonVariant = () => {
    if (executionStatus === 'success') return 'outline'
    if (executionStatus === 'error') return 'destructive'
    if (action.type === 'sell' || action.type === 'cancel') return 'destructive'
    return variant
  }

  const isDisabled = disabled || isExecuting || executionStatus === 'success'

  return (
    <div className={cn("relative", className)}>
      {/* Confirmation Overlay */}
      {isConfirming && (
        <Card className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <CardContent className="p-4 space-y-4">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto" />
              <h3 className="font-semibold">Confirm Action</h3>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
              
              {/* Risk and Impact Information */}
              {action.estimatedImpact && (
                <div className="text-xs space-y-1 p-2 bg-muted rounded">
                  <div>Portfolio Impact: {action.estimatedImpact.portfolioPercent}%</div>
                  <div>Est. Fee: ${action.estimatedImpact.feeEstimate.toFixed(2)}</div>
                  <div>Est. Slippage: {action.estimatedImpact.slippage}%</div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecute}
                className="flex-1"
                disabled={isExecuting}
              >
                {isExecuting ? 'Executing...' : 'Confirm'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Button */}
      <Button
        variant={getButtonVariant()}
        size={size}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          isExecuting && "animate-pulse"
        )}
      >
        <div className="flex items-center gap-2">
          {/* Status Icon */}
          {getStatusIcon() || getActionIcon()}
          
          {/* Button Text */}
          <span>
            {isExecuting ? 'Executing...' : 
             executionStatus === 'success' ? 'Completed' :
             executionStatus === 'error' ? 'Failed' :
             executionStatus === 'cancelled' ? 'Cancelled' :
             action.type.charAt(0).toUpperCase() + action.type.slice(1).replace('_', ' ')}
          </span>
          
          {/* Countdown */}
          {countdownValue > 0 && (
            <Badge variant="secondary" className="text-xs">
              {countdownValue}s
            </Badge>
          )}
          
          {/* Risk Indicator */}
          {showRiskIndicator && !isExecuting && executionStatus === 'idle' && (
            <div className={cn("w-2 h-2 rounded-full", getRiskColor().replace('text-', 'bg-'))} />
          )}
        </div>
        
        {/* Progress Bar */}
        {showProgress && isExecuting && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </Button>
      
      {/* Error Message */}
      {errorMessage && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-500 bg-background border rounded px-2 py-1 shadow-sm">
          {errorMessage}
        </div>
      )}
      
      {/* Additional Info */}
      {action.estimatedImpact && executionStatus === 'idle' && !isConfirming && (
        <div className="absolute top-full left-0 mt-1 text-xs text-muted-foreground bg-background border rounded px-2 py-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          Impact: {action.estimatedImpact.portfolioPercent}% | Fee: ${action.estimatedImpact.feeEstimate.toFixed(2)}
        </div>
      )}
    </div>
  )
}