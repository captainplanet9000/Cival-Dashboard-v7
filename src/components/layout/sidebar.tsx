'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {  BarChart3,  TrendingUp,  ShoppingCart,  Shield,  Vault,  Zap,  PieChart,  Home,  Settings,  User,  Bot,  Brain,  Target,} from "lucide-react";

const navigation = [
  {
    name: "Overview",
    href: "/dashboard/overview",
    icon: Home,
  },
  {
    name: "Strategies",
    href: "/dashboard/strategies",
    icon: TrendingUp,
  },
  {
    name: "Trading",
    href: "/dashboard/trading",
    icon: ShoppingCart,
  },
  {
    name: "AI Enhanced",
    href: "/dashboard/ai-enhanced",
    icon: Brain,
  },
  {
    name: "Risk Management",
    href: "/dashboard/risk",
    icon: Shield,
  },
  {
    name: "Vault Banking",
    href: "/dashboard/vault",
    icon: Vault,
  },
  {
    name: "Data Management",
    href: "/dashboard/data-management",
    icon: () => (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="h-4 w-4"
      >
        <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2v-3.08" />
        <path d="M14 3v5h5" />
        <rect x="8" y="12" width="8" height="2" />
        <rect x="8" y="16" width="8" height="2" />
        <path d="M22 13h-4c-.5 0-1 .2-1.4.6l-.6.6c-.4.4-.9.6-1.4.6h-2c-.5 0-1-.2-1.4-.6l-.6-.6c-.4-.4-.9-.6-1.4-.6H5" />
      </svg>
    ),
  },
  {
    name: "Phase 8: AI Goals",
    href: "/dashboard/phase8",
    icon: Target,
  },
  {
    name: "MCP Servers",
    href: "/dashboard/mcp",
    icon: Zap,
  },
  {
    name: "Agents",
    href: "/dashboard/agents",
    icon: Bot,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: PieChart,
  },
];

const secondaryNavigation = [
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    name: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
        <div className="flex items-center">
          <BarChart3 className="h-8 w-8 text-primary" />
          <span className="ml-2 text-xl font-bold text-gradient">
            Cival Dashboard
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col px-4 py-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          {/* Primary Navigation */}
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "nav-link",
                        isActive ? "nav-link-active" : "nav-link-inactive"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="ml-3">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          {/* Market Status */}
          <li className="mt-6">
            <div className="px-3 py-2">
              <div className="flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Market Status
              </div>
              <div className="mt-2 flex items-center">
                <div className="status-indicator status-online"></div>
                <span className="text-sm text-status-online">Open</span>
              </div>
            </div>
          </li>

          {/* Portfolio Summary */}
          <li className="mt-4">
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="text-sm font-medium text-foreground">
                Total Portfolio
              </div>
              <div className="mt-1 text-2xl font-bold text-trading-profit">
                $125,847.32
              </div>
              <div className="text-xs text-trading-profit">
                +2.34% (+$2,847.32)
              </div>
            </div>
          </li>

          {/* Spacer */}
          <li className="mt-auto">
            <ul role="list" className="-mx-2 space-y-1">
              {secondaryNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "nav-link",
                        isActive ? "nav-link-active" : "nav-link-inactive"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="ml-3">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );
} 