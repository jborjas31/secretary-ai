/**
 * Task Data Service - Manages structured task data in Firestore
 * Provides CRUD operations for individual tasks with real-time sync
 */

class TaskDataService {
    constructor() {
        this.firestoreService = null;
        this.initialized = false;
        this.taskCache = new Map();
        this.lastSync = null;
        this.userId = 'default-user'; // Fixed user ID for single-user app
    }

    /**
     * Initialize with Firestore service
     */
    initialize(firestoreService) {
        this.firestoreService = firestoreService;
        this.initialized = this.firestoreService && this.firestoreService.isAvailable();
        
        if (this.initialized) {
            console.log('TaskDataService initialized successfully');
        } else {
            console.warn('TaskDataService initialized without Firestore');
        }
        
        return this.initialized;
    }

    /**
     * Check if service is available
     */
    isAvailable() {
        return this.initialized && this.firestoreService && this.firestoreService.isAvailable();
    }

    /**
     * Generate a unique task ID
     */
    generateTaskId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `task-${timestamp}-${random}`;
    }

    /**
     * Create task data structure from raw input
     */
    createTaskData(taskInput) {
        const now = new Date().toISOString();
        
        // Handle both string input and object input
        const taskData = typeof taskInput === 'string' ? { text: taskInput } : taskInput;
        
        return {
            id: taskData.id || this.generateTaskId(),
            text: taskData.text || '',
            section: taskData.section || 'undatedTasks',
            priority: taskData.priority || 'medium',
            date: taskData.date || null,
            completed: taskData.completed || false,
            subTasks: taskData.subTasks || [],
            reminders: taskData.reminders || [],
            details: taskData.details || [],
            createdAt: taskData.createdAt || now,
            modifiedAt: now,
            completedAt: taskData.completedAt || null,
            estimatedDuration: taskData.estimatedDuration || null,
            actualDuration: taskData.actualDuration || null,
            userId: this.userId
        };
    }

    /**
     * Create a new task
     */
    async createTask(taskInput) {
        if (!this.isAvailable()) {
            console.warn('TaskDataService not available, task not saved to cloud');
            return null;
        }

        try {
            const taskData = this.createTaskData(taskInput);
            const { setDoc } = this.firestoreService.firestoreModules;
            
            // Get document reference
            const docRef = this.firestoreService.getUserDocRef('tasks', taskData.id);
            
            // Save to Firestore
            await setDoc(docRef, taskData);
            
            // Update cache
            this.taskCache.set(taskData.id, taskData);
            
            console.log(`Task created: ${taskData.id}`);
            return taskData;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    /**
     * Update an existing task
     */
    async updateTask(taskId, updates) {
        if (!this.isAvailable()) {
            console.warn('TaskDataService not available, task not updated in cloud');
            return null;
        }

        try {
            const { updateDoc } = this.firestoreService.firestoreModules;
            
            // Add modification timestamp
            const updateData = {
                ...updates,
                modifiedAt: new Date().toISOString()
            };

            // If marking as completed, add completion timestamp
            if (updates.completed === true && !updates.completedAt) {
                updateData.completedAt = new Date().toISOString();
            } else if (updates.completed === false) {
                updateData.completedAt = null;
            }
            
            // Get document reference and update
            const docRef = this.firestoreService.getUserDocRef('tasks', taskId);
            await updateDoc(docRef, updateData);
            
            // Update cache if task exists
            if (this.taskCache.has(taskId)) {
                const cachedTask = this.taskCache.get(taskId);
                this.taskCache.set(taskId, { ...cachedTask, ...updateData });
            }
            
            console.log(`Task updated: ${taskId}`);
            return updateData;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        if (!this.isAvailable()) {
            console.warn('TaskDataService not available, task not deleted from cloud');
            return false;
        }

        try {
            const { deleteDoc } = this.firestoreService.firestoreModules;
            
            // Get document reference and delete
            const docRef = this.firestoreService.getUserDocRef('tasks', taskId);
            await deleteDoc(docRef);
            
            // Remove from cache
            this.taskCache.delete(taskId);
            
            console.log(`Task deleted: ${taskId}`);
            return true;
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    /**
     * Get a single task by ID
     */
    async getTask(taskId) {
        if (!this.isAvailable()) {
            return this.taskCache.get(taskId) || null;
        }

        try {
            const { getDoc } = this.firestoreService.firestoreModules;
            
            const docRef = this.firestoreService.getUserDocRef('tasks', taskId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const taskData = docSnap.data();
                this.taskCache.set(taskId, taskData);
                return taskData;
            } else {
                console.log(`Task not found: ${taskId}`);
                return null;
            }
        } catch (error) {
            console.error('Error getting task:', error);
            return this.taskCache.get(taskId) || null;
        }
    }

    /**
     * Get all tasks
     */
    async getAllTasks() {
        if (!this.isAvailable()) {
            console.warn('TaskDataService not available, returning cached tasks');
            return Array.from(this.taskCache.values());
        }

        try {
            const { getDocs } = this.firestoreService.firestoreModules;
            
            const collectionRef = this.firestoreService.getUserDocRef('tasks');
            const querySnapshot = await getDocs(collectionRef);
            
            const tasks = [];
            querySnapshot.forEach((doc) => {
                const taskData = doc.data();
                tasks.push(taskData);
                this.taskCache.set(doc.id, taskData);
            });
            
            console.log(`Loaded ${tasks.length} tasks from Firestore`);
            this.lastSync = new Date().toISOString();
            return tasks;
        } catch (error) {
            console.error('Error getting all tasks:', error);
            return Array.from(this.taskCache.values());
        }
    }

    /**
     * Get tasks by section
     */
    async getTasksBySection(section) {
        const allTasks = await this.getAllTasks();
        return allTasks.filter(task => task.section === section);
    }

    /**
     * Get tasks by filters
     */
    async getTasks(filters = {}) {
        const allTasks = await this.getAllTasks();
        
        return allTasks.filter(task => {
            // Apply section filter
            if (filters.section && task.section !== filters.section) {
                return false;
            }
            
            // Apply priority filter
            if (filters.priority && task.priority !== filters.priority) {
                return false;
            }
            
            // Apply completion filter
            if (filters.completed !== undefined && task.completed !== filters.completed) {
                return false;
            }
            
            // Apply date range filter
            if (filters.dateFrom && task.date && new Date(task.date) < new Date(filters.dateFrom)) {
                return false;
            }
            if (filters.dateTo && task.date && new Date(task.date) > new Date(filters.dateTo)) {
                return false;
            }
            
            // Apply text search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!task.text.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Migrate tasks from TaskParser format to Firestore
     */
    async migrateTasks(parsedTasks) {
        if (!this.isAvailable()) {
            console.warn('TaskDataService not available, cannot migrate tasks');
            return { success: false, error: 'Service not available' };
        }

        try {
            const migrationResults = {
                success: true,
                migrated: 0,
                errors: [],
                sections: {}
            };

            // Process each section
            for (const [sectionName, sectionTasks] of Object.entries(parsedTasks)) {
                if (!Array.isArray(sectionTasks)) continue;
                
                migrationResults.sections[sectionName] = {
                    total: sectionTasks.length,
                    migrated: 0,
                    errors: []
                };

                for (const task of sectionTasks) {
                    try {
                        // Convert TaskParser format to TaskDataService format
                        const taskData = {
                            id: task.id,
                            text: task.text,
                            section: task.section || sectionName,
                            priority: task.priority || 'medium',
                            date: task.date,
                            completed: task.completed || false,
                            subTasks: task.subTasks || [],
                            reminders: task.details ? task.details.filter(d => d.type === 'reminder') : [],
                            details: task.details || [],
                            createdAt: task.createdAt || new Date().toISOString(),
                            modifiedAt: new Date().toISOString(),
                            completedAt: task.completedAt || null,
                            estimatedDuration: task.estimatedDuration || null,
                            actualDuration: task.actualDuration || null
                        };

                        await this.createTask(taskData);
                        migrationResults.migrated++;
                        migrationResults.sections[sectionName].migrated++;
                    } catch (error) {
                        console.error(`Error migrating task ${task.id}:`, error);
                        migrationResults.errors.push({
                            taskId: task.id,
                            error: error.message
                        });
                        migrationResults.sections[sectionName].errors.push(error.message);
                    }
                }
            }

            console.log(`Migration completed: ${migrationResults.migrated} tasks migrated`);
            return migrationResults;
        } catch (error) {
            console.error('Error during task migration:', error);
            return {
                success: false,
                error: error.message,
                migrated: 0
            };
        }
    }

    /**
     * Export tasks to TaskParser format (for tasks.md generation)
     */
    async exportToTaskParserFormat() {
        const allTasks = await this.getAllTasks();
        
        const exportData = {
            todayTasks: [],
            undatedTasks: [],
            upcomingTasks: [],
            dailyTasks: [],
            weeklyTasks: [],
            monthlyTasks: [],
            yearlyTasks: []
        };

        // Group tasks by section
        for (const task of allTasks) {
            const section = task.section || 'undatedTasks';
            if (exportData[section]) {
                exportData[section].push(task);
            }
        }

        return exportData;
    }

    /**
     * Get sync status and statistics
     */
    getSyncStatus() {
        return {
            available: this.isAvailable(),
            lastSync: this.lastSync,
            cachedTasks: this.taskCache.size,
            initialized: this.initialized
        };
    }

    /**
     * Clear local cache
     */
    clearCache() {
        this.taskCache.clear();
        console.log('Task cache cleared');
    }

    /**
     * Force sync with Firestore
     */
    async syncWithFirestore() {
        if (!this.isAvailable()) {
            console.warn('Cannot sync - TaskDataService not available');
            return false;
        }

        try {
            await this.getAllTasks(); // This will refresh the cache
            console.log('Task sync completed');
            return true;
        } catch (error) {
            console.error('Error during task sync:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.TaskDataService = TaskDataService;