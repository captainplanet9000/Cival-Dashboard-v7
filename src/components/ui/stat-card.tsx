import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"

const statCardVariants = cva(
  "transition-all duration-200",
  {
    variants: {
      variant: {
        default: "hover:shadow-md",
        profit: "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50",
        loss: "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50",
        neutral: "border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/50",
        warning: "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/50",
        info: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50",
      },
      size: {
        default: "",
        sm: "text-sm",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  title: string
  value: string | number
  description?: string
  change?: {
    value: number
    period: string
  }
  badge?: {
    text: string
    variant?: "default" | "profit" | "loss" | "warning" | "info"
  }
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ 
    className, 
    variant, 
    size, 
    title, 
    value, 
    description, 
    change, 
    badge, 
    icon, 
    trend,
    ...props 
  }, ref) => {
    const getChangeColor = (changeValue: number) => {
      if (changeValue > 0) return "text-green-600 dark:text-green-400"
      if (changeValue < 0) return "text-red-600 dark:text-red-400"
      return "text-gray-600 dark:text-gray-400"
    }

    const getTrendIcon = (trendDirection?: string) => {
      if (trendDirection === "up") return "↗"
      if (trendDirection === "down") return "↘"
      return "→"
    }

    return (
      <Card
        ref={ref}
        className={cn(statCardVariants({ variant, size }), className)}
        {...props}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {title}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {badge && (
              <Badge variant={
                badge.variant === "profit" ? "default" :
                badge.variant === "loss" ? "destructive" :
                badge.variant === "warning" ? "secondary" :
                badge.variant === "info" ? "secondary" :
                "default"
              }>
                {badge.text}
              </Badge>
            )}
            {icon && (
              <div className="text-muted-foreground">
                {icon}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{value}</div>
              {description && (
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              )}
            </div>
            {change && (
              <div className={cn(
                "flex items-center text-xs",
                getChangeColor(change.value)
              )}>
                <span className="mr-1">
                  {getTrendIcon(trend)}
                </span>
                <span>
                  {change.value > 0 ? "+" : ""}{change.value}%
                </span>
                <span className="ml-1 text-muted-foreground">
                  {change.period}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard, statCardVariants } 