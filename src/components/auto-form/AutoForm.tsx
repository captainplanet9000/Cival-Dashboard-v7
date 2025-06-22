'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { backendApi } from '@/lib/api/backend-client'
import { cn } from '@/lib/utils'
import { 
  FormInput,
  Wand2,
  CheckCircle,
  AlertCircle,
  Info,
  Plus,
  Minus,
  Settings,
  Code,
  Database
} from 'lucide-react'

export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'textarea' 
  | 'select' 
  | 'checkbox' 
  | 'switch' 
  | 'date' 
  | 'time'
  | 'datetime-local'
  | 'file'
  | 'array'
  | 'object'

export interface FieldConfig {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  description?: string
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    custom?: (value: any) => string | true
  }
  options?: Array<{ value: string; label: string }> // for select fields
  fields?: FieldConfig[] // for object/array fields
  conditional?: {
    field: string
    value: any
    operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  }
  grid?: {
    cols?: number
    span?: number
  }
}

export interface AutoFormSchema {
  title: string
  description?: string
  fields: FieldConfig[]
  submitLabel?: string
  resetLabel?: string
  layout?: 'vertical' | 'horizontal' | 'grid'
  columns?: number
}

export interface AutoFormProps {
  schema: AutoFormSchema | string // JSON string or object
  onSubmit?: (data: any) => void | Promise<void>
  onSchemaChange?: (schema: AutoFormSchema) => void
  initialData?: any
  loading?: boolean
  disabled?: boolean
  showPreview?: boolean
  showSchemaEditor?: boolean
  className?: string
}

export function AutoForm({
  schema: schemaInput,
  onSubmit,
  onSchemaChange,
  initialData,
  loading = false,
  disabled = false,
  showPreview = false,
  showSchemaEditor = false,
  className
}: AutoFormProps) {
  const { publishEvent } = useAGUIProtocol()
  const [schema, setSchema] = useState<AutoFormSchema | null>(null)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Parse schema from input
  useEffect(() => {
    try {
      let parsedSchema: AutoFormSchema
      
      if (typeof schemaInput === 'string') {
        parsedSchema = JSON.parse(schemaInput)
      } else {
        parsedSchema = schemaInput
      }
      
      setSchema(parsedSchema)
      setSchemaError(null)
    } catch (error) {
      setSchemaError(error instanceof Error ? error.message : 'Invalid schema')
      setSchema(null)
    }
  }, [schemaInput])

  // Generate dynamic Zod schema
  const zodSchema = useMemo(() => {
    if (!schema) return z.object({})
    
    const buildFieldSchema = (field: FieldConfig): z.ZodTypeAny => {
      let fieldSchema: z.ZodTypeAny
      
      switch (field.type) {
        case 'text':
        case 'email':
        case 'password':
        case 'textarea':
          let stringSchema = z.string()
          if (field.validation?.minLength) {
            stringSchema = stringSchema.min(field.validation.minLength)
          }
          if (field.validation?.maxLength) {
            stringSchema = stringSchema.max(field.validation.maxLength)
          }
          if (field.validation?.pattern) {
            stringSchema = stringSchema.regex(new RegExp(field.validation.pattern))
          }
          if (field.type === 'email') {
            stringSchema = stringSchema.email()
          }
          fieldSchema = stringSchema
          break
          
        case 'number':
          let numberSchema = z.number()
          if (field.validation?.min !== undefined) {
            numberSchema = numberSchema.min(field.validation.min)
          }
          if (field.validation?.max !== undefined) {
            numberSchema = numberSchema.max(field.validation.max)
          }
          fieldSchema = numberSchema
          break
          
        case 'checkbox':
        case 'switch':
          fieldSchema = z.boolean()
          break
          
        case 'select':
          if (field.options && field.options.length > 0) {
            const values = field.options.map(opt => opt.value) as [string, ...string[]]
            fieldSchema = z.enum(values)
          } else {
            fieldSchema = z.string()
          }
          break
          
        case 'date':
        case 'time':
        case 'datetime-local':
          fieldSchema = z.string()
          break
          
        case 'array':
          if (field.fields && field.fields.length > 0) {
            const itemSchema = buildFieldSchema(field.fields[0])
            fieldSchema = z.array(itemSchema)
          } else {
            fieldSchema = z.array(z.string())
          }
          break
          
        case 'object':
          if (field.fields) {
            const objectFields: Record<string, z.ZodTypeAny> = {}
            field.fields.forEach(subField => {
              objectFields[subField.key] = buildFieldSchema(subField)
            })
            fieldSchema = z.object(objectFields)
          } else {
            fieldSchema = z.record(z.any())
          }
          break
          
        default:
          fieldSchema = z.string()
      }
      
      // Handle custom validation
      if (field.validation?.custom) {
        fieldSchema = fieldSchema.refine(field.validation.custom)
      }
      
      // Handle required vs optional
      if (!field.required) {
        fieldSchema = fieldSchema.optional()
      }
      
      return fieldSchema
    }
    
    const schemaFields: Record<string, z.ZodTypeAny> = {}
    
    schema.fields.forEach(field => {
      schemaFields[field.key] = buildFieldSchema(field)
    })
    
    return z.object(schemaFields)
  }, [schema])

  // Form setup
  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialData || {}
  })

  // Handle form submission
  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)
      
      publishEvent('form.auto_form_submit_started', {
        schemaTitle: schema?.title,
        fieldCount: schema?.fields?.length || 0,
        data
      })
      
      await onSubmit?.(data)
      
      publishEvent('form.auto_form_submit_completed', {
        schemaTitle: schema?.title,
        success: true
      })
      
    } catch (error) {
      publishEvent('form.auto_form_submit_failed', {
        schemaTitle: schema?.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if field should be shown based on conditional logic
  const shouldShowField = (field: FieldConfig): boolean => {
    if (!field.conditional) return true
    
    const watchedValue = form.watch(field.conditional.field)
    const targetValue = field.conditional.value
    const operator = field.conditional.operator || 'equals'
    
    switch (operator) {
      case 'equals':
        return watchedValue === targetValue
      case 'not_equals':
        return watchedValue !== targetValue
      case 'contains':
        return Array.isArray(watchedValue) ? watchedValue.includes(targetValue) : false
      case 'greater_than':
        return typeof watchedValue === 'number' && watchedValue > targetValue
      case 'less_than':
        return typeof watchedValue === 'number' && watchedValue < targetValue
      default:
        return true
    }
  }

  // Render field based on type
  const renderField = (field: FieldConfig) => {
    if (!shouldShowField(field)) return null
    
    const fieldProps = {
      name: field.key,
      control: form.control,
      render: ({ field: formField }: any) => {
        switch (field.type) {
          case 'text':
          case 'email':
          case 'password':
          case 'number':
          case 'date':
          case 'time':
          case 'datetime-local':
            return (
              <Input
                {...formField}
                type={field.type}
                placeholder={field.placeholder}
                disabled={disabled || loading}
                value={formField.value || ''}
                onChange={(e) => {
                  const value = field.type === 'number' ? 
                    parseFloat(e.target.value) || 0 : 
                    e.target.value
                  formField.onChange(value)
                }}
              />
            )
            
          case 'textarea':
            return (
              <Textarea
                {...formField}
                placeholder={field.placeholder}
                disabled={disabled || loading}
                value={formField.value || ''}
              />
            )
            
          case 'select':
            return (
              <Select value={formField.value} onValueChange={formField.onChange}>
                <SelectTrigger disabled={disabled || loading}>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
            
          case 'checkbox':
            return (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.key}
                  checked={formField.value || false}
                  onCheckedChange={formField.onChange}
                  disabled={disabled || loading}
                />
                <label htmlFor={field.key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {field.label}
                </label>
              </div>
            )
            
          case 'switch':
            return (
              <div className="flex items-center space-x-2">
                <Switch
                  id={field.key}
                  checked={formField.value || false}
                  onCheckedChange={formField.onChange}
                  disabled={disabled || loading}
                />
                <label htmlFor={field.key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {field.label}
                </label>
              </div>
            )
            
          default:
            return (
              <Input
                {...formField}
                placeholder={field.placeholder}
                disabled={disabled || loading}
                value={formField.value || ''}
              />
            )
        }
      }
    }
    
    return (
      <FormField
        key={field.key}
        {...fieldProps}
      />
    )
  }

  if (schemaError) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>Schema Error: {schemaError}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!schema) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FormInput className="h-5 w-5" />
              {schema.title}
            </CardTitle>
            {schema.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {schema.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {schema.fields.length} fields
            </Badge>
            {showSchemaEditor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Dynamic Field Rendering */}
            <div className={cn(
              "space-y-4",
              schema.layout === 'grid' && `grid grid-cols-${schema.columns || 2} gap-4`,
              schema.layout === 'horizontal' && "grid grid-cols-2 gap-4"
            )}>
              {schema.fields.map(field => {
                if (field.type === 'checkbox' || field.type === 'switch') {
                  return (
                    <FormItem key={field.key} className={cn(
                      field.grid?.span && `col-span-${field.grid.span}`
                    )}>
                      <FormControl>
                        {renderField(field)}
                      </FormControl>
                      {field.description && (
                        <FormDescription>{field.description}</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }
                
                return (
                  <FormItem key={field.key} className={cn(
                    field.grid?.span && `col-span-${field.grid.span}`
                  )}>
                    <FormLabel className={field.required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
                      {field.label}
                    </FormLabel>
                    <FormControl>
                      {renderField(field)}
                    </FormControl>
                    {field.description && (
                      <FormDescription>{field.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )
              })}
            </div>
            
            {/* Form Actions */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button
                type="submit"
                disabled={disabled || loading || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  schema.submitLabel || 'Submit'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={disabled || loading || isSubmitting}
              >
                {schema.resetLabel || 'Reset'}
              </Button>
            </div>
          </form>
        </Form>
        
        {/* Form Preview */}
        {showPreview && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Code className="h-4 w-4" />
              Form Data Preview
            </h4>
            <pre className="text-xs bg-background p-2 rounded border overflow-auto max-h-32">
              {JSON.stringify(form.watch(), null, 2)}
            </pre>
          </div>
        )}
        
        {/* Schema Editor */}
        {showAdvanced && showSchemaEditor && (
          <div className="mt-6 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Schema Configuration
            </h4>
            <Textarea
              value={JSON.stringify(schema, null, 2)}
              onChange={(e) => {
                try {
                  const newSchema = JSON.parse(e.target.value)
                  setSchema(newSchema)
                  onSchemaChange?.(newSchema)
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="font-mono text-xs"
              rows={10}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}