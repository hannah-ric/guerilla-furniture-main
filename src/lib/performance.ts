/**
 * Performance optimization utilities
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounce hook for optimizing frequent function calls
 */
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

/**
 * Throttle hook for limiting function execution rate
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        lastRun.current = Date.now();
        return callback(...args);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Memoize expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as T;
}

/**
 * Batch updates to reduce re-renders
 */
export class BatchUpdater<T> {
  private updates: Partial<T>[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private callback: (updates: Partial<T>) => void;
  private delay: number;

  constructor(callback: (updates: Partial<T>) => void, delay = 16) {
    this.callback = callback;
    this.delay = delay;
  }

  add(update: Partial<T>): void {
    this.updates.push(update);
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush(): void {
    if (this.updates.length === 0) return;

    const merged = this.updates.reduce((acc, update) => ({
      ...acc,
      ...update,
    }), {} as Partial<T>);

    this.callback(merged);
    this.updates = [];
    this.timeoutId = null;
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.updates = [];
  }
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Performance monitor for development
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>();

  static mark(name: string): void {
    if (import.meta.env.DEV) {
      this.marks.set(name, performance.now());
    }
  }

  static measure(name: string, startMark: string): number {
    if (!import.meta.env.DEV) return 0;
    
    const start = this.marks.get(startMark);
    if (!start) return 0;

    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!import.meta.env.DEV) return fn();
    
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.log(`[Performance] ${name} (failed): ${duration.toFixed(2)}ms`);
      throw error;
    }
  }
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback =
  window.requestIdleCallback ||
  function (cb: IdleRequestCallback) {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };

/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback =
  window.cancelIdleCallback ||
  function (id: number) {
    clearTimeout(id);
  }; 