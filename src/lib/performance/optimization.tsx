/**
 * Performance Optimization Utilities
 * Includes caching, debouncing, lazy loading, and performance monitoring
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// Cache Management
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 1000;

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default TTL
    // Clean up if cache is too large
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

export const memoryCache = new MemoryCache();

// Debounce Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle Hook
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Memoized API calls with caching
export function useCachedFetch<T>(
  url: string, 
  options?: RequestInit,
  cacheKey?: string,
  ttl?: number
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = cacheKey || `fetch_${url}_${JSON.stringify(options)}`;

  const fetchData = useCallback(async () => {
    // Check cache first
    const cached = memoryCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Cache the result
      memoryCache.set(key, result, ttl);
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url, options, key, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    memoryCache.invalidate(key);
    fetchData();
  }, [fetchData, key]);

  return { data, loading, error, refetch };
}

// Virtual scrolling for large lists
export function useVirtualScroll(
  items: any[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(label: string): string {
    const id = `${label}_${Date.now()}_${Math.random()}`;
    performance.mark(`${id}_start`);
    return id;
  }

  endTiming(id: string): number {
    const endMark = `${id}_end`;
    const startMark = `${id}_start`;
    
    performance.mark(endMark);
    performance.measure(id, startMark, endMark);
    
    const measure = performance.getEntriesByName(id)[0];
    const duration = measure.duration;
    
    // Store metric
    const label = id.split('_')[0];
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const labelMetrics = this.metrics.get(label)!;
    labelMetrics.push(duration);
    
    // Keep only last 100 measurements
    if (labelMetrics.length > 100) {
      labelMetrics.shift();
    }
    
    // Clean up performance entries
    performance.clearMeasures(id);
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    
    return duration;
  }

  getAverageTime(label: string): number {
    const metrics = this.metrics.get(label);
    if (!metrics || metrics.length === 0) return 0;
    
    return metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((times, label) => {
      if (times.length > 0) {
        result[label] = {
          avg: times.reduce((sum, time) => sum + time, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          count: times.length
        };
      }
    });
    
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// React performance optimization hooks
export function usePerformanceTimer(label: string) {
  const timerRef = useRef<string | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = performanceMonitor.startTiming(label);
  }, [label]);

  const endTimer = useCallback(() => {
    if (timerRef.current) {
      const duration = performanceMonitor.endTiming(timerRef.current);
      timerRef.current = null;
      return duration;
    }
    return 0;
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      endTimer();
    };
  }, [startTimer, endTimer]);

  return { startTimer, endTimer };
}

// Lazy loading utility
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): React.LazyExoticComponent<T> {
  return React.lazy(() => {
    const start = performance.now();
    return importFunc().then(module => {
      const end = performance.now();
      console.log(`Lazy component loaded in ${(end - start).toFixed(2)}ms`);
      return module;
    });
  });
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Optimized data processing
export function useOptimizedData<T, R>(
  data: T[],
  processor: (data: T[]) => R,
  dependencies: any[] = []
): R {
  return useMemo(() => {
    const start = performance.now();
    const result = processor(data);
    const end = performance.now();
    
    if (end - start > 100) {
      console.warn(`Data processing took ${(end - start).toFixed(2)}ms for ${data.length} items`);
    }
    
    return result;
  }, [data, ...dependencies]);
}

// Connection pooling for API requests
class RequestPool {
  private activeRequests = new Map<string, Promise<any>>();

  async request(url: string, options?: RequestInit): Promise<any> {
    const key = `${url}_${JSON.stringify(options)}`;
    
    // Return existing request if in progress
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key);
    }

    // Create new request
    const request = fetch(url, options)
      .then(response => response.json())
      .finally(() => {
        this.activeRequests.delete(key);
      });

    this.activeRequests.set(key, request);
    return request;
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}

export const requestPool = new RequestPool();

// Bundle size optimization - dynamic imports
export const dynamicImports = {
  charts: () => import('@/components/charts/TradingCharts'),
  analytics: () => import('@/components/analytics/AdvancedAnalytics'),
  exports: () => import('@/components/export/ExportManager'),
  settings: () => import('@/components/settings/AdvancedSettings')
};

// Image optimization
export function useOptimizedImage(src: string, options?: { 
  width?: number; 
  height?: number; 
  quality?: number;
}) {
  return useMemo(() => {
    if (!src) return src;
    
    const params = new URLSearchParams();
    if (options?.width) params.set('w', options.width.toString());
    if (options?.height) params.set('h', options.height.toString());
    if (options?.quality) params.set('q', options.quality.toString());
    
    const queryString = params.toString();
    return queryString ? `${src}?${queryString}` : src;
  }, [src, options]);
}

// Service Worker utilities for caching
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  }
}

// Error boundary for performance isolation
export class PerformanceErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('Performance boundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Performance error details:', { error, errorInfo });
    
    // Report to monitoring service
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || (() => (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-red-600">Something went wrong. Please refresh the page.</p>
        </div>
      ));
      return <Fallback />;
    }

    return this.props.children;
  }
}