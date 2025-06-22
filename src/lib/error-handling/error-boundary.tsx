/**
 * Global Error Boundary with comprehensive error handling
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Bug, ExternalLink } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console
    console.error('React Error Boundary caught an error:', error, errorInfo)

    // Send error to logging service
    this.logError(error, errorInfo)

    // Emit error event for AG-UI protocol
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ag-ui-error', {
        detail: {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorId: this.state.errorId,
          timestamp: Date.now()
        }
      }))
    }
  }

  private logError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send to backend logging service
      await fetch('/api/system/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          errorId: this.state.errorId,
          userId: 'anonymous', // Replace with actual user ID when available
          sessionId: sessionStorage.getItem('sessionId') || 'unknown'
        })
      })
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  private handleReportBug = () => {
    const bugReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      errorId: this.state.errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }

    const githubUrl = `https://github.com/your-repo/cival-dashboard/issues/new?title=Error Report: ${encodeURIComponent(this.state.error?.message || 'Unknown Error')}&body=${encodeURIComponent(JSON.stringify(bugReport, null, 2))}`
    window.open(githubUrl, '_blank')
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <CardTitle className="text-red-600">Something went wrong</CardTitle>
                  <CardDescription>
                    An unexpected error occurred in the trading platform
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <div><strong>Error ID:</strong> {this.state.errorId}</div>
                    <div><strong>Message:</strong> {this.state.error?.message}</div>
                    <div><strong>Time:</strong> {new Date().toLocaleString()}</div>
                  </div>
                </AlertDescription>
              </Alert>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Technical Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {this.state.error?.stack}
                  </pre>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleReportBug} variant="secondary" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Report Bug
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                If this problem persists, please contact support with Error ID: {this.state.errorId}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary }
export default ErrorBoundary