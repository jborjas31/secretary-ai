/**
 * Base Manager Class
 * Provides common functionality for all manager classes
 */
export class BaseManager {
    constructor(app) {
        this.app = app;
        this.listeners = new Map();
    }

    // Service accessors
    get taskDataService() { return this.app.taskDataService; }
    get scheduleDataService() { return this.app.scheduleDataService; }
    get storageService() { return this.app.storageService; }
    get llmService() { return this.app.llmService; }
    get patternAnalyzer() { return this.app.patternAnalyzer; }
    get taskIndexManager() { return this.app.taskIndexManager; }
    get filterCache() { return this.app.filterCache; }
    
    // State accessor
    get state() { return this.app.state; }
    
    // UI element accessors
    get elements() { return this.app.elements; }
    
    /**
     * Emit an event to other managers
     */
    emit(eventName, data) {
        if (this.app && this.app.emit) {
            this.app.emit(eventName, data);
        }
    }
    
    /**
     * Listen for events from other managers
     */
    on(eventName, callback) {
        if (this.app && this.app.on) {
            const wrappedCallback = (data) => callback.call(this, data);
            this.listeners.set(callback, wrappedCallback);
            this.app.on(eventName, wrappedCallback);
        }
    }
    
    /**
     * Remove event listener
     */
    off(eventName, callback) {
        if (this.app && this.app.off) {
            const wrappedCallback = this.listeners.get(callback);
            if (wrappedCallback) {
                this.app.off(eventName, wrappedCallback);
                this.listeners.delete(callback);
            }
        }
    }
    
    /**
     * Initialize the manager (to be overridden by subclasses)
     */
    async initialize() {
        // Override in subclasses
    }
    
    /**
     * Clean up all listeners
     */
    cleanup() {
        this.listeners.clear();
    }
    
    /**
     * Check if a service is available
     */
    isServiceAvailable(serviceName) {
        return this.app && this.app[serviceName] && !this.app[serviceName].error;
    }
    
    /**
     * Safe service call with error handling
     */
    async safeServiceCall(serviceName, methodName, ...args) {
        if (!this.isServiceAvailable(serviceName)) {
            throw new Error(`Service ${serviceName} is not available`);
        }
        
        const service = this.app[serviceName];
        if (typeof service[methodName] !== 'function') {
            throw new Error(`Method ${methodName} not found on ${serviceName}`);
        }
        
        try {
            return await service[methodName](...args);
        } catch (error) {
            console.error(`Error calling ${serviceName}.${methodName}:`, error);
            throw error;
        }
    }
    
    /**
     * Update app state
     */
    updateState(updates) {
        if (this.app && this.app.updateState) {
            this.app.updateState(updates);
        }
    }
}