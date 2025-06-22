'use client';

import { Bell, Search, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-6 shadow-sm">
      {/* Search */}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-muted-foreground pl-3" />
          <input
            type="text"
            placeholder="Search strategies, trades, or symbols..."
            className="block h-full w-full border-0 py-0 pl-11 pr-0 text-foreground placeholder:text-muted-foreground bg-background focus:ring-2 focus:ring-ring focus:ring-inset sm:text-sm rounded-md border border-input"
          />
        </div>
      </div>

      {/* System Status Indicators */}
      <div className="flex items-center gap-x-4">
        {/* MCP Server Status */}
        <div className="hidden lg:flex lg:items-center lg:gap-x-2">
          <div className="status-indicator status-online"></div>
          <span className="text-sm text-muted-foreground">MCP Online</span>
        </div>

        {/* Trading Status */}
        <div className="hidden lg:flex lg:items-center lg:gap-x-2">
          <div className="status-indicator status-online"></div>
          <span className="text-sm text-muted-foreground">Trading Active</span>
        </div>

        {/* Current Time */}
        <div className="hidden lg:block">
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </span>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
            3
          </span>
        </Button>

        {/* User Menu */}
        <div className="relative">
          <Button variant="ghost" className="flex items-center gap-x-2">
            <User className="h-5 w-5" />
            <span className="hidden lg:block text-sm font-medium">
              Trading Admin
            </span>
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-x-2">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
} 