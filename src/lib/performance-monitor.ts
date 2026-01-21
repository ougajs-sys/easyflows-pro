/**
 * Performance Monitor
 * Tracks and reports application performance metrics
 */

interface PerformanceEntry {
  name: string;
  duration: number;
  timestamp: number;
  type: 'navigation' | 'render' | 'query' | 'interaction';
}

class PerformanceMonitor {
  private entries: PerformanceEntry[] = [];
  private readonly maxEntries = 100;
  private readonly reportThreshold = 100; // ms

  /**
   * Mark the start of a performance measurement
   */
  mark(name: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-start`);
    }
  }

  /**
   * Measure and record the duration of an operation
   */
  measure(
    name: string,
    type: PerformanceEntry['type'] = 'interaction'
  ): number | null {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    try {
      const startMark = `${name}-start`;
      const endMark = `${name}-end`;

      window.performance.mark(endMark);
      window.performance.measure(name, startMark, endMark);

      const measure = window.performance.getEntriesByName(name)[0];
      const duration = measure?.duration || 0;

      this.recordEntry({
        name,
        duration,
        timestamp: Date.now(),
        type,
      });

      // Clean up marks
      window.performance.clearMarks(startMark);
      window.performance.clearMarks(endMark);
      window.performance.clearMeasures(name);

      return duration;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
      return null;
    }
  }

  /**
   * Record a performance entry
   */
  private recordEntry(entry: PerformanceEntry): void {
    this.entries.push(entry);

    // Keep only the last maxEntries
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Log slow operations
    if (entry.duration > this.reportThreshold) {
      console.warn(
        `[Performance] Slow ${entry.type}:`,
        entry.name,
        `${entry.duration.toFixed(2)}ms`
      );
    }
  }

  /**
   * Get performance entries
   */
  getEntries(type?: PerformanceEntry['type']): PerformanceEntry[] {
    if (type) {
      return this.entries.filter(entry => entry.type === type);
    }
    return [...this.entries];
  }

  /**
   * Get average duration for a specific metric
   */
  getAverageDuration(name: string): number {
    const relevantEntries = this.entries.filter(entry => entry.name === name);
    if (relevantEntries.length === 0) return 0;

    const total = relevantEntries.reduce((sum, entry) => sum + entry.duration, 0);
    return total / relevantEntries.length;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get performance report
   */
  getReport(): {
    totalEntries: number;
    byType: Record<string, number>;
    slowOperations: PerformanceEntry[];
    averages: Record<string, number>;
  } {
    const byType = this.entries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const slowOperations = this.entries.filter(
      entry => entry.duration > this.reportThreshold
    );

    const uniqueNames = [...new Set(this.entries.map(entry => entry.name))];
    const averages = uniqueNames.reduce((acc, name) => {
      acc[name] = this.getAverageDuration(name);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEntries: this.entries.length,
      byType,
      slowOperations,
      averages,
    };
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    const report = this.getReport();
    console.group('📊 Performance Report');
    console.log('Total Entries:', report.totalEntries);
    console.log('By Type:', report.byType);
    console.log('Slow Operations:', report.slowOperations.length);
    if (report.slowOperations.length > 0) {
      console.table(report.slowOperations);
    }
    console.log('Average Durations:', report.averages);
    console.groupEnd();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export hook for React components
export function usePerformanceMonitor() {
  return performanceMonitor;
}

// Export utility for tracking component renders
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  name: string
): React.ComponentType<P> {
  return function TrackedComponent(props: P) {
    performanceMonitor.mark(name);
    
    React.useEffect(() => {
      performanceMonitor.measure(name, 'render');
    });

    return React.createElement(Component, props);
  };
}

// Make React available for the withPerformanceTracking function
import React from 'react';
