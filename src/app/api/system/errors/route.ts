/**
 * Error reporting API endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  userAgent: string
  url: string
  timestamp: string
  errorId: string
  userId?: string
  sessionId?: string
  additional?: any
}

export async function POST(request: NextRequest) {
  try {
    const errorReport: ErrorReport = await request.json()
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'

    // Validate error report
    if (!errorReport.message || !errorReport.errorId) {
      return NextResponse.json(
        { error: 'Invalid error report format' },
        { status: 400 }
      )
    }

    // Log error to console with structured format
    console.error('FRONTEND_ERROR:', {
      errorId: errorReport.errorId,
      message: errorReport.message,
      url: errorReport.url,
      userAgent: errorReport.userAgent,
      timestamp: errorReport.timestamp,
      ip,
      stack: errorReport.stack,
      componentStack: errorReport.componentStack
    })

    // Store error in database
    await storeErrorInDatabase(errorReport, ip)

    // Send to external error monitoring service
    await forwardToErrorMonitoring(errorReport, ip)

    // Check if this is a critical error requiring immediate attention
    if (isCriticalError(errorReport)) {
      await sendCriticalErrorAlert(errorReport, ip)
    }

    return NextResponse.json({ 
      success: true, 
      errorId: errorReport.errorId 
    })

  } catch (error) {
    console.error('Failed to process error report:', error)
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    )
  }
}

async function storeErrorInDatabase(errorReport: ErrorReport, ip: string) {
  try {
    // This would integrate with your database
    // Example: Store in PostgreSQL via Supabase
    /*
    const { data, error } = await supabase
      .from('application_errors')
      .insert({
        error_id: errorReport.errorId,
        message: errorReport.message,
        stack: errorReport.stack,
        component_stack: errorReport.componentStack,
        url: errorReport.url,
        user_agent: errorReport.userAgent,
        ip_address: ip,
        session_id: errorReport.sessionId,
        user_id: errorReport.userId,
        additional_data: errorReport.additional,
        timestamp: errorReport.timestamp,
        created_at: new Date().toISOString()
      })
    */

    console.log(`Stored error ${errorReport.errorId} in database`)
  } catch (error) {
    console.error('Failed to store error in database:', error)
  }
}

async function forwardToErrorMonitoring(errorReport: ErrorReport, ip: string) {
  try {
    // Forward to external monitoring service (Sentry, Rollbar, etc.)
    
    // Example: Sentry integration
    /*
    import * as Sentry from '@sentry/node'
    
    Sentry.withScope(scope => {
      scope.setTag('errorId', errorReport.errorId)
      scope.setTag('url', errorReport.url)
      scope.setUser({
        id: errorReport.userId || 'anonymous',
        ip_address: ip
      })
      scope.setContext('browser', {
        userAgent: errorReport.userAgent,
        url: errorReport.url
      })
      
      const error = new Error(errorReport.message)
      error.stack = errorReport.stack
      
      Sentry.captureException(error)
    })
    */

    console.log(`Forwarded error ${errorReport.errorId} to monitoring service`)
  } catch (error) {
    console.error('Failed to forward error to monitoring service:', error)
  }
}

function isCriticalError(errorReport: ErrorReport): boolean {
  // Define criteria for critical errors
  const criticalKeywords = [
    'trading',
    'order',
    'payment',
    'security',
    'authentication',
    'wallet',
    'funds',
    'emergency'
  ]

  const message = errorReport.message.toLowerCase()
  return criticalKeywords.some(keyword => message.includes(keyword))
}

async function sendCriticalErrorAlert(errorReport: ErrorReport, ip: string) {
  try {
    // Send immediate alert for critical errors
    
    // Example: Slack webhook
    /*
    const slackMessage = {
      text: `🚨 Critical Error in Trading Platform`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Critical Error Detected*\n\n*Message:* ${errorReport.message}\n*Error ID:* ${errorReport.errorId}\n*URL:* ${errorReport.url}\n*Timestamp:* ${errorReport.timestamp}`
          }
        }
      ]
    }

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    })
    */

    // Example: Email alert
    /*
    await sendEmail({
      to: process.env.ALERT_EMAIL,
      subject: `Critical Error: ${errorReport.errorId}`,
      body: `
        Critical error detected in trading platform:
        
        Error ID: ${errorReport.errorId}
        Message: ${errorReport.message}
        URL: ${errorReport.url}
        User Agent: ${errorReport.userAgent}
        IP: ${ip}
        Timestamp: ${errorReport.timestamp}
        
        Stack Trace:
        ${errorReport.stack}
      `
    })
    */

    console.log(`Sent critical error alert for ${errorReport.errorId}`)
  } catch (error) {
    console.error('Failed to send critical error alert:', error)
  }
}

export async function GET(request: NextRequest) {
  // Return error statistics and recent errors (with appropriate permissions)
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const severity = url.searchParams.get('severity')

    // This would query your error storage
    // For now, return a simple response
    return NextResponse.json({
      errors: [],
      statistics: {
        total: 0,
        last24h: 0,
        critical: 0
      },
      message: 'Error retrieval endpoint - implementation depends on storage backend'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve errors' },
      { status: 500 }
    )
  }
}