/**
 * Storage Service - Coordinates between local storage and Firestore
 * Provides offline-first functionality with cloud sync
 */

class StorageService {
    constructor() {
        this.firestoreService = null;
        this.localStoragePrefix = 'secretary-ai-';
        this.syncInProgress = false;
        this.lastSyncTime = null;
    }

    /**
     * Initialize with Firestore service
     */
    setFirestoreService(firestoreService) {
        this.firestoreService = firestoreService;
    }

    /**
     * Get data from local storage
     */
    getLocal(key) {
        try {
            const data = localStorage.getItem(this.localStoragePrefix + key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from local storage:', error);
            return null;
        }
    }

    /**
     * Save data to local storage
     */
    setLocal(key, data) {
        try {
            localStorage.setItem(this.localStoragePrefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error writing to local storage:', error);
            return false;
        }
    }

    /**
     * Remove data from local storage
     */
    removeLocal(key) {
        try {
            localStorage.removeItem(this.localStoragePrefix + key);
            return true;
        } catch (error) {
            console.error('Error removing from local storage:', error);
            return false;
        }
    }

    /**
     * Save schedule with automatic sync
     */
    async saveSchedule(date, scheduleData) {
        const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        
        // Always save locally first
        this.setLocal(`schedule-${dateKey}`, {
            ...scheduleData,
            localSavedAt: new Date().toISOString()
        });

        // Try to sync to Firestore if available
        if (this.firestoreService && this.firestoreService.isAvailable()) {
            try {
                await this.firestoreService.saveSchedule(date, scheduleData);
                
                // Mark as synced locally
                this.setLocal(`schedule-${dateKey}-synced`, {
                    syncedAt: new Date().toISOString(),
                    status: 'synced'
                });
            } catch (error) {
                console.error('Failed to sync schedule to Firestore:', error);
                
                // Mark as pending sync
                this.setLocal(`schedule-${dateKey}-synced`, {
                    status: 'pending',
                    error: error.message
                });
            }
        }

        return scheduleData;
    }

    /**
     * Load schedule with fallback logic
     */
    async loadSchedule(date) {
        const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        
        // Try Firestore first if available
        if (this.firestoreService && this.firestoreService.isAvailable()) {
            try {
                const firestoreData = await this.firestoreService.loadSchedule(date);
                if (firestoreData) {
                    // Cache locally for offline access
                    this.setLocal(`schedule-${dateKey}`, firestoreData);
                    return firestoreData;
                }
            } catch (error) {
                console.error('Failed to load from Firestore, trying local storage:', error);
            }
        }

        // Fallback to local storage
        const localData = this.getLocal(`schedule-${dateKey}`);
        if (localData) {
            console.log('Loaded schedule from local storage');
            return localData;
        }

        return null;
    }

    /**
     * Save task states
     */
    async saveTaskStates(taskStates) {
        // Save locally first
        this.setLocal('task-states', {
            states: taskStates,
            localUpdatedAt: new Date().toISOString()
        });

        // Sync to Firestore if available
        if (this.firestoreService && this.firestoreService.isAvailable()) {
            try {
                await this.firestoreService.saveTaskStates(taskStates);
                this.setLocal('task-states-synced', {
                    syncedAt: new Date().toISOString(),
                    status: 'synced'
                });
            } catch (error) {
                console.error('Failed to sync task states to Firestore:', error);
                this.setLocal('task-states-synced', {
                    status: 'pending',
                    error: error.message
                });
            }
        }

        return taskStates;
    }

    /**
     * Load task states
     */
    async loadTaskStates() {
        // Try Firestore first
        if (this.firestoreService && this.firestoreService.isAvailable()) {
            try {
                const firestoreStates = await this.firestoreService.loadTaskStates();
                if (firestoreStates && Object.keys(firestoreStates).length > 0) {
                    // Cache locally
                    this.setLocal('task-states', {
                        states: firestoreStates,
                        localUpdatedAt: new Date().toISOString()
                    });
                    return firestoreStates;
                }
            } catch (error) {
                console.error('Failed to load task states from Firestore:', error);
            }
        }

        // Fallback to local storage
        const localStates = this.getLocal('task-states');
        return localStates ? localStates.states : {};
    }

    /**
     * Save settings
     */
    async saveSettings(settings) {
        // Save locally first
        this.setLocal('settings', {
            ...settings,
            localUpdatedAt: new Date().toISOString()
        });

        // Sync to Firestore if available
        if (this.firestoreService && this.firestoreService.isAvailable()) {
            try {
                await this.firestoreService.saveSettings(settings);
                this.setLocal('settings-synced', {
                    syncedAt: new Date().toISOString(),
                    status: 'synced'
                });
            } catch (error) {
                console.error('Failed to sync settings to Firestore:', error);
                this.setLocal('settings-synced', {
                    status: 'pending',
                    error: error.message
                });
            }
        }

        return settings;
    }

    /**
     * Load settings
     */
    async loadSettings() {
        // Try Firestore first
        if (this.firestoreService && this.firestoreService.isAvailable()) {
            try {
                const firestoreSettings = await this.firestoreService.loadSettings();
                if (firestoreSettings) {
                    // Cache locally
                    this.setLocal('settings', firestoreSettings);
                    return firestoreSettings;
                }
            } catch (error) {
                console.error('Failed to load settings from Firestore:', error);
            }
        }

        // Fallback to local storage
        const localSettings = this.getLocal('settings');
        if (localSettings) {
            return localSettings;
        }

        // Return default settings
        return {
            openrouterApiKey: '',
            selectedModel: 'anthropic/claude-3.5-sonnet',
            refreshInterval: 30,
            notifications: true,
            theme: 'light'
        };
    }

    /**
     * Sync pending data when back online
     */
    async syncPendingData() {
        if (this.syncInProgress || !this.firestoreService || !this.firestoreService.isAvailable()) {
            return;
        }

        this.syncInProgress = true;
        console.log('Starting sync of pending data...');

        try {
            const pendingItems = this.findPendingSyncItems();
            const syncPromises = [];

            for (const item of pendingItems) {
                if (item.type === 'schedule') {
                    const scheduleData = this.getLocal(item.key);
                    if (scheduleData) {
                        syncPromises.push(
                            this.firestoreService.saveSchedule(item.date, scheduleData)
                                .then(() => {
                                    this.setLocal(`${item.key}-synced`, {
                                        syncedAt: new Date().toISOString(),
                                        status: 'synced'
                                    });
                                })
                                .catch(error => {
                                    console.error(`Failed to sync ${item.key}:`, error);
                                })
                        );
                    }
                } else if (item.type === 'task-states') {
                    const taskStates = this.getLocal('task-states');
                    if (taskStates && taskStates.states) {
                        syncPromises.push(
                            this.firestoreService.saveTaskStates(taskStates.states)
                                .then(() => {
                                    this.setLocal('task-states-synced', {
                                        syncedAt: new Date().toISOString(),
                                        status: 'synced'
                                    });
                                })
                                .catch(error => {
                                    console.error('Failed to sync task states:', error);
                                })
                        );
                    }
                } else if (item.type === 'settings') {
                    const settings = this.getLocal('settings');
                    if (settings) {
                        syncPromises.push(
                            this.firestoreService.saveSettings(settings)
                                .then(() => {
                                    this.setLocal('settings-synced', {
                                        syncedAt: new Date().toISOString(),
                                        status: 'synced'
                                    });
                                })
                                .catch(error => {
                                    console.error('Failed to sync settings:', error);
                                })
                        );
                    }
                }
            }

            await Promise.allSettled(syncPromises);
            this.lastSyncTime = new Date();
            console.log(`Sync completed. Processed ${syncPromises.length} items.`);
        } catch (error) {
            console.error('Error during sync:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Find items that need syncing
     */
    findPendingSyncItems() {
        const pendingItems = [];
        
        // Check all localStorage keys for pending sync items
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.localStoragePrefix)) {
                const cleanKey = key.replace(this.localStoragePrefix, '');
                
                if (cleanKey.endsWith('-synced')) {
                    const syncData = this.getLocal(cleanKey);
                    if (syncData && syncData.status === 'pending') {
                        const originalKey = cleanKey.replace('-synced', '');
                        
                        if (originalKey.startsWith('schedule-')) {
                            const date = originalKey.replace('schedule-', '');
                            pendingItems.push({
                                type: 'schedule',
                                key: originalKey,
                                date: date
                            });
                        } else if (originalKey === 'task-states') {
                            pendingItems.push({
                                type: 'task-states',
                                key: originalKey
                            });
                        } else if (originalKey === 'settings') {
                            pendingItems.push({
                                type: 'settings',
                                key: originalKey
                            });
                        }
                    }
                }
            }
        }

        return pendingItems;
    }

    /**
     * Get sync status
     */
    getSyncStatus() {
        const pendingItems = this.findPendingSyncItems();
        const isOnline = this.firestoreService && this.firestoreService.isAvailable();
        
        return {
            isOnline: isOnline,
            lastSyncTime: this.lastSyncTime,
            pendingItems: pendingItems.length,
            syncInProgress: this.syncInProgress
        };
    }

    /**
     * Clear all local data (for reset)
     */
    clearAllLocalData() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.localStoragePrefix)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`Cleared ${keysToRemove.length} items from local storage`);
    }

    /**
     * Export data for backup
     */
    exportData() {
        const data = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.localStoragePrefix)) {
                const cleanKey = key.replace(this.localStoragePrefix, '');
                data[cleanKey] = this.getLocal(cleanKey);
            }
        }
        
        return {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            data: data
        };
    }

    /**
     * Import data from backup
     */
    importData(backupData) {
        if (!backupData || !backupData.data) {
            throw new Error('Invalid backup data format');
        }
        
        let importedCount = 0;
        
        for (const [key, value] of Object.entries(backupData.data)) {
            if (this.setLocal(key, value)) {
                importedCount++;
            }
        }
        
        console.log(`Imported ${importedCount} items from backup`);
        return importedCount;
    }

    /**
     * Set TaskDataService for task coordination
     */
    setTaskDataService(taskDataService) {
        this.taskDataService = taskDataService;
        console.log('TaskDataService connected to StorageService');
    }

    /**
     * Set ScheduleDataService for enhanced schedule management
     */
    setScheduleDataService(scheduleDataService) {
        this.scheduleDataService = scheduleDataService;
        console.log('ScheduleDataService connected to StorageService');
    }

    /**
     * Enhanced schedule saving with history tracking
     */
    async saveScheduleWithHistory(date, scheduleData, completionData = null) {
        try {
            // Use enhanced ScheduleDataService if available
            if (this.scheduleDataService) {
                return await this.scheduleDataService.saveSchedule(date, scheduleData, completionData);
            } else {
                // Fallback to existing method
                return await this.saveSchedule(date, scheduleData);
            }
        } catch (error) {
            console.error('Error saving schedule with history:', error);
            // Fallback to basic save
            return await this.saveSchedule(date, scheduleData);
        }
    }

    /**
     * Enhanced schedule loading with history fallback
     */
    async loadScheduleWithHistory(date) {
        try {
            // Use enhanced ScheduleDataService if available
            if (this.scheduleDataService) {
                return await this.scheduleDataService.loadSchedule(date);
            } else {
                // Fallback to existing method
                return await this.loadSchedule(date);
            }
        } catch (error) {
            console.error('Error loading schedule with history:', error);
            // Fallback to basic load
            return await this.loadSchedule(date);
        }
    }

    /**
     * Save task to Firestore using TaskDataService
     */
    async saveTask(taskData) {
        if (!this.taskDataService || !this.taskDataService.isAvailable()) {
            console.warn('TaskDataService not available, task not saved to cloud');
            return null;
        }

        try {
            return await this.taskDataService.createTask(taskData);
        } catch (error) {
            console.error('Error saving task:', error);
            throw error;
        }
    }

    /**
     * Update task in Firestore
     */
    async updateTask(taskId, updates) {
        if (!this.taskDataService || !this.taskDataService.isAvailable()) {
            console.warn('TaskDataService not available, task not updated in cloud');
            return null;
        }

        try {
            return await this.taskDataService.updateTask(taskId, updates);
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    /**
     * Delete task from Firestore
     */
    async deleteTask(taskId) {
        if (!this.taskDataService || !this.taskDataService.isAvailable()) {
            console.warn('TaskDataService not available, task not deleted from cloud');
            return false;
        }

        try {
            return await this.taskDataService.deleteTask(taskId);
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    /**
     * Get tasks from Firestore
     */
    async getTasks(filters = {}) {
        if (!this.taskDataService || !this.taskDataService.isAvailable()) {
            console.warn('TaskDataService not available, returning empty array');
            return [];
        }

        try {
            return await this.taskDataService.getTasks(filters);
        } catch (error) {
            console.error('Error getting tasks:', error);
            return [];
        }
    }

    /**
     * Update task completion and sync with schedule
     */
    async updateTaskCompletion(taskId, completed, actualDuration = null, date = null) {
        try {
            // Update task in TaskDataService
            if (this.taskDataService && this.taskDataService.isAvailable()) {
                await this.taskDataService.updateTask(taskId, {
                    completed: completed,
                    actualDuration: actualDuration,
                    completedAt: completed ? new Date().toISOString() : null
                });
            }

            // Update schedule completion if date provided
            if (date && this.scheduleDataService) {
                await this.scheduleDataService.updateTaskCompletion(date, taskId, completed, actualDuration);
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating task completion:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync all data services
     */
    async syncAllServices() {
        const syncResults = {
            timestamp: new Date().toISOString(),
            firestore: false,
            tasks: false,
            schedules: false,
            errors: []
        };

        try {
            // Sync existing Firestore data
            if (this.firestoreService && this.firestoreService.isAvailable()) {
                await this.syncPendingData();
                syncResults.firestore = true;
            }

            // Sync TaskDataService
            if (this.taskDataService && this.taskDataService.isAvailable()) {
                await this.taskDataService.syncWithFirestore();
                syncResults.tasks = true;
            }

            // Sync ScheduleDataService (handled by existing Firestore sync)
            if (this.scheduleDataService) {
                syncResults.schedules = true;
            }

            console.log('All services synced successfully');
        } catch (error) {
            console.error('Error during service sync:', error);
            syncResults.errors.push(error.message);
        }

        return syncResults;
    }

    /**
     * Get comprehensive sync status
     */
    getComprehensiveSyncStatus() {
        const basicStatus = this.getSyncStatus();
        
        return {
            ...basicStatus,
            services: {
                firestore: this.firestoreService ? this.firestoreService.isAvailable() : false,
                taskData: this.taskDataService ? this.taskDataService.isAvailable() : false,
                scheduleData: this.scheduleDataService ? this.scheduleDataService.isAvailable() : false
            },
            taskDataStatus: this.taskDataService ? this.taskDataService.getSyncStatus() : null,
            scheduleDataStatus: this.scheduleDataService ? this.scheduleDataService.getServiceStatus() : null
        };
    }

    /**
     * Initialize all data services
     */
    async initializeDataServices(firestoreService) {
        try {
            // Initialize TaskDataService if not already done
            if (this.taskDataService && !this.taskDataService.isAvailable()) {
                this.taskDataService.initialize(firestoreService);
            }

            // Initialize ScheduleDataService if not already done
            if (this.scheduleDataService && !this.scheduleDataService.isAvailable()) {
                this.scheduleDataService.initialize(firestoreService, this);
            }

            console.log('All data services initialized');
            return true;
        } catch (error) {
            console.error('Error initializing data services:', error);
            return false;
        }
    }

    /**
     * Migration helper - check and perform task migration
     */
    async performTaskMigration(taskParser) {
        if (!this.taskDataService || !this.taskDataService.isAvailable()) {
            console.log('Task migration skipped - TaskDataService not available');
            return { migrated: false, reason: 'TaskDataService not available' };
        }

        try {
            // Check if migration is needed
            const migrationStatus = await taskParser.checkMigrationStatus(this.taskDataService);
            
            if (!migrationStatus.migrated) {
                console.log('Starting task migration...');
                const migrationResult = await taskParser.migrateToFirestore(this.taskDataService);
                
                if (migrationResult.success) {
                    // Save migration status
                    this.setLocal('migration-status', {
                        completed: true,
                        timestamp: new Date().toISOString(),
                        tasksMigrated: migrationResult.migrated
                    });
                }
                
                return migrationResult;
            } else {
                console.log(`Migration already completed - ${migrationStatus.taskCount} tasks in Firestore`);
                return { 
                    migrated: true, 
                    taskCount: migrationStatus.taskCount,
                    alreadyCompleted: true 
                };
            }
        } catch (error) {
            console.error('Error during task migration:', error);
            return { 
                migrated: false, 
                error: error.message 
            };
        }
    }

    /**
     * Export enhanced backup data
     */
    exportEnhancedData() {
        const basicData = this.exportData();
        
        return {
            ...basicData,
            services: {
                taskDataAvailable: this.taskDataService ? this.taskDataService.isAvailable() : false,
                scheduleDataAvailable: this.scheduleDataService ? this.scheduleDataService.isAvailable() : false,
                migrationStatus: this.getLocal('migration-status')
            }
        };
    }
}

// Export for use in other modules
window.StorageService = StorageService;