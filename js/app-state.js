/**
 * Centralized Application State
 * Manages shared state across all managers
 */
export class AppState {
    constructor() {
        this.state = {
            // Date and schedule state
            currentDate: new Date(),
            currentSchedule: null,
            scheduleSyncData: null,
            scheduleGenerating: false,
            lastScheduleDate: null,
            
            // Task state
            currentTasks: [],
            filteredTasks: [],
            allTasks: [],
            taskStates: {},
            
            // Pagination state
            taskPagination: {
                offset: 0,
                limit: 50,
                hasMore: true,
                isLoading: false
            },
            
            // Filter state
            currentFilters: {
                search: '',
                category: 'all',
                sortBy: 'creation',
                hideCompleted: false
            },
            
            // UI state
            currentView: 'schedule', // 'schedule' or 'tasks'
            isLoading: false,
            loadingMessage: '',
            
            // Settings state
            settings: {
                apiKey: '',
                selectedModel: null,
                autoRefresh: false,
                theme: 'light'
            },
            
            // Cache state
            lastTaskLoad: 0,
            scheduleCache: new Map(),
            
            // Migration state
            migrationInProgress: false,
            hasMigratedTasks: false
        };
        
        this.listeners = new Map();
    }
    
    /**
     * Get current state value
     */
    get(key) {
        if (key.includes('.')) {
            return this._getNestedValue(key);
        }
        return this.state[key];
    }
    
    /**
     * Update state and notify listeners
     */
    update(updates) {
        const changedKeys = new Set();
        
        Object.entries(updates).forEach(([key, value]) => {
            if (key.includes('.')) {
                this._setNestedValue(key, value);
            } else {
                this.state[key] = value;
            }
            changedKeys.add(key.split('.')[0]);
        });
        
        // Notify listeners
        changedKeys.forEach(key => {
            this._notifyListeners(key, this.state[key]);
        });
        
        // Notify global state change
        this._notifyListeners('*', this.state);
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }
    
    /**
     * Get nested value using dot notation
     */
    _getNestedValue(path) {
        const keys = path.split('.');
        let value = this.state;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }
    
    /**
     * Set nested value using dot notation
     */
    _setNestedValue(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let obj = this.state;
        
        for (const key of keys) {
            if (!(key in obj) || typeof obj[key] !== 'object') {
                obj[key] = {};
            }
            obj = obj[key];
        }
        
        obj[lastKey] = value;
    }
    
    /**
     * Notify listeners of state change
     */
    _notifyListeners(key, value) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error(`Error in state listener for ${key}:`, error);
                }
            });
        }
    }
    
    /**
     * Batch multiple updates
     */
    batchUpdate(updateFn) {
        const updates = {};
        const proxy = {
            set: (key, value) => {
                updates[key] = value;
            }
        };
        
        updateFn(proxy);
        this.update(updates);
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        const initialDate = new Date();
        this.update({
            currentDate: initialDate,
            currentSchedule: null,
            currentTasks: [],
            filteredTasks: [],
            'taskPagination.offset': 0,
            'taskPagination.hasMore': true,
            'currentFilters.search': '',
            'currentFilters.category': 'all',
            isLoading: false
        });
    }
    
    /**
     * Get state snapshot for debugging
     */
    getSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }
}