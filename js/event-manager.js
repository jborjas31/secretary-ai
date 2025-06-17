/**
 * Event Manager for centralized event handling
 * Provides a pub/sub pattern for decoupled component communication
 */

class EventManager {
    constructor() {
        this.events = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {Function} handler - Event handler function
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    on(eventName, handler, options = {}) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const subscription = {
            handler,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateId()
        };

        const subscribers = this.events.get(eventName);
        subscribers.push(subscription);
        
        // Sort by priority (higher priority first)
        subscribers.sort((a, b) => b.priority - a.priority);

        // Return unsubscribe function
        return () => this.off(eventName, subscription.id);
    }

    /**
     * Subscribe to an event that fires only once
     */
    once(eventName, handler, options = {}) {
        return this.on(eventName, handler, { ...options, once: true });
    }

    /**
     * Unsubscribe from an event
     */
    off(eventName, subscriptionId) {
        if (!this.events.has(eventName)) return;

        const subscribers = this.events.get(eventName);
        const index = subscribers.findIndex(sub => sub.id === subscriptionId);
        
        if (index !== -1) {
            subscribers.splice(index, 1);
        }

        // Clean up empty event arrays
        if (subscribers.length === 0) {
            this.events.delete(eventName);
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - Name of the event
     * @param {*} data - Event data
     * @returns {Promise} Resolves when all handlers complete
     */
    async emit(eventName, data = null) {
        // Log to history
        this.logEvent(eventName, data);

        if (!this.events.has(eventName)) {
            return;
        }

        const subscribers = [...this.events.get(eventName)];
        const results = [];

        for (const subscription of subscribers) {
            try {
                const result = await subscription.handler(data);
                results.push(result);

                // Remove one-time listeners
                if (subscription.once) {
                    this.off(eventName, subscription.id);
                }
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
                // Continue with other handlers
            }
        }

        return results;
    }

    /**
     * Clear all subscribers for an event
     */
    clear(eventName) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get all subscribers for an event
     */
    getSubscribers(eventName) {
        return this.events.get(eventName) || [];
    }

    /**
     * Check if an event has subscribers
     */
    hasSubscribers(eventName) {
        return this.events.has(eventName) && this.events.get(eventName).length > 0;
    }

    /**
     * Log event to history
     */
    logEvent(eventName, data) {
        this.eventHistory.push({
            eventName,
            data,
            timestamp: new Date().toISOString()
        });

        // Maintain history size limit
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event history
     */
    getHistory(eventName = null) {
        if (eventName) {
            return this.eventHistory.filter(event => event.eventName === eventName);
        }
        return [...this.eventHistory];
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Task Management Events
 * Define standard events for task operations
 */
const TaskEvents = {
    // Task CRUD events
    TASK_CREATE: 'task:create',
    TASK_CREATED: 'task:created',
    TASK_UPDATE: 'task:update',
    TASK_UPDATED: 'task:updated',
    TASK_DELETE: 'task:delete',
    TASK_DELETED: 'task:deleted',
    TASK_COMPLETE: 'task:complete',
    TASK_COMPLETED: 'task:completed',
    
    // Task list events
    TASKS_LOAD: 'tasks:load',
    TASKS_LOADED: 'tasks:loaded',
    TASKS_FILTER: 'tasks:filter',
    TASKS_FILTERED: 'tasks:filtered',
    TASKS_SEARCH: 'tasks:search',
    TASKS_SEARCHED: 'tasks:searched',
    
    // Task UI events
    TASK_FORM_OPEN: 'task-form:open',
    TASK_FORM_CLOSE: 'task-form:close',
    TASK_FORM_SUBMIT: 'task-form:submit',
    TASK_FORM_SUBMITTED: 'task-form:submitted',
    
    // Sync events
    SYNC_START: 'sync:start',
    SYNC_COMPLETE: 'sync:complete',
    SYNC_ERROR: 'sync:error',
    
    // Schedule events
    SCHEDULE_GENERATE: 'schedule:generate',
    SCHEDULE_GENERATED: 'schedule:generated',
    SCHEDULE_UPDATE: 'schedule:update',
    SCHEDULE_UPDATED: 'schedule:updated'
};

/**
 * Create a global event manager instance
 */
const globalEventManager = new EventManager();

/**
 * Task Event Helper Functions
 */
const TaskEventHelpers = {
    /**
     * Emit task created event
     */
    emitTaskCreated(task) {
        return globalEventManager.emit(TaskEvents.TASK_CREATED, { task });
    },

    /**
     * Emit task updated event
     */
    emitTaskUpdated(taskId, updates, previousTask) {
        return globalEventManager.emit(TaskEvents.TASK_UPDATED, {
            taskId,
            updates,
            previousTask
        });
    },

    /**
     * Emit task deleted event
     */
    emitTaskDeleted(taskId, task) {
        return globalEventManager.emit(TaskEvents.TASK_DELETED, {
            taskId,
            task
        });
    },

    /**
     * Emit task completed event
     */
    emitTaskCompleted(taskId, completed) {
        return globalEventManager.emit(TaskEvents.TASK_COMPLETED, {
            taskId,
            completed
        });
    },

    /**
     * Subscribe to task events with proper error handling
     */
    subscribeToTaskEvents(handlers) {
        const unsubscribers = [];

        Object.entries(handlers).forEach(([event, handler]) => {
            if (TaskEvents[event] || Object.values(TaskEvents).includes(event)) {
                const unsubscribe = globalEventManager.on(event, handler);
                unsubscribers.push(unsubscribe);
            }
        });

        // Return function to unsubscribe from all events
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }
};

// Export for use in other modules
window.EventManager = EventManager;
window.TaskEvents = TaskEvents;
window.TaskEventHelpers = TaskEventHelpers;
window.globalEventManager = globalEventManager;