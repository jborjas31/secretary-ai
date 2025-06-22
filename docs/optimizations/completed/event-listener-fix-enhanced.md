# Event Listener Memory Leak Fix - Issue #4 (Enhanced)

## Problem Summary

Event listeners are being added throughout the application without proper cleanup, causing memory leaks when components are recreated or views are toggled. This is particularly problematic in single-page applications where components are frequently created and destroyed.

## Current State Analysis

### Affected Files and Listener Counts
- **app.js**: 23 addEventListener calls, 0 removeEventListener calls
- **calendar-view.js**: 3+ addEventListener calls, no cleanup
- **insights-modal.js**: Multiple addEventListener calls, no cleanup
- **ui-components.js**: Has proper cleanup pattern (only file with removeEventListener)

### Specific Memory Leak Scenarios

1. **Collapsible Section Headers** (app.js:1682-1685)
   ```javascript
   header.addEventListener('click', () => {
       content.classList.toggle('expanded');
       toggle.classList.toggle('expanded');
   });
   ```
   - Created every time task view updates
   - Old listeners remain attached to detached DOM elements

2. **Dynamic Button Creation** (app.js:1500, 534, 1340)
   ```javascript
   button.addEventListener('click', () => this.loadMoreTasks());
   deduplicateBtn.addEventListener('click', async () => { ... });
   insightsBtn.addEventListener('click', () => { ... });
   ```
   - Buttons recreated without cleaning up old listeners

3. **Global Event Listeners** (app.js:551-572)
   ```javascript
   window.addEventListener('online', () => { ... });
   window.addEventListener('offline', () => { ... });
   document.addEventListener('keydown', (e) => { ... });
   ```
   - Never removed, accumulate if app reinitializes

## Proposed Solution

### 1. Event Listener Registry Pattern

Create a centralized registry to track all event listeners:

```javascript
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
```

### 2. Component Listener Manager

Extend the pattern for component-level management:

```javascript
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
```

### 3. Implementation Examples

#### Fix for SecretaryApp (app.js)

```javascript
class SecretaryApp extends ComponentWithListeners {
    constructor() {
        super(); // Initialize listener management
        // ... existing constructor code ...
    }

    initialize() {
        // ... existing initialization ...
        
        // Replace direct addEventListener calls
        // OLD:
        // this.elements.refreshBtn.addEventListener('click', this.refreshSchedule);
        
        // NEW:
        this.addEventListener(
            this.elements.refreshBtn, 
            'click', 
            this.refreshSchedule.bind(this)
        );
        
        // For global listeners
        this.addGlobalListener(window, 'online', () => {
            this.showToast('Back online! Syncing...', 'success');
            if (window.storageService) {
                window.storageService.syncToCloud();
            }
        });
    }

    createTaskSection(sectionKey, tasks) {
        // ... existing section creation code ...
        
        // Track the collapsible header listener
        const clickHandler = () => {
            content.classList.toggle('expanded');
            toggle.classList.toggle('expanded');
        };
        
        // Store listener ID on the element for later cleanup
        header._listenerId = this.addEventListener(header, 'click', clickHandler);
        
        return sectionElement;
    }

    // Add cleanup method
    destroy() {
        this.destroyListeners();
        
        // Clean up any other resources
        if (this.calendarView) {
            this.calendarView.destroy();
        }
        if (this.insightsModal) {
            this.insightsModal.destroy();
        }
    }

    // Clean up before recreating sections
    updateTaskManagementDisplay() {
        // Clean up existing section listeners
        const existingSections = this.elements.taskSectionsContainer
            .querySelectorAll('.section-header');
        
        existingSections.forEach(header => {
            if (header._listenerId) {
                this.listenerRegistry.remove(header._listenerId);
            }
        });
        
        // ... continue with existing update logic ...
    }
}
```

#### Best Practice: Arrow Functions for Event Handlers

To avoid manual binding with `.bind(this)`, define event handler methods as arrow functions. This automatically binds `this` to the class instance:

```javascript
class SecretaryApp extends ComponentWithListeners {
    // Define handlers as arrow functions
    refreshSchedule = () => {
        // 'this' is automatically bound to the SecretaryApp instance
        console.log('Refreshing schedule...');
        this.loadSchedule();
    }
    
    toggleViewMode = () => {
        // No .bind(this) needed
        this.currentView = this.currentView === 'schedule' ? 'tasks' : 'schedule';
        this.updateDisplay();
    }
    
    initialize() {
        // Clean syntax without .bind()
        this.addEventListener(this.elements.refreshBtn, 'click', this.refreshSchedule);
        this.addEventListener(this.elements.viewToggleBtn, 'click', this.toggleViewMode);
    }
}
```

#### Fix for UIComponent Base Class

The UIComponent base class should be refactored to use the EventListenerRegistry, ensuring all subclasses benefit from automatic cleanup:

```javascript
// In js/ui-components.js
class UIComponent {
    constructor() {
        this.element = null;
        this.listenerRegistry = new EventListenerRegistry();
    }

    /**
     * Register event listener with automatic tracking
     * Subclasses should use this instead of direct addEventListener
     */
    registerEvent(selector, event, handler, options = false) {
        // Handle both element and selector
        const element = typeof selector === 'string' 
            ? this.element.querySelector(selector) 
            : selector;
            
        if (element) {
            return this.listenerRegistry.add(element, event, handler, options);
        }
        
        console.warn(`Element not found for selector: ${selector}`);
        return null;
    }

    /**
     * Register delegated event on the component root
     */
    registerDelegatedEvent(event, selector, handler) {
        const delegatedHandler = (e) => {
            if (e.target.matches(selector)) {
                handler.call(this, e);
            }
        };
        
        return this.listenerRegistry.add(this.element, event, delegatedHandler, true);
    }

    /**
     * Clean up all component resources
     */
    destroy() {
        // Clear all tracked listeners
        this.listenerRegistry.clear();
        
        // Remove element from DOM
        if (this.element) {
            this.element.remove();
        }
    }
}
```

#### Fix for UIComponent Subclasses

Update CalendarView and other components to use the parent's event system:

```javascript
// In js/calendar-view.js
class CalendarView extends UIComponent {
    attachEventListeners() {
        // Use the parent class event registration
        // This ensures cleanup happens automatically in destroy()
        
        this.registerEvent('#calPrevMonth', 'click', () => this.navigateMonth(-1));
        this.registerEvent('#calNextMonth', 'click', () => this.navigateMonth(1));
        this.registerEvent('#calClose', 'click', () => {
            this.hide();
            this.options.onClose();
        });
        
        // For delegated events on calendar days
        this.registerDelegatedEvent('click', '.calendar-day', (e) => {
            this.handleDayClick(e.target);
        });
    }
    
    // No need to override destroy() - parent handles cleanup
}

// Similar pattern for InsightsModal
class InsightsModal extends UIComponent {
    attachEventListeners() {
        this.registerEvent('.insights-close', 'click', () => this.hide());
        this.registerEvent('.insights-tab', 'click', (e) => this.switchTab(e.target));
        
        // Delegated event for dynamic content
        this.registerDelegatedEvent('click', '.pattern-item', (e) => {
            this.showPatternDetails(e.target.dataset.pattern);
        });
    }
}
```

### 4. Testing Strategy

#### Memory Leak Detection

```javascript
// Add debug method to check for leaks
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
            const calendar = new CalendarView();
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
```

#### Chrome DevTools Testing

1. Open Chrome DevTools
2. Go to Memory tab
3. Take heap snapshot
4. Perform actions (toggle views, create tasks, etc.)
5. Take another heap snapshot
6. Compare snapshots looking for:
   - Detached DOM elements
   - Increasing listener counts
   - Growing memory usage

#### Performance Profiling

```javascript
// Add to console for manual testing
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
```

### 5. Migration Steps

1. **Phase 1: Add Infrastructure**
   - Add EventListenerRegistry class to a new file `js/event-registry.js`
   - Include it in the module loading sequence before app.js

2. **Phase 2: Update Core App**
   - Extend SecretaryApp with ComponentWithListeners
   - Convert methods to arrow functions where appropriate
   - Replace all addEventListener calls with tracked versions
   - Add destroy method

3. **Phase 3: Update Components**
   - Refactor UIComponent base class to include registry
   - Update all UIComponent subclasses to use registerEvent
   - Ensure all dynamic elements track their listeners

4. **Phase 4: Testing**
   - Add memory leak detection utilities
   - Test all user flows for leaks
   - Monitor with Chrome DevTools
   - Run automated tests

5. **Phase 5: Cleanup**
   - Remove any remaining direct addEventListener calls
   - Add listener count to performance metrics
   - Document the new patterns

### 6. Expected Benefits

- **Memory Usage**: 30-50% reduction in memory growth over time
- **Performance**: Elimination of orphaned listeners consuming CPU
- **Reliability**: Prevention of duplicate event handlers
- **Debugging**: Real-time tracking of active listeners
- **Maintainability**: Centralized listener management

### 7. Code Snippets for Implementation

Add to `js/event-registry.js`:
```javascript
/**
 * Event Listener Registry for Secretary AI
 * Prevents memory leaks by tracking and cleaning up all event listeners
 */

// Full EventListenerRegistry implementation from section 1
class EventListenerRegistry { /* ... */ }

// Full ComponentWithListeners implementation from section 2
class ComponentWithListeners { /* ... */ }

// Export for use in other modules
export { EventListenerRegistry, ComponentWithListeners };
```

Update `js/app.js` imports and class definition:
```javascript
import { ComponentWithListeners } from './event-registry.js';

class SecretaryApp extends ComponentWithListeners {
    constructor() {
        super(); // Important: call parent constructor
        // ... rest of constructor
    }
    
    // Convert methods to arrow functions
    refreshSchedule = async () => {
        // Implementation
    }
    
    // ... rest of implementation
}
```

Add to performance monitoring:
```javascript
// In PerformanceMonitor
addListenerMetrics() {
    if (window.app && window.app.listenerRegistry) {
        this.metrics.activeListeners = window.app.listenerRegistry.getActiveCount();
        
        // Track potential leaks
        let detachedCount = 0;
        window.app.listenerRegistry.listeners.forEach((listener) => {
            if (!document.body.contains(listener.element)) {
                detachedCount++;
            }
        });
        
        this.metrics.detachedListeners = detachedCount;
    }
}
```

Update module loader to include event registry:
```javascript
// In js/module-loader.js
const MODULE_LOAD_ORDER = [
    'config.js',
    'performance-monitor.js',
    'validation-utils.js',
    'event-manager.js',
    'event-registry.js',  // Add here, before components
    'ui-components.js',
    // ... rest of modules
];
```

## Best Practices Summary

1. **Always use arrow functions** for event handlers in class components
2. **Never add listeners directly** - always use the registry methods
3. **Clean up before recreating** - remove old listeners before adding new ones
4. **Use delegated events** for dynamic content when possible
5. **Test memory usage** regularly during development
6. **Track listener counts** in performance metrics

## Conclusion

This enhanced fix addresses the root cause of event listener memory leaks by:
1. Centralizing listener management with a robust registry
2. Providing clean patterns using arrow functions
3. Ensuring automatic cleanup through inheritance
4. Offering comprehensive testing strategies
5. Creating maintainable, debuggable code

The implementation is backwards-compatible and can be rolled out incrementally without breaking existing functionality, while providing immediate benefits in memory usage and performance.