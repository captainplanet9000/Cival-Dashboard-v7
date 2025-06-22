'use client'

import { useState, useCallback, useMemo } from 'react'
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar'
import moment from 'moment'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { cn } from '@/lib/utils'
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Shield,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  Bot
} from 'lucide-react'

import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  type: EventType
  status: EventStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  description?: string
  metadata?: {
    symbol?: string
    strategy?: string
    expectedMove?: number
    riskLevel?: number
    participants?: string[]
    tradingSession?: 'pre_market' | 'regular' | 'after_hours'
    alerts?: Array<{
      time: Date
      message: string
      sent?: boolean
    }>
  }
  resource?: any
}

export type EventType = 
  | 'earnings_announcement'
  | 'market_open'
  | 'market_close'
  | 'strategy_execution'
  | 'risk_assessment'
  | 'portfolio_review'
  | 'economic_data'
  | 'fed_meeting'
  | 'options_expiry'
  | 'dividend_date'
  | 'strategy_meeting'
  | 'backtesting'
  | 'performance_review'
  | 'market'
  | 'strategy'
  | 'agent'
  | 'custom'
  | 'other'

export type EventStatus = 'draft' | 'scheduled' | 'in_progress' | 'active' | 'completed' | 'cancelled' | 'delayed'

export interface BigCalendarProps {
  title?: string
  events?: CalendarEvent[]
  defaultView?: View
  views?: View[]
  showToolbar?: boolean
  enableEventCreation?: boolean
  enableEventEditing?: boolean
  enableDragDrop?: boolean
  timezone?: string
  businessHours?: {
    start: string
    end: string
    days: number[]
  }
  onEventCreate?: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>
  onEventUpdate?: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>
  onEventDelete?: (eventId: string) => Promise<void>
  onEventSelect?: (event: CalendarEvent) => void
  onSlotSelect?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void
  className?: string
}

// Event type configurations
const EVENT_TYPE_CONFIG = {
  earnings_announcement: {
    color: '#3b82f6',
    icon: TrendingUp,
    label: 'Earnings'
  },
  market_open: {
    color: '#10b981',
    icon: Clock,
    label: 'Market Open'
  },
  market_close: {
    color: '#ef4444',
    icon: Clock,
    label: 'Market Close'
  },
  strategy_execution: {
    color: '#8b5cf6',
    icon: BarChart3,
    label: 'Strategy'
  },
  risk_assessment: {
    color: '#f59e0b',
    icon: Shield,
    label: 'Risk Assessment'
  },
  portfolio_review: {
    color: '#06b6d4',
    icon: BarChart3,
    label: 'Portfolio Review'
  },
  economic_data: {
    color: '#84cc16',
    icon: TrendingUp,
    label: 'Economic Data'
  },
  fed_meeting: {
    color: '#dc2626',
    icon: AlertTriangle,
    label: 'Fed Meeting'
  },
  options_expiry: {
    color: '#7c3aed',
    icon: Clock,
    label: 'Options Expiry'
  },
  dividend_date: {
    color: '#059669',
    icon: TrendingUp,
    label: 'Dividend'
  },
  strategy_meeting: {
    color: '#0891b2',
    icon: BarChart3,
    label: 'Strategy Meeting'
  },
  backtesting: {
    color: '#7c2d12',
    icon: BarChart3,
    label: 'Backtesting'
  },
  performance_review: {
    color: '#1e40af',
    icon: BarChart3,
    label: 'Performance Review'
  },
  other: {
    color: '#6b7280',
    icon: CalendarIcon,
    label: 'Other'
  },
  market: {
    color: '#10b981',
    icon: TrendingUp,
    label: 'Market'
  },
  strategy: {
    color: '#8b5cf6',
    icon: BarChart3,
    label: 'Strategy'
  },
  agent: {
    color: '#f59e0b',
    icon: Bot,
    label: 'Agent'
  },
  custom: {
    color: '#6366f1',
    icon: CalendarIcon,
    label: 'Custom'
  }
}

export function BigCalendar({
  title = "Trading Calendar",
  events = [],
  defaultView = Views.WEEK,
  views = [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA],
  showToolbar = true,
  enableEventCreation = true,
  enableEventEditing = true,
  enableDragDrop = true,
  timezone = 'America/New_York',
  businessHours = {
    start: '09:30',
    end: '16:00',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  },
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onEventSelect,
  onSlotSelect,
  className
}: BigCalendarProps) {
  const { calendarEvents, updateCalendarEvents } = useAppStore()
  const { publishEvent } = useAGUIProtocol()
  
  const [currentView, setCurrentView] = useState<View>(defaultView)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [filterType, setFilterType] = useState<EventType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Combine props events with store events
  const allEvents = useMemo(() => {
    const combinedEvents = [...events, ...calendarEvents]
    
    // Apply filters
    return combinedEvents.filter(event => {
      const matchesType = filterType === 'all' || event.type === filterType
      const matchesStatus = filterStatus === 'all' || event.status === filterStatus
      const matchesSearch = searchQuery === '' ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.metadata?.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesType && matchesStatus && matchesSearch
    })
  }, [events, calendarEvents, filterType, filterStatus, searchQuery])

  // Custom event component
  const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
    const config = EVENT_TYPE_CONFIG[event.type]
    const IconComponent = config.icon
    
    return (
      <div className={cn(
        "p-1 rounded text-white text-xs font-medium flex items-center gap-1",
        "cursor-pointer hover:opacity-80 transition-opacity"
      )} style={{ backgroundColor: config.color }}>
        <IconComponent className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{event.title}</span>
        {event.priority === 'critical' && (
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
        )}
      </div>
    )
  }, [])

  // Custom agenda event component
  const AgendaEventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
    const config = EVENT_TYPE_CONFIG[event.type]
    const IconComponent = config.icon
    
    return (
      <div className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
        <div 
          className="w-4 h-4 rounded flex items-center justify-center"
          style={{ backgroundColor: config.color }}
        >
          <IconComponent className="h-3 w-3 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{event.title}</span>
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
            {event.metadata?.symbol && (
              <Badge variant="secondary" className="text-xs">
                {event.metadata.symbol}
              </Badge>
            )}
          </div>
          
          {event.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {event.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span>{moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}</span>
            <Badge 
              variant={
                event.status === 'completed' ? 'default' :
                event.status === 'in_progress' ? 'secondary' :
                event.status === 'cancelled' ? 'destructive' :
                'outline'
              }
              className="text-xs"
            >
              {event.status.replace('_', ' ')}
            </Badge>
            <Badge 
              variant={
                event.priority === 'critical' ? 'destructive' :
                event.priority === 'high' ? 'secondary' :
                'outline'
              }
              className="text-xs"
            >
              {event.priority}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleEventSelect(event)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {enableEventEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleEventEdit(event)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleEventDelete(event.id)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }, [enableEventEditing])

  // Handle event selection
  const handleEventSelect = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    onEventSelect?.(event)
    
    publishEvent('calendar.event_selected', {
      eventId: event.id,
      eventType: event.type,
      eventTitle: event.title,
      eventDate: event.start.toISOString()
    })
  }, [onEventSelect, publishEvent])

  // Handle slot selection (creating new events)
  const handleSlotSelect = useCallback(async (slotInfo: { start: Date; end: Date; slots: Date[] }) => {
    if (!enableEventCreation) return
    
    onSlotSelect?.(slotInfo)
    
    // Create default event
    const newEvent: Partial<CalendarEvent> = {
      title: 'New Event',
      start: slotInfo.start,
      end: slotInfo.end,
      type: 'other',
      status: 'scheduled',
      priority: 'medium'
    }
    
    if (onEventCreate) {
      try {
        const createdEvent = await onEventCreate(newEvent)
        updateCalendarEvents([...calendarEvents, createdEvent])
        
        publishEvent('calendar.event_created', {
          event_id: createdEvent.id,
          title: createdEvent.title,
          start: createdEvent.start.toISOString(),
          end: createdEvent.end.toISOString(),
          type: createdEvent.type
        })
      } catch (error) {
        console.error('Failed to create event:', error)
      }
    }
  }, [enableEventCreation, onSlotSelect, onEventCreate, calendarEvents, updateCalendarEvents, publishEvent])

  // Handle event editing
  const handleEventEdit = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }, [])

  // Handle event deletion
  const handleEventDelete = useCallback(async (eventId: string) => {
    if (onEventDelete) {
      try {
        await onEventDelete(eventId)
        updateCalendarEvents(calendarEvents.filter(e => e.id !== eventId))
        
        publishEvent('calendar.event_deleted', {
          event_id: eventId
        })
      } catch (error) {
        console.error('Failed to delete event:', error)
      }
    }
  }, [onEventDelete, calendarEvents, updateCalendarEvents, publishEvent])

  // Handle event drag and drop
  const handleEventDrop = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    if (!enableDragDrop) return
    
    const updates = { start, end }
    
    if (onEventUpdate) {
      try {
        await onEventUpdate(event.id, updates)
        
        updateCalendarEvents(
          calendarEvents.map(e => 
            e.id === event.id ? { ...e, ...updates } : e
          )
        )
        
        publishEvent('calendar.event_moved', {
          eventId: event.id,
          oldStart: event.start.toISOString(),
          newStart: start.toISOString(),
          oldEnd: event.end.toISOString(),
          newEnd: end.toISOString()
        })
      } catch (error) {
        console.error('Failed to update event:', error)
      }
    }
  }, [enableDragDrop, onEventUpdate, calendarEvents, updateCalendarEvents, publishEvent])

  // Handle event resize
  const handleEventResize = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    if (!enableDragDrop) return
    
    const updates = { start, end }
    
    if (onEventUpdate) {
      try {
        await onEventUpdate(event.id, updates)
        
        updateCalendarEvents(
          calendarEvents.map(e => 
            e.id === event.id ? { ...e, ...updates } : e
          )
        )
        
        publishEvent('calendar.event_resized', {
          eventId: event.id,
          oldStart: event.start.toISOString(),
          newStart: start.toISOString(),
          oldEnd: event.end.toISOString(),
          newEnd: end.toISOString()
        })
      } catch (error) {
        console.error('Failed to resize event:', error)
      }
    }
  }, [enableDragDrop, onEventUpdate, calendarEvents, updateCalendarEvents, publishEvent])

  // Custom day prop getter for business hours highlighting
  const dayPropGetter = useCallback((date: Date) => {
    const day = date.getDay()
    const hour = date.getHours()
    const businessStart = parseInt(businessHours.start.split(':')[0])
    const businessEnd = parseInt(businessHours.end.split(':')[0])
    
    if (!businessHours.days.includes(day) || hour < businessStart || hour >= businessEnd) {
      return {
        className: 'non-business-hours',
        style: {
          backgroundColor: '#f9fafb'
        }
      }
    }
    
    return {}
  }, [businessHours])

  // Custom slot prop getter
  const slotPropGetter = useCallback((date: Date) => {
    const now = new Date()
    const isPast = date < now
    
    if (isPast) {
      return {
        className: 'past-slot',
        style: {
          backgroundColor: '#f3f4f6'
        }
      }
    }
    
    return {}
  }, [])

  // Export calendar data
  const exportCalendar = useCallback(() => {
    const calendarData = {
      events: allEvents,
      exportDate: new Date().toISOString(),
      timezone,
      totalEvents: allEvents.length
    }
    
    const dataStr = JSON.stringify(calendarData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `trading-calendar-${moment().format('YYYY-MM-DD')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [allEvents, timezone])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {allEvents.length} events • {timezone}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {moment(currentDate).format('MMMM YYYY')}
            </Badge>
            <Button variant="outline" size="sm" onClick={exportCalendar}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
            </SelectContent>
          </Select>
          
          {enableEventCreation && (
            <Button onClick={() => setShowEventModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          )}
        </div>
        
        {/* Calendar */}
        <div className="h-[600px] bg-background rounded-lg border">
          <Calendar
            localizer={localizer}
            events={allEvents}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            allDayAccessor="allDay"
            view={currentView}
            onView={setCurrentView}
            views={views}
            date={currentDate}
            onNavigate={setCurrentDate}
            toolbar={showToolbar}
            selectable={enableEventCreation}
            onSelectEvent={handleEventSelect}
            onSelectSlot={handleSlotSelect}
            dayPropGetter={dayPropGetter}
            slotPropGetter={slotPropGetter}
            components={{
              event: EventComponent,
              agenda: {
                event: AgendaEventComponent
              }
            }}
            step={15}
            timeslots={4}
            min={moment().hour(6).minute(0).toDate()}
            max={moment().hour(22).minute(0).toDate()}
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }, culture, local) => 
                `${local?.format(start, 'HH:mm', culture) || moment(start).format('HH:mm')} - ${local?.format(end, 'HH:mm', culture) || moment(end).format('HH:mm')}`,
              agendaTimeFormat: 'HH:mm',
              agendaDateFormat: 'ddd MMM DD',
              dayHeaderFormat: 'dddd MMM DD',
              dayRangeHeaderFormat: ({ start, end }, culture, local) =>
                `${local?.format(start, 'MMM DD', culture) || moment(start).format('MMM DD')} - ${local?.format(end, 'MMM DD', culture) || moment(end).format('MMM DD')}`
            }}
            messages={{
              allDay: 'All Day',
              previous: 'Previous',
              next: 'Next',
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              agenda: 'Agenda',
              noEventsInRange: 'No events in this range.',
              showMore: (total) => `+${total} more`
            }}
          />
        </div>
        
        {/* Event Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{allEvents.length}</div>
            <div className="text-sm text-muted-foreground">Total Events</div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-500">
              {allEvents.filter(e => e.status === 'scheduled').length}
            </div>
            <div className="text-sm text-muted-foreground">Scheduled</div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-500">
              {allEvents.filter(e => e.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-red-500">
              {allEvents.filter(e => e.priority === 'critical').length}
            </div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}