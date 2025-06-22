/**
 * Logging API endpoint for collecting frontend logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  data?: any
  userId?: string
  sessionId?: string
  component?: string
  action?: string
  context?: any
}

interface LogBatch {
  logs: LogEntry[]
  sessionId: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const logBatch: LogBatch = await request.json()
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'unknown'
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'

    // Validate log batch
    if (!logBatch.logs || !Array.isArray(logBatch.logs)) {
      return NextResponse.json(
        { error: 'Invalid log format' },
        { status: 400 }
      )
    }

    // Process each log entry
    for (const log of logBatch.logs) {
      await processLogEntry({
        ...log,
        metadata: {
          userAgent,
          ip,
          batchTimestamp: logBatch.timestamp,
          batchSessionId: logBatch.sessionId
        }
      })
    }

    // Store in database (if available)
    await storeLogsInDatabase(logBatch, { userAgent, ip })

    // Forward critical logs to external monitoring
    const criticalLogs = logBatch.logs.filter(log => 
      log.level === 'ERROR' || log.level === 'CRITICAL'
    )
    if (criticalLogs.length > 0) {
      await forwardCriticalLogs(criticalLogs, { userAgent, ip, sessionId: logBatch.sessionId })
    }

    return NextResponse.json({ 
      success: true, 
      processed: logBatch.logs.length 
    })

  } catch (error) {
    console.error('Failed to process logs:', error)
    return NextResponse.json(
      { error: 'Failed to process logs' },
      { status: 500 }
    )
  }
}

async function processLogEntry(log: LogEntry & { metadata: any }) {
  // Console output with structured format
  const timestamp = new Date(log.timestamp).toISOString()
  const logLine = `[${timestamp}] ${log.level} [${log.component || 'unknown'}] ${log.message}`
  
  console.log(logLine, {
    data: log.data,
    context: log.context,
    metadata: log.metadata
  })

  // Special handling for trading-related logs
  if (log.component === 'trading' || log.component === 'order-management') {
    await handleTradingLog(log)
  }

  // Special handling for agent logs
  if (log.component === 'agent') {
    await handleAgentLog(log)
  }

  // Special handling for risk management logs
  if (log.component === 'risk-management') {
    await handleRiskLog(log)
  }
}

async function handleTradingLog(log: LogEntry) {
  // Store trading events in specialized storage
  if (log.action === 'order_placed' || log.action === 'order_filled' || log.action === 'order_cancelled') {
    // Could integrate with trading database or audit log
    console.log('TRADING_AUDIT:', {
      action: log.action,
      timestamp: log.timestamp,
      data: log.data
    })
  }
}

async function handleAgentLog(log: LogEntry) {
  // Track agent performance and decisions
  if (log.action === 'decision_made' || log.action === 'strategy_executed') {
    console.log('AGENT_AUDIT:', {
      agentId: (log as any).agentId,
      action: log.action,
      timestamp: log.timestamp,
      data: log.data
    })
  }
}

async function handleRiskLog(log: LogEntry) {
  // Risk events need immediate attention
  if (log.level === 'WARN' || log.level === 'ERROR') {
    console.warn('RISK_ALERT:', {
      message: log.message,
      data: log.data,
      timestamp: log.timestamp
    })
  }
}

async function storeLogsInDatabase(logBatch: LogBatch, metadata: any) {
  try {
    // This would integrate with your database
    // For now, we'll use a simple file-based approach or external service
    
    // Example: Store in PostgreSQL via Supabase
    /*
    const { data, error } = await supabase
      .from('application_logs')
      .insert(logBatch.logs.map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        data: log.data,
        component: log.component,
        action: log.action,
        session_id: log.sessionId,
        user_agent: metadata.userAgent,
        ip_address: metadata.ip,
        created_at: new Date().toISOString()
      })))
    */

    console.log(`Stored ${logBatch.logs.length} logs in database`)
  } catch (error) {
    console.error('Failed to store logs in database:', error)
  }
}

async function forwardCriticalLogs(logs: LogEntry[], metadata: any) {
  try {
    // Forward to external monitoring service (e.g., Sentry, DataDog, etc.)
    for (const log of logs) {
      if (log.level === 'CRITICAL') {
        // Could integrate with Slack, Discord, or email alerts
        console.error('CRITICAL_ALERT:', {
          message: log.message,
          data: log.data,
          metadata,
          timestamp: log.timestamp
        })
      }
    }
  } catch (error) {
    console.error('Failed to forward critical logs:', error)
  }
}

export async function GET(request: NextRequest) {
  // Return recent logs for debugging (with appropriate permissions)
  try {
    const url = new URL(request.url)
    const level = url.searchParams.get('level')
    const component = url.searchParams.get('component')
    const limit = parseInt(url.searchParams.get('limit') || '100')

    // This would query your log storage
    // For now, return a simple response
    return NextResponse.json({
      logs: [],
      message: 'Log retrieval endpoint - implementation depends on storage backend'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve logs' },
      { status: 500 }
    )
  }
}