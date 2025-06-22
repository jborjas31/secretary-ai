/**
 * Performance Monitor - Simple performance tracking for Secretary AI
 * Tracks operation times and provides performance insights
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.enabled = true;
        this.maxHistorySize = 100; // Keep last 100 measurements per operation
    }

    /**
     * Start measuring an operation
     * @param {string} operationName - Name of the operation to measure
     * @returns {function} End function to call when operation completes
     */
    startMeasure(operationName) {
        if (!this.enabled) {
            return () => {}; // No-op if disabled
        }

        const startTime = performance.now();
        
        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.recordMetric(operationName, duration);
            
            // Log slow operations
            if (duration > 1000) {
                console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
            }
            
            return duration;
        };
    }

    /**
     * Measure an async operation
     * @param {string} operationName - Name of the operation
     * @param {function} asyncFn - Async function to measure
     * @returns {Promise} Result of the async function
     */
    async measureAsync(operationName, asyncFn) {
        const endMeasure = this.startMeasure(operationName);
        
        try {
            const result = await asyncFn();
            endMeasure();
            return result;
        } catch (error) {
            endMeasure();
            throw error;
        }
    }

    /**
     * Measure a sync operation
     * @param {string} operationName - Name of the operation
     * @param {function} fn - Function to measure
     * @returns {any} Result of the function
     */
    measure(operationName, fn) {
        const endMeasure = this.startMeasure(operationName);
        
        try {
            const result = fn();
            endMeasure();
            return result;
        } catch (error) {
            endMeasure();
            throw error;
        }
    }

    /**
     * Record a metric
     */
    recordMetric(operationName, duration) {
        if (!this.metrics.has(operationName)) {
            this.metrics.set(operationName, {
                count: 0,
                total: 0,
                min: Infinity,
                max: -Infinity,
                history: []
            });
        }

        const metric = this.metrics.get(operationName);
        
        // Update statistics
        metric.count++;
        metric.total += duration;
        metric.min = Math.min(metric.min, duration);
        metric.max = Math.max(metric.max, duration);
        
        // Add to history with timestamp
        metric.history.push({
            duration,
            timestamp: new Date().toISOString()
        });
        
        // Maintain history size limit
        if (metric.history.length > this.maxHistorySize) {
            metric.history.shift();
        }
    }

    /**
     * Get statistics for an operation
     */
    getStats(operationName) {
        const metric = this.metrics.get(operationName);
        if (!metric) return null;

        const average = metric.total / metric.count;
        
        // Calculate percentiles from recent history
        const recentDurations = metric.history
            .slice(-50) // Last 50 measurements
            .map(h => h.duration)
            .sort((a, b) => a - b);
        
        const p50Index = Math.floor(recentDurations.length * 0.5);
        const p95Index = Math.floor(recentDurations.length * 0.95);

        return {
            count: metric.count,
            average: average.toFixed(2),
            min: metric.min.toFixed(2),
            max: metric.max.toFixed(2),
            p50: recentDurations[p50Index]?.toFixed(2) || 'N/A',
            p95: recentDurations[p95Index]?.toFixed(2) || 'N/A',
            recent: metric.history.slice(-5).map(h => ({
                duration: h.duration.toFixed(2),
                time: new Date(h.timestamp).toLocaleTimeString()
            }))
        };
    }

    /**
     * Get all performance statistics
     */
    getAllStats() {
        const stats = {};
        
        for (const [operation, _] of this.metrics) {
            stats[operation] = this.getStats(operation);
        }
        
        return stats;
    }

    /**
     * Get performance summary
     */
    getSummary() {
        const allStats = this.getAllStats();
        const summary = {
            totalOperations: 0,
            slowOperations: [],
            timestamp: new Date().toISOString()
        };

        for (const [operation, stats] of Object.entries(allStats)) {
            summary.totalOperations += stats.count;
            
            // Flag operations with high average or p95
            if (parseFloat(stats.average) > 500 || parseFloat(stats.p95) > 1000) {
                summary.slowOperations.push({
                    operation,
                    average: stats.average,
                    p95: stats.p95
                });
            }
        }

        return summary;
    }

    /**
     * Clear all metrics
     */
    clear() {
        this.metrics.clear();
    }

    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Log performance report to console
     */
    logReport() {
        console.group('Performance Report');
        
        const allStats = this.getAllStats();
        for (const [operation, stats] of Object.entries(allStats)) {
            console.group(operation);
            console.table({
                'Count': stats.count,
                'Average (ms)': stats.average,
                'Min (ms)': stats.min,
                'Max (ms)': stats.max,
                'P50 (ms)': stats.p50,
                'P95 (ms)': stats.p95
            });
            console.groupEnd();
        }
        
        const summary = this.getSummary();
        if (summary.slowOperations.length > 0) {
            console.warn('Slow operations detected:', summary.slowOperations);
        }
        
        console.groupEnd();
    }
    
    /**
     * Add event listener metrics to performance tracking
     */
    addListenerMetrics() {
        if (window.app && window.app.listenerRegistry) {
            // Record active listener count
            const activeListeners = window.app.listenerRegistry.getActiveCount();
            this.recordMetric('active-listeners', activeListeners);
            
            // Track potential leaks
            let detachedCount = 0;
            window.app.listenerRegistry.listeners.forEach((listener) => {
                if (!document.body.contains(listener.element)) {
                    detachedCount++;
                }
            });
            
            if (detachedCount > 0) {
                this.recordMetric('detached-listeners', detachedCount);
                console.warn(`Performance Monitor: ${detachedCount} listeners on detached elements detected`);
            }
            
            return {
                activeListeners,
                detachedListeners: detachedCount
            };
        }
        
        return {
            activeListeners: 0,
            detachedListeners: 0
        };
    }
}

// Create global instance
window.performanceMonitor = new PerformanceMonitor();

// Export for use in other modules
window.PerformanceMonitor = PerformanceMonitor;