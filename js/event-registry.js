/**
 * Event Listener Registry for Secretary AI
 * Prevents memory leaks by tracking and cleaning up all event listeners
 */

/**
 * Event Listener Registry - Manages event listener lifecycle
 * Prevents memory leaks by tracking and cleaning up listeners
 */
class EventListenerRegistry {
    constructor() {
        this.listeners = new Map();
        this.listenerIdCounter = 0;
    }

    /**
     * Add an event listener and track it
     * @returns {number} Listener ID for later removal
     */
    add(element, event, handler, options = false) {
        const id = ++this.listenerIdCounter;
        
        // Store listener info
        this.listeners.set(id, {
            element,
            event,
            handler,
            options
        });
        
        // Add the actual listener
        element.addEventListener(event, handler, options);
        
        return id;
    }

    /**
     * Remove a specific listener by ID
     */
    remove(id) {
        const listener = this.listeners.get(id);
        if (listener) {
            const { element, event, handler, options } = listener;
            element.removeEventListener(event, handler, options);
            this.listeners.delete(id);
        }
    }

    /**
     * Remove all listeners for a specific element
     */
    removeAllForElement(element) {
        const toRemove = [];
        
        this.listeners.forEach((listener, id) => {
            if (listener.element === element) {
                toRemove.push(id);
            }
        });
        
        toRemove.forEach(id => this.remove(id));
    }

    /**
     * Clear all tracked listeners
     */
    clear() {
        this.listeners.forEach((listener, id) => {
            this.remove(id);
        });
    }

    /**
     * Get count of active listeners (useful for debugging)
     */
    getActiveCount() {
        return this.listeners.size;
    }
}

/**
 * Mixin for components that need event listener management
 */
class ComponentWithListeners {
    constructor() {
        this.listenerRegistry = new EventListenerRegistry();
        this.globalListenerIds = [];
    }

    /**
     * Add event listener with automatic tracking
     */
    addEventListener(element, event, handler, options = false) {
        return this.listenerRegistry.add(element, event, handler, options);
    }

    /**
     * Add global listener (window/document) with tracking
     */
    addGlobalListener(element, event, handler, options = false) {
        const id = this.listenerRegistry.add(element, event, handler, options);
        this.globalListenerIds.push(id);
        return id;
    }

    /**
     * Clean up all component listeners
     */
    destroyListeners() {
        this.listenerRegistry.clear();
        this.globalListenerIds = [];
    }

    /**
     * Clean up listeners for a specific element
     */
    cleanupElement(element) {
        this.listenerRegistry.removeAllForElement(element);
    }
}

// Memory Leak Detection utilities
class MemoryLeakDetector {
    static checkListeners() {
        // For development/debugging
        if (window.app && window.app.listenerRegistry) {
            console.log('Active listeners:', window.app.listenerRegistry.getActiveCount());
            
            // Check for detached DOM elements
            let detachedCount = 0;
            window.app.listenerRegistry.listeners.forEach((listener) => {
                if (!document.body.contains(listener.element)) {
                    detachedCount++;
                    console.warn('Listener on detached element:', listener);
                }
            });
            
            if (detachedCount > 0) {
                console.error(`Found ${detachedCount} listeners on detached elements!`);
            }
        }
    }
    
    static runTests() {
        // Test scenario 1: Toggle views multiple times
        console.log('Testing view toggles...');
        const initialCount = window.app.listenerRegistry.getActiveCount();
        
        // Toggle task view 10 times
        for (let i = 0; i < 10; i++) {
            window.app.toggleViewMode();
            window.app.toggleViewMode();
        }
        
        const afterToggleCount = window.app.listenerRegistry.getActiveCount();
        
        if (afterToggleCount > initialCount) {
            console.error(`Leak detected! Listeners increased from ${initialCount} to ${afterToggleCount}`);
        } else {
            console.log('✓ No leaks detected in view toggle');
        }
        
        // Test scenario 2: Create and destroy components
        console.log('Testing component lifecycle...');
        const beforeComponentCount = window.app.listenerRegistry.getActiveCount();
        
        // Create and destroy calendar view multiple times
        for (let i = 0; i < 5; i++) {
            const calendar = new window.CalendarView();
            document.body.appendChild(calendar.render());
            calendar.destroy();
        }
        
        const afterComponentCount = window.app.listenerRegistry.getActiveCount();
        
        if (afterComponentCount > beforeComponentCount) {
            console.error(`Component leak! Listeners increased from ${beforeComponentCount} to ${afterComponentCount}`);
        } else {
            console.log('✓ No leaks in component lifecycle');
        }
    }
}

// Add debug utilities to window for manual testing
window.debugListeners = {
    count: () => window.app?.listenerRegistry?.getActiveCount() || 0,
    
    checkLeaks: () => MemoryLeakDetector.checkListeners(),
    
    runTests: () => MemoryLeakDetector.runTests(),
    
    profile: () => {
        console.time('Listener Performance');
        const before = performance.now();
        
        // Simulate heavy usage
        for (let i = 0; i < 100; i++) {
            window.app.toggleViewMode();
        }
        
        const after = performance.now();
        console.timeEnd('Listener Performance');
        console.log(`Time per toggle: ${(after - before) / 100}ms`);
    }
};

// Export for use in other modules
export { EventListenerRegistry, ComponentWithListeners, MemoryLeakDetector };