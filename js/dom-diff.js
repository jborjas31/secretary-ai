/**
 * DOM Diff Utility for Efficient Updates
 * Provides virtual DOM-like functionality to minimize DOM manipulation
 */

class DOMDiff {
    constructor() {
        // Cache of elements by key
        this.elementCache = new Map();
        
        // Performance tracking
        this.stats = {
            operations: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    /**
     * Update a container with new items efficiently
     * @param {HTMLElement} container - The container element
     * @param {Array} newItems - Array of items to render
     * @param {Function} renderFn - Function that creates DOM element for an item
     * @param {Function} keyFn - Function that returns unique key for an item
     */
    updateContainer(container, newItems, renderFn, keyFn) {
        const startTime = performance.now();
        
        // Create a map of existing elements
        const existingElements = new Map();
        const existingKeys = new Set();
        
        // Track existing elements by key
        Array.from(container.children).forEach(child => {
            const key = child.dataset.key;
            if (key) {
                existingElements.set(key, child);
                existingKeys.add(key);
            }
        });
        
        // Create document fragment for batch operations
        const fragment = document.createDocumentFragment();
        const newKeys = new Set();
        
        // Process new items
        newItems.forEach((item, index) => {
            const key = keyFn(item);
            newKeys.add(key);
            
            let element;
            
            // Check if element exists in cache
            if (existingElements.has(key)) {
                // Reuse existing element
                element = existingElements.get(key);
                this.stats.cacheHits++;
                
                // Update element if needed
                this.updateElement(element, item, renderFn);
            } else {
                // Create new element
                element = renderFn(item);
                element.dataset.key = key;
                this.elementCache.set(key, element);
                this.stats.cacheMisses++;
                this.stats.operations++;
            }
            
            // Add to fragment
            fragment.appendChild(element);
        });
        
        // Remove elements that are no longer needed
        existingKeys.forEach(key => {
            if (!newKeys.has(key)) {
                const element = existingElements.get(key);
                if (element && element.parentNode) {
                    element.remove();
                    this.elementCache.delete(key);
                    this.stats.operations++;
                }
            }
        });
        
        // Apply all changes at once
        if (fragment.childNodes.length > 0) {
            container.innerHTML = '';
            container.appendChild(fragment);
            this.stats.operations++;
        }
        
        const endTime = performance.now();
        console.log(`DOM Diff: Updated in ${(endTime - startTime).toFixed(2)}ms`, this.stats);
    }

    /**
     * Update a single element with new data
     * @param {HTMLElement} element - The element to update
     * @param {Object} newData - New data for the element
     * @param {Function} renderFn - Function that creates DOM element
     */
    updateElement(element, newData, renderFn) {
        // For now, we'll do a simple content update
        // This can be enhanced to do more granular updates
        const newElement = renderFn(newData);
        
        // Copy attributes
        Array.from(newElement.attributes).forEach(attr => {
            if (element.getAttribute(attr.name) !== attr.value) {
                element.setAttribute(attr.name, attr.value);
            }
        });
        
        // Update content if different
        if (element.innerHTML !== newElement.innerHTML) {
            element.innerHTML = newElement.innerHTML;
            this.stats.operations++;
        }
    }

    /**
     * Create or update a single element
     * @param {string} key - Unique key for the element
     * @param {Object} data - Data for the element
     * @param {Function} renderFn - Function that creates DOM element
     * @returns {HTMLElement}
     */
    createElement(key, data, renderFn) {
        let element = this.elementCache.get(key);
        
        if (element) {
            this.updateElement(element, data, renderFn);
            this.stats.cacheHits++;
        } else {
            element = renderFn(data);
            element.dataset.key = key;
            this.elementCache.set(key, element);
            this.stats.cacheMisses++;
        }
        
        return element;
    }

    /**
     * Clear cache for a specific container
     * @param {string} containerKey - Key prefix for cached elements
     */
    clearCache(containerKey) {
        const keysToDelete = [];
        this.elementCache.forEach((element, key) => {
            if (key.startsWith(containerKey)) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => this.elementCache.delete(key));
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset performance statistics
     */
    resetStats() {
        this.stats = {
            operations: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }
}

// Create singleton instance
const domDiff = new DOMDiff();

// Make available globally
window.domDiff = domDiff;
window.DOMDiff = DOMDiff;