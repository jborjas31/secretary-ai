/**
 * Filter Cache for optimized filtering
 * Caches filter results to avoid redundant calculations
 */
export class FilterCache {
    constructor() {
        this.lastFilters = null;
        this.lastSearchQuery = null;
        this.lastResult = null;
        this.isDirty = true;
    }
    
    /**
     * Check if filters have changed
     */
    hasFiltersChanged(filters, searchQuery) {
        if (this.isDirty) return true;
        
        return this.lastSearchQuery !== searchQuery ||
               JSON.stringify(this.lastFilters) !== JSON.stringify(filters);
    }
    
    /**
     * Update cache
     */
    updateCache(filters, searchQuery, result) {
        this.lastFilters = { ...filters };
        this.lastSearchQuery = searchQuery;
        this.lastResult = result;
        this.isDirty = false;
    }
    
    /**
     * Invalidate cache
     */
    invalidate() {
        this.isDirty = true;
    }
}

// Export for backward compatibility
window.FilterCache = FilterCache;