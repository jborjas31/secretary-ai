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
        
        // Cache configuration
        this.maxCacheSize = 30; // Keep 30 days of schedules in each cache
        this.cacheAccessOrder = new Map(); // Track access order for LRU eviction
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

            // Update cache with LRU tracking
            this.scheduleCache.set(dateKey, enhancedScheduleData);
            this.trackCacheAccess('schedule', dateKey);
            this.enforceCacheLimits();

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
            const docRef = this.firestoreService.getUserDocRef('history', dateKey);
            await setDoc(docRef, historyData, { merge: true });

            // Update cache with LRU tracking
            this.historyCache.set(dateKey, historyData);
            this.trackCacheAccess('history', dateKey);
            this.enforceCacheLimits();

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
                    this.trackCacheAccess('schedule', dateKey);
                    this.enforceCacheLimits();
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
            
            const docRef = this.firestoreService.getUserDocRef('history', dateKey);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const historyData = docSnap.data();
                this.historyCache.set(dateKey, historyData);
                this.trackCacheAccess('history', dateKey);
                this.enforceCacheLimits();
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
     * Get schedule history for a date range with pagination support
     * @param {Date} startDate - Start date for range
     * @param {Date} endDate - End date for range
     * @param {Object} options - Options object
     * @param {boolean} options.includeAnalytics - Include analytics data (default: true)
     * @param {number} options.limit - Maximum number of results (default: 30)
     * @param {number} options.offset - Number of results to skip (default: 0)
     * @returns {Object} Object containing schedules array and pagination info
     */
    async getScheduleHistory(startDate, endDate, options = {}) {
        const { 
            includeAnalytics = true, 
            limit = 30, 
            offset = 0 
        } = options;
        if (!this.isAvailable() || !this.firestoreService.isAvailable()) {
            console.warn('Cannot get schedule history - service not available');
            return { schedules: [], total: 0, hasMore: false };
        }

        try {
            const { query, where, orderBy, getDocs, collection } = this.firestoreService.firestoreModules;
            
            const startKey = startDate.toISOString().split('T')[0];
            const endKey = endDate.toISOString().split('T')[0];
            
            // Get history collection reference
            const historyCollectionRef = collection(
                this.firestoreService.db, 
                `users/${this.userId}/history`
            );
            
            const q = query(
                historyCollectionRef,
                where('__name__', '>=', startKey),
                where('__name__', '<=', endKey),
                orderBy('__name__', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const allSchedules = [];
            
            querySnapshot.forEach((doc) => {
                const scheduleData = doc.data();
                allSchedules.push({
                    id: doc.id,
                    date: doc.id,
                    ...scheduleData
                });
                
                // Update cache with LRU tracking for accessed items only
                if (allSchedules.length > offset && allSchedules.length <= offset + limit) {
                    this.historyCache.set(doc.id, scheduleData);
                    this.trackCacheAccess('history', doc.id);
                }
            });
            
            // Apply pagination
            const paginatedSchedules = allSchedules.slice(offset, offset + limit);
            const hasMore = (offset + limit) < allSchedules.length;
            
            // Enforce cache limits after batch update
            this.enforceCacheLimits();
            
            console.log(`Loaded ${paginatedSchedules.length} of ${allSchedules.length} schedules (${startKey} to ${endKey})`);
            
            return {
                schedules: paginatedSchedules,
                total: allSchedules.length,
                offset: offset,
                limit: limit,
                hasMore: hasMore
            };
        } catch (error) {
            console.error('Error loading schedule history range:', error);
            return { schedules: [], total: 0, hasMore: false };
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
        // Get all schedules without pagination for stats calculation
        const result = await this.getScheduleHistory(startDate, endDate, { 
            includeAnalytics: true,
            limit: 365 // Get up to a year of data for stats
        });
        const schedules = result.schedules;
        
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
                `users/${this.userId}/history`
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
        const memoryInfo = this.getCacheMemoryEstimate();
        return {
            available: this.isAvailable(),
            initialized: this.initialized,
            cachedSchedules: this.scheduleCache.size,
            cachedHistory: this.historyCache.size,
            firestoreAvailable: this.firestoreService ? this.firestoreService.isAvailable() : false,
            cacheMemory: memoryInfo
        };
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this.scheduleCache.clear();
        this.historyCache.clear();
        this.cacheAccessOrder.clear();
        console.log('Schedule caches cleared');
    }

    /**
     * Track cache access for LRU eviction
     */
    trackCacheAccess(cacheType, key) {
        const accessKey = `${cacheType}:${key}`;
        // Remove old entry if exists
        if (this.cacheAccessOrder.has(accessKey)) {
            this.cacheAccessOrder.delete(accessKey);
        }
        // Add to end (most recently used)
        this.cacheAccessOrder.set(accessKey, Date.now());
    }

    /**
     * Enforce cache size limits using LRU eviction
     */
    enforceCacheLimits() {
        // Check schedule cache
        if (this.scheduleCache.size > this.maxCacheSize) {
            const itemsToRemove = this.scheduleCache.size - this.maxCacheSize;
            this.evictLRUItems('schedule', itemsToRemove);
        }

        // Check history cache
        if (this.historyCache.size > this.maxCacheSize) {
            const itemsToRemove = this.historyCache.size - this.maxCacheSize;
            this.evictLRUItems('history', itemsToRemove);
        }
    }

    /**
     * Evict least recently used items from cache
     */
    evictLRUItems(cacheType, count) {
        const cache = cacheType === 'schedule' ? this.scheduleCache : this.historyCache;
        
        // Get all entries for this cache type, sorted by access time
        const entries = Array.from(this.cacheAccessOrder.entries())
            .filter(([key]) => key.startsWith(`${cacheType}:`))
            .sort((a, b) => a[1] - b[1]); // Sort by timestamp (oldest first)

        // Remove oldest entries
        for (let i = 0; i < count && i < entries.length; i++) {
            const [accessKey] = entries[i];
            const actualKey = accessKey.split(':')[1];
            
            cache.delete(actualKey);
            this.cacheAccessOrder.delete(accessKey);
            
            console.log(`Evicted ${actualKey} from ${cacheType} cache (LRU)`);
        }
    }

    /**
     * Get cache memory usage estimate
     */
    getCacheMemoryEstimate() {
        // Rough estimate: average schedule is ~5KB
        const avgScheduleSize = 5 * 1024; // 5KB in bytes
        const totalCachedItems = this.scheduleCache.size + this.historyCache.size;
        const estimatedMemoryUsage = totalCachedItems * avgScheduleSize;
        
        return {
            scheduleCacheSize: this.scheduleCache.size,
            historyCacheSize: this.historyCache.size,
            totalItems: totalCachedItems,
            estimatedMemoryMB: (estimatedMemoryUsage / (1024 * 1024)).toFixed(2),
            maxCacheSize: this.maxCacheSize
        };
    }

    /**
     * Get incomplete tasks from a specific date that should rollover
     * @param {Date|string} date - The date to check for incomplete tasks
     * @returns {Array} Array of incomplete task objects
     */
    async getIncompleteTasks(date) {
        const schedule = await this.loadSchedule(date);
        if (!schedule || !schedule.schedule) return [];
        
        return schedule.schedule.filter(task => {
            // Only rollover tasks that were not completed and are not recurring
            return !task.completed && 
                   task.category !== 'dailyRoutines' &&
                   task.category !== 'weeklyTasks' &&
                   task.category !== 'monthlyTasks';
        }).map(task => ({
            ...task,
            rolloverFrom: typeof date === 'string' ? date : date.toISOString().split('T')[0],
            isRollover: true
        }));
    }

    /**
     * Check if previous day has incomplete tasks
     * @param {Date} currentDate - Current date to check from
     * @returns {Object} Object with hasIncomplete flag and tasks array
     */
    async checkForRollovers(currentDate) {
        const previousDate = new Date(currentDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const dateKey = previousDate.toISOString().split('T')[0];
        
        const incompleteTasks = await this.getIncompleteTasks(dateKey);
        
        return {
            hasIncomplete: incompleteTasks.length > 0,
            tasks: incompleteTasks,
            fromDate: dateKey
        };
    }
    
    /**
     * Check if a schedule exists for a given date
     * @param {string} dateKey - Date in YYYY-MM-DD format
     * @returns {boolean} True if schedule exists
     */
    async hasSchedule(dateKey) {
        try {
            // Check cache first
            if (this.scheduleCache.has(dateKey)) {
                return true;
            }
            
            // Check Firestore if available
            if (this.firestoreService && this.firestoreService.isAvailable()) {
                const docPath = `users/${this.userId}/schedules/${dateKey}`;
                const schedule = await this.firestoreService.getDocument(docPath);
                return !!(schedule && schedule.schedule && schedule.schedule.length > 0);
            }
            
            // Check local storage as fallback
            const localSchedule = await this.storageService.loadSchedule(dateKey);
            return !!(localSchedule && localSchedule.schedule && localSchedule.schedule.length > 0);
        } catch (error) {
            console.error(`Error checking schedule existence for ${dateKey}:`, error);
            return false;
        }
    }

    /**
     * Load multi-day context for enhanced schedule generation
     * @param {Date} currentDate - The current date
     * @param {number} daysBefore - Number of days to look back (default: 2)
     * @param {number} daysAfter - Number of days to look ahead (default: 3)
     * @returns {Object} Multi-day context including schedules, workload, and patterns
     */
    async loadMultiDayContext(currentDate, daysBefore = 2, daysAfter = 3) {
        const startTime = performance.now();
        const currentKey = currentDate.toISOString().split('T')[0];
        
        try {
            // Create date range
            const dates = [];
            for (let i = -daysBefore; i <= daysAfter; i++) {
                const date = new Date(currentDate);
                date.setDate(date.getDate() + i);
                dates.push({
                    date: date,
                    key: date.toISOString().split('T')[0],
                    offset: i,
                    isToday: i === 0
                });
            }
            
            // Load schedules in parallel for performance
            const schedulePromises = dates.map(async (dateInfo) => {
                const schedule = await this.loadSchedule(dateInfo.key);
                return {
                    ...dateInfo,
                    schedule: schedule,
                    exists: !!schedule,
                    workload: schedule ? this.calculateDailyCapacity(schedule) : null
                };
            });
            
            const schedules = await Promise.all(schedulePromises);
            
            // Organize context data
            const context = {
                currentDate: currentKey,
                dateRange: {
                    start: dates[0].key,
                    end: dates[dates.length - 1].key,
                    daysBefore: daysBefore,
                    daysAfter: daysAfter
                },
                schedules: schedules.reduce((acc, item) => {
                    acc[item.key] = item.schedule;
                    return acc;
                }, {}),
                workloadSummary: this.calculateWorkloadSummary(schedules),
                previousDays: schedules.filter(s => s.offset < 0),
                upcomingDays: schedules.filter(s => s.offset > 0),
                patterns: {
                    // Get completion patterns from previous days
                    averageCompletion: this.calculateAverageCompletion(schedules.filter(s => s.offset < 0)),
                    taskCounts: schedules.map(s => ({
                        date: s.key,
                        count: s.schedule?.schedule?.length || 0,
                        completed: s.schedule?.schedule?.filter(t => t.completed).length || 0
                    }))
                }
            };
            
            const loadTime = performance.now() - startTime;
            console.log(`Loaded multi-day context in ${loadTime.toFixed(2)}ms`);
            
            // Track performance
            if (window.performanceMonitor && window.performanceMonitor.recordMetric) {
                window.performanceMonitor.recordMetric('loadMultiDayContext', loadTime);
            }
            
            return context;
        } catch (error) {
            console.error('Error loading multi-day context:', error);
            return {
                currentDate: currentKey,
                error: error.message,
                schedules: {},
                workloadSummary: null,
                previousDays: [],
                upcomingDays: []
            };
        }
    }
    
    /**
     * Calculate daily workload capacity from a schedule
     * @param {Object} schedule - Schedule object
     * @returns {Object} Workload information including total hours and capacity
     */
    calculateDailyCapacity(schedule) {
        if (!schedule || !schedule.schedule) {
            return {
                totalMinutes: 0,
                totalHours: 0,
                taskCount: 0,
                isOverloaded: false,
                capacityPercentage: 0,
                breakdown: {}
            };
        }
        
        const tasks = schedule.schedule;
        const breakdown = {};
        let totalMinutes = 0;
        
        // Calculate total duration by category
        tasks.forEach(task => {
            const duration = this.parseDuration(task.duration) || 30; // Default 30 minutes
            totalMinutes += duration;
            
            const category = task.category || 'uncategorized';
            if (!breakdown[category]) {
                breakdown[category] = {
                    tasks: 0,
                    minutes: 0,
                    completed: 0
                };
            }
            breakdown[category].tasks++;
            breakdown[category].minutes += duration;
            if (task.completed) breakdown[category].completed++;
        });
        
        const totalHours = totalMinutes / 60;
        const workdayHours = 8; // Standard workday
        const isOverloaded = totalHours > workdayHours;
        const capacityPercentage = (totalHours / workdayHours) * 100;
        
        return {
            totalMinutes,
            totalHours: parseFloat(totalHours.toFixed(2)),
            taskCount: tasks.length,
            isOverloaded,
            capacityPercentage: Math.round(capacityPercentage),
            breakdown,
            completedCount: tasks.filter(t => t.completed).length,
            completionRate: tasks.length > 0 ? 
                Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0
        };
    }
    
    /**
     * Calculate workload summary across multiple days
     * @param {Array} schedules - Array of schedule objects with workload data
     * @returns {Object} Summary of workload patterns and recommendations
     */
    calculateWorkloadSummary(schedules) {
        const validSchedules = schedules.filter(s => s.workload);
        if (validSchedules.length === 0) {
            return {
                averageHours: 0,
                totalTasks: 0,
                overloadedDays: [],
                recommendations: []
            };
        }
        
        const totalHours = validSchedules.reduce((sum, s) => sum + s.workload.totalHours, 0);
        const totalTasks = validSchedules.reduce((sum, s) => sum + s.workload.taskCount, 0);
        const averageHours = totalHours / validSchedules.length;
        
        const overloadedDays = validSchedules
            .filter(s => s.workload.isOverloaded)
            .map(s => ({
                date: s.key,
                hours: s.workload.totalHours,
                excess: s.workload.totalHours - 8
            }));
        
        // Generate recommendations
        const recommendations = [];
        if (overloadedDays.length > 0) {
            recommendations.push({
                type: 'workload_balance',
                message: `${overloadedDays.length} day(s) have over 8 hours of work scheduled`,
                days: overloadedDays.map(d => d.date)
            });
        }
        
        // Check for uneven distribution
        const hoursByDay = validSchedules.map(s => s.workload.totalHours);
        const maxHours = Math.max(...hoursByDay);
        const minHours = Math.min(...hoursByDay);
        if (maxHours - minHours > 4) {
            recommendations.push({
                type: 'uneven_distribution',
                message: 'Workload varies significantly between days. Consider redistributing tasks.',
                variance: maxHours - minHours
            });
        }
        
        return {
            averageHours: parseFloat(averageHours.toFixed(2)),
            totalTasks,
            totalHours: parseFloat(totalHours.toFixed(2)),
            overloadedDays,
            recommendations,
            distribution: validSchedules.map(s => ({
                date: s.key,
                hours: s.workload.totalHours,
                tasks: s.workload.taskCount,
                isOverloaded: s.workload.isOverloaded
            }))
        };
    }
    
    /**
     * Calculate average completion rate from historical data
     * @param {Array} previousDays - Array of previous day schedules
     * @returns {Object} Average completion statistics
     */
    calculateAverageCompletion(previousDays) {
        const validDays = previousDays.filter(d => d.schedule && d.workload);
        if (validDays.length === 0) {
            return {
                rate: 0,
                tasksPerDay: 0,
                hoursPerDay: 0
            };
        }
        
        const totalCompletion = validDays.reduce((sum, d) => sum + d.workload.completionRate, 0);
        const totalTasks = validDays.reduce((sum, d) => sum + d.workload.taskCount, 0);
        const totalHours = validDays.reduce((sum, d) => sum + d.workload.totalHours, 0);
        
        return {
            rate: Math.round(totalCompletion / validDays.length),
            tasksPerDay: Math.round(totalTasks / validDays.length),
            hoursPerDay: parseFloat((totalHours / validDays.length).toFixed(2)),
            sampleSize: validDays.length
        };
    }
    
    /**
     * Get workload summary for a specific date
     * @param {Date|string} date - The date to analyze
     * @returns {Object} Workload summary for the date
     */
    async getWorkloadSummary(date) {
        const schedule = await this.loadSchedule(date);
        return this.calculateDailyCapacity(schedule);
    }
}

// Export for use in other modules
window.ScheduleDataService = ScheduleDataService;