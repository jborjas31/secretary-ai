/**
 * Schedule Data Service - Enhanced schedule management with history and completion tracking
 * Handles historical schedule storage, completion metrics, and cross-date coordination
 */

class ScheduleDataService {
    constructor() {
        this.firestoreService = null;
        this.storageService = null;
        this.initialized = false;
        this.scheduleCache = new Map();
        this.historyCache = new Map();
        this.userId = 'default-user'; // Fixed user ID for single-user app
    }

    /**
     * Initialize with required services
     */
    initialize(firestoreService, storageService) {
        this.firestoreService = firestoreService;
        this.storageService = storageService;
        this.initialized = true;
        
        console.log('ScheduleDataService initialized successfully');
        return true;
    }

    /**
     * Check if service is available
     */
    isAvailable() {
        return this.initialized && this.firestoreService;
    }

    /**
     * Save schedule with enhanced metadata and history tracking
     */
    async saveSchedule(date, scheduleData, completionData = null) {
        const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        
        try {
            // Enhanced schedule data with metadata
            const enhancedScheduleData = {
                ...scheduleData,
                date: dateKey,
                version: scheduleData.version || 1,
                generatedAt: scheduleData.generatedAt || new Date().toISOString(),
                savedAt: new Date().toISOString(),
                userId: this.userId,
                metadata: {
                    taskCount: scheduleData.schedule ? scheduleData.schedule.length : 0,
                    hasHighPriority: scheduleData.schedule ? 
                        scheduleData.schedule.some(task => task.priority === 'high') : false,
                    categories: scheduleData.schedule ? 
                        [...new Set(scheduleData.schedule.map(task => task.category).filter(Boolean))] : [],
                    estimatedDuration: this.calculateTotalDuration(scheduleData.schedule),
                    ...scheduleData.metadata
                }
            };

            // Save current schedule using existing StorageService
            if (this.storageService) {
                await this.storageService.saveSchedule(date, enhancedScheduleData);
            }

            // Save to schedule history for tracking
            await this.saveScheduleHistory(dateKey, enhancedScheduleData, completionData);

            // Update cache
            this.scheduleCache.set(dateKey, enhancedScheduleData);

            console.log(`Enhanced schedule saved for ${dateKey}`);
            return enhancedScheduleData;
        } catch (error) {
            console.error('Error saving enhanced schedule:', error);
            throw error;
        }
    }

    /**
     * Save schedule to history collection for long-term tracking
     */
    async saveScheduleHistory(date, scheduleData, completionData = null) {
        if (!this.isAvailable() || !this.firestoreService.isAvailable()) {
            console.warn('Cannot save schedule history - service not available');
            return null;
        }

        try {
            const { setDoc } = this.firestoreService.firestoreModules;
            const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            
            const historyData = {
                ...scheduleData,
                historySavedAt: new Date().toISOString(),
                completion: completionData || this.initializeCompletionData(scheduleData),
                analytics: {
                    totalTasks: scheduleData.schedule ? scheduleData.schedule.length : 0,
                    completedTasks: completionData ? completionData.completedCount : 0,
                    completionRate: completionData ? 
                        (completionData.completedCount / (scheduleData.schedule?.length || 1) * 100) : 0,
                    timeSpent: completionData ? completionData.totalTimeSpent : null
                }
            };

            // Save to history subcollection
            const docRef = this.firestoreService.getUserDocRef('schedules/history', dateKey);
            await setDoc(docRef, historyData, { merge: true });

            // Update cache
            this.historyCache.set(dateKey, historyData);

            console.log(`Schedule history saved for ${dateKey}`);
            return historyData;
        } catch (error) {
            console.error('Error saving schedule history:', error);
            throw error;
        }
    }

    /**
     * Load schedule with fallback to history
     */
    async loadSchedule(date) {
        const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        // Try current schedule first (via StorageService)
        if (this.storageService) {
            try {
                const currentSchedule = await this.storageService.loadSchedule(date);
                if (currentSchedule) {
                    this.scheduleCache.set(dateKey, currentSchedule);
                    return currentSchedule;
                }
            } catch (error) {
                console.error('Error loading current schedule:', error);
            }
        }

        // Fallback to history
        return await this.loadScheduleFromHistory(dateKey);
    }

    /**
     * Load schedule from history collection
     */
    async loadScheduleFromHistory(date) {
        if (!this.isAvailable() || !this.firestoreService.isAvailable()) {
            console.warn('Cannot load schedule history - service not available');
            return this.historyCache.get(date) || null;
        }

        try {
            const { getDoc } = this.firestoreService.firestoreModules;
            const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            
            const docRef = this.firestoreService.getUserDocRef('schedules/history', dateKey);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const historyData = docSnap.data();
                this.historyCache.set(dateKey, historyData);
                console.log(`Schedule history loaded for ${dateKey}`);
                return historyData;
            } else {
                console.log(`No schedule history found for ${dateKey}`);
                return null;
            }
        } catch (error) {
            console.error('Error loading schedule history:', error);
            return this.historyCache.get(date) || null;
        }
    }

    /**
     * Get schedule history for a date range
     */
    async getScheduleHistory(startDate, endDate, includeAnalytics = true) {
        if (!this.isAvailable() || !this.firestoreService.isAvailable()) {
            console.warn('Cannot get schedule history - service not available');
            return [];
        }

        try {
            const { query, where, orderBy, getDocs, collection } = this.firestoreService.firestoreModules;
            
            const startKey = startDate.toISOString().split('T')[0];
            const endKey = endDate.toISOString().split('T')[0];
            
            // Get history collection reference
            const historyCollectionRef = collection(
                this.firestoreService.db, 
                `users/${this.userId}/schedules/history`
            );
            
            const q = query(
                historyCollectionRef,
                where('__name__', '>=', startKey),
                where('__name__', '<=', endKey),
                orderBy('__name__', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const schedules = [];
            
            querySnapshot.forEach((doc) => {
                const scheduleData = doc.data();
                schedules.push({
                    id: doc.id,
                    date: doc.id,
                    ...scheduleData
                });
                
                // Update cache
                this.historyCache.set(doc.id, scheduleData);
            });
            
            console.log(`Loaded ${schedules.length} schedules from history (${startKey} to ${endKey})`);
            return schedules;
        } catch (error) {
            console.error('Error loading schedule history range:', error);
            return [];
        }
    }

    /**
     * Update task completion in schedule
     */
    async updateTaskCompletion(date, taskId, completed, actualDuration = null) {
        const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        
        try {
            // Load current schedule
            const schedule = await this.loadSchedule(dateKey);
            if (!schedule) {
                console.warn(`No schedule found for ${dateKey} to update task completion`);
                return null;
            }

            // Update task completion in schedule
            if (schedule.schedule) {
                const taskIndex = schedule.schedule.findIndex(task => 
                    task.id === taskId || task.task?.includes(taskId)
                );
                
                if (taskIndex !== -1) {
                    schedule.schedule[taskIndex].completed = completed;
                    schedule.schedule[taskIndex].completedAt = completed ? new Date().toISOString() : null;
                    if (actualDuration) {
                        schedule.schedule[taskIndex].actualDuration = actualDuration;
                    }
                }
            }

            // Calculate completion data
            const completionData = this.calculateCompletionData(schedule);

            // Save updated schedule
            await this.saveSchedule(dateKey, schedule, completionData);

            console.log(`Task completion updated for ${taskId} on ${dateKey}`);
            return completionData;
        } catch (error) {
            console.error('Error updating task completion:', error);
            throw error;
        }
    }

    /**
     * Get completion statistics for a date range
     */
    async getCompletionStats(startDate, endDate) {
        const schedules = await this.getScheduleHistory(startDate, endDate, true);
        
        const stats = {
            totalDays: schedules.length,
            totalTasks: 0,
            completedTasks: 0,
            averageCompletionRate: 0,
            dailyStats: [],
            categoryStats: {},
            priorityStats: { high: 0, medium: 0, low: 0 },
            timeStats: {
                totalEstimated: 0,
                totalActual: 0,
                averageTaskDuration: 0
            }
        };

        schedules.forEach(schedule => {
            const dayStats = {
                date: schedule.date,
                totalTasks: schedule.analytics?.totalTasks || 0,
                completedTasks: schedule.analytics?.completedTasks || 0,
                completionRate: schedule.analytics?.completionRate || 0
            };

            stats.totalTasks += dayStats.totalTasks;
            stats.completedTasks += dayStats.completedTasks;
            stats.dailyStats.push(dayStats);

            // Category and priority analysis
            if (schedule.schedule) {
                schedule.schedule.forEach(task => {
                    // Category stats
                    if (task.category) {
                        if (!stats.categoryStats[task.category]) {
                            stats.categoryStats[task.category] = { total: 0, completed: 0 };
                        }
                        stats.categoryStats[task.category].total++;
                        if (task.completed) {
                            stats.categoryStats[task.category].completed++;
                        }
                    }

                    // Priority stats
                    if (task.priority && stats.priorityStats[task.priority] !== undefined) {
                        stats.priorityStats[task.priority]++;
                    }

                    // Time stats
                    if (task.duration) {
                        const duration = this.parseDuration(task.duration);
                        stats.timeStats.totalEstimated += duration;
                    }
                    if (task.actualDuration) {
                        stats.timeStats.totalActual += task.actualDuration;
                    }
                });
            }
        });

        // Calculate averages
        stats.averageCompletionRate = stats.totalTasks > 0 ? 
            (stats.completedTasks / stats.totalTasks * 100) : 0;
        
        stats.timeStats.averageTaskDuration = stats.totalTasks > 0 ? 
            stats.timeStats.totalEstimated / stats.totalTasks : 0;

        return stats;
    }

    /**
     * Initialize completion data structure
     */
    initializeCompletionData(scheduleData) {
        const tasks = scheduleData.schedule || [];
        return {
            totalTasks: tasks.length,
            completedCount: tasks.filter(task => task.completed).length,
            totalTimeSpent: 0,
            tasksById: tasks.reduce((acc, task, index) => {
                acc[task.id || `task-${index}`] = {
                    completed: task.completed || false,
                    completedAt: task.completedAt || null,
                    actualDuration: task.actualDuration || null
                };
                return acc;
            }, {})
        };
    }

    /**
     * Calculate completion data from schedule
     */
    calculateCompletionData(scheduleData) {
        const tasks = scheduleData.schedule || [];
        const completedTasks = tasks.filter(task => task.completed);
        
        return {
            totalTasks: tasks.length,
            completedCount: completedTasks.length,
            completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length * 100) : 0,
            totalTimeSpent: completedTasks.reduce((total, task) => {
                return total + (task.actualDuration || 0);
            }, 0),
            tasksById: tasks.reduce((acc, task, index) => {
                acc[task.id || `task-${index}`] = {
                    completed: task.completed || false,
                    completedAt: task.completedAt || null,
                    actualDuration: task.actualDuration || null
                };
                return acc;
            }, {})
        };
    }

    /**
     * Calculate total estimated duration from schedule
     */
    calculateTotalDuration(tasks) {
        if (!Array.isArray(tasks)) return 0;
        
        return tasks.reduce((total, task) => {
            return total + (this.parseDuration(task.duration) || 0);
        }, 0);
    }

    /**
     * Parse duration string to minutes
     */
    parseDuration(durationStr) {
        if (!durationStr) return 0;
        
        const matches = durationStr.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
        if (!matches) return 0;
        
        const value = parseInt(matches[1]);
        const unit = matches[2].toLowerCase();
        
        if (unit.startsWith('hour') || unit.startsWith('hr')) {
            return value * 60;
        }
        return value;
    }

    /**
     * Clean up old schedule history (keep specified number of days)
     */
    async cleanupOldHistory(daysToKeep = 90) {
        if (!this.isAvailable() || !this.firestoreService.isAvailable()) {
            console.warn('Cannot cleanup history - service not available');
            return 0;
        }

        try {
            const { query, where, getDocs, deleteDoc, collection } = this.firestoreService.firestoreModules;
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffKey = cutoffDate.toISOString().split('T')[0];
            
            const historyCollectionRef = collection(
                this.firestoreService.db, 
                `users/${this.userId}/schedules/history`
            );
            
            const q = query(
                historyCollectionRef,
                where('__name__', '<', cutoffKey)
            );
            
            const querySnapshot = await getDocs(q);
            const deletePromises = [];
            
            querySnapshot.forEach((docSnapshot) => {
                deletePromises.push(deleteDoc(docSnapshot.ref));
                // Remove from cache
                this.historyCache.delete(docSnapshot.id);
            });
            
            await Promise.all(deletePromises);
            console.log(`Cleaned up ${deletePromises.length} old schedule history entries`);
            return deletePromises.length;
        } catch (error) {
            console.error('Error cleaning up schedule history:', error);
            return 0;
        }
    }

    /**
     * Get service status and statistics
     */
    getServiceStatus() {
        return {
            available: this.isAvailable(),
            initialized: this.initialized,
            cachedSchedules: this.scheduleCache.size,
            cachedHistory: this.historyCache.size,
            firestoreAvailable: this.firestoreService ? this.firestoreService.isAvailable() : false
        };
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this.scheduleCache.clear();
        this.historyCache.clear();
        console.log('Schedule caches cleared');
    }
}

// Export for use in other modules
window.ScheduleDataService = ScheduleDataService;