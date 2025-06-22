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
            
            // Check for duplicates before creating
            const existingTasks = await this.getAllTasks();
            const normalizedNewText = taskData.text.trim().toLowerCase();
            
            // Check for exact or very similar duplicates
            const duplicate = existingTasks.find(task => {
                const normalizedExistingText = task.text.trim().toLowerCase();
                // Check for exact match or if one contains the other (allowing minor variations)
                return normalizedExistingText === normalizedNewText ||
                       (task.section === taskData.section && 
                        (normalizedExistingText.includes(normalizedNewText) || 
                         normalizedNewText.includes(normalizedExistingText)));
            });
            
            if (duplicate) {
                console.warn(`Duplicate task detected: "${taskData.text}" already exists as "${duplicate.text}"`);
                // Return the existing task instead of creating a duplicate
                return duplicate;
            }
            
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
            
            // Simple duplicate check: if text is being changed, verify it won't create a duplicate
            if (updates.text && this.taskCache.has(taskId)) {
                const currentTask = this.taskCache.get(taskId);
                if (currentTask.text !== updates.text) {
                    // Check if new text would duplicate another task in the same section
                    const normalizedNewText = updates.text.toLowerCase().trim();
                    const duplicateExists = Array.from(this.taskCache.values()).some(task => 
                        task.id !== taskId && 
                        task.section === (updates.section || currentTask.section) &&
                        task.text.toLowerCase().trim() === normalizedNewText
                    );
                    
                    if (duplicateExists) {
                        console.warn(`Update would create duplicate task: "${updates.text}"`);
                        throw new Error('A task with this text already exists in this section');
                    }
                }
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
     * Get all tasks - backward compatible method that loads all tasks
     * WARNING: This loads ALL tasks and may cause performance issues with large datasets
     * Consider using getAllTasksPaginated() for better performance
     */
    async getAllTasks() {
        if (!this.isAvailable()) {
            console.warn('TaskDataService not available, returning cached tasks');
            return Array.from(this.taskCache.values());
        }

        try {
            // Load all tasks by fetching pages until no more data
            const allTasks = [];
            let lastDoc = null;
            let hasMore = true;
            const pageSize = 100; // Larger page size for backward compatibility
            
            while (hasMore) {
                const result = await this.getAllTasksPaginated({
                    limit: pageSize,
                    startAfterDoc: lastDoc
                });
                
                allTasks.push(...result.tasks);
                lastDoc = result.lastDoc;
                hasMore = result.hasMore;
            }
            
            console.log(`Loaded ${allTasks.length} total tasks from Firestore`);
            this.lastSync = new Date().toISOString();
            return allTasks;
        } catch (error) {
            console.error('Error getting all tasks:', error);
            return Array.from(this.taskCache.values());
        }
    }

    /**
     * Get tasks with pagination support
     * @param {Object} options Pagination options
     * @param {number} options.limit Maximum number of tasks to return (default: 50)
     * @param {DocumentSnapshot} options.startAfterDoc Firestore document to start after
     * @param {string} options.orderByField Field to order by (default: 'createdAt')
     * @param {string} options.orderDirection Order direction: 'asc' or 'desc' (default: 'desc')
     * @returns {Object} { tasks: Array, lastDoc: DocumentSnapshot, hasMore: boolean }
     */
    async getAllTasksPaginated(options = {}) {
        const {
            limit = 50,
            startAfterDoc = null,
            orderByField = 'createdAt',
            orderDirection = 'desc'
        } = options;

        if (!this.isAvailable()) {
            console.warn('TaskDataService not available, returning cached tasks');
            const cachedTasks = Array.from(this.taskCache.values());
            return {
                tasks: cachedTasks.slice(0, limit),
                lastDoc: null,
                hasMore: cachedTasks.length > limit
            };
        }

        try {
            const { query, orderBy, limit: limitFn, startAfter, getDocs, collection } = this.firestoreService.firestoreModules;
            
            // Build query with pagination
            const collectionRef = collection(this.firestoreService.db, `users/${this.userId}/tasks`);
            let q = query(
                collectionRef,
                orderBy(orderByField, orderDirection),
                limitFn(limit + 1) // Get one extra to check if there are more
            );
            
            // Add cursor if provided
            if (startAfterDoc) {
                q = query(
                    collectionRef,
                    orderBy(orderByField, orderDirection),
                    startAfter(startAfterDoc),
                    limitFn(limit + 1)
                );
            }
            
            const querySnapshot = await getDocs(q);
            const tasks = [];
            let lastDoc = null;
            
            querySnapshot.forEach((doc) => {
                if (tasks.length < limit) {
                    const taskData = doc.data();
                    tasks.push(taskData);
                    this.taskCache.set(doc.id, taskData);
                    lastDoc = doc;
                }
            });
            
            // Check if there are more results
            const hasMore = querySnapshot.size > limit;
            
            console.log(`Loaded ${tasks.length} tasks (page size: ${limit}, has more: ${hasMore})`);
            
            return {
                tasks,
                lastDoc,
                hasMore
            };
        } catch (error) {
            console.error('Error getting paginated tasks:', error);
            const cachedTasks = Array.from(this.taskCache.values());
            return {
                tasks: cachedTasks.slice(0, limit),
                lastDoc: null,
                hasMore: cachedTasks.length > limit
            };
        }
    }

    /**
     * Get tasks by section
     * @deprecated Use getTasksBySectionPaginated for better performance
     */
    async getTasksBySection(section) {
        const allTasks = await this.getAllTasks();
        return allTasks.filter(task => task.section === section);
    }

    /**
     * Get tasks by section with pagination
     * @param {string} section Section name to filter by
     * @param {Object} paginationOptions Pagination options
     * @returns {Object} { tasks: Array, lastDoc: DocumentSnapshot, hasMore: boolean }
     */
    async getTasksBySectionPaginated(section, paginationOptions = {}) {
        if (!this.isAvailable()) {
            // Fallback to client-side filtering of cache
            const allCached = Array.from(this.taskCache.values());
            const filtered = allCached.filter(task => task.section === section);
            const limit = paginationOptions.limit || 50;
            return {
                tasks: filtered.slice(0, limit),
                lastDoc: null,
                hasMore: filtered.length > limit
            };
        }

        try {
            const { query, where, orderBy, limit: limitFn, startAfter, getDocs, collection } = this.firestoreService.firestoreModules;
            const {
                limit = 50,
                startAfterDoc = null,
                orderByField = 'createdAt',
                orderDirection = 'desc'
            } = paginationOptions;
            
            // Build query with section filter and pagination
            const collectionRef = collection(this.firestoreService.db, `users/${this.userId}/tasks`);
            let q = query(
                collectionRef,
                where('section', '==', section),
                orderBy(orderByField, orderDirection),
                limitFn(limit + 1)
            );
            
            if (startAfterDoc) {
                q = query(
                    collectionRef,
                    where('section', '==', section),
                    orderBy(orderByField, orderDirection),
                    startAfter(startAfterDoc),
                    limitFn(limit + 1)
                );
            }
            
            const querySnapshot = await getDocs(q);
            const tasks = [];
            let lastDoc = null;
            
            querySnapshot.forEach((doc) => {
                if (tasks.length < limit) {
                    const taskData = doc.data();
                    tasks.push(taskData);
                    this.taskCache.set(doc.id, taskData);
                    lastDoc = doc;
                }
            });
            
            const hasMore = querySnapshot.size > limit;
            
            console.log(`Loaded ${tasks.length} tasks for section ${section} (has more: ${hasMore})`);
            
            return {
                tasks,
                lastDoc,
                hasMore
            };
        } catch (error) {
            console.error('Error getting tasks by section:', error);
            return {
                tasks: [],
                lastDoc: null,
                hasMore: false
            };
        }
    }

    /**
     * Get tasks by filters
     * @deprecated Use getTasksPaginated for better performance
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
     * Get tasks with filters and pagination
     * Note: Complex filters are applied client-side after fetching a page
     * For best performance, use section/priority filters which can be applied server-side
     * @param {Object} filters Filter criteria
     * @param {Object} paginationOptions Pagination options
     * @returns {Object} { tasks: Array, lastDoc: DocumentSnapshot, hasMore: boolean }
     */
    async getTasksPaginated(filters = {}, paginationOptions = {}) {
        const { limit = 50 } = paginationOptions;
        
        // If we have a section filter, use the optimized section query
        if (filters.section && Object.keys(filters).length === 1) {
            return this.getTasksBySectionPaginated(filters.section, paginationOptions);
        }
        
        // Otherwise, we need to fetch pages and filter client-side
        // This is less efficient but maintains flexibility
        const result = await this.getAllTasksPaginated(paginationOptions);
        
        // Apply filters to the fetched page
        const filteredTasks = result.tasks.filter(task => {
            // Apply all filter logic
            if (filters.section && task.section !== filters.section) {
                return false;
            }
            if (filters.priority && task.priority !== filters.priority) {
                return false;
            }
            if (filters.completed !== undefined && task.completed !== filters.completed) {
                return false;
            }
            if (filters.dateFrom && task.date && new Date(task.date) < new Date(filters.dateFrom)) {
                return false;
            }
            if (filters.dateTo && task.date && new Date(task.date) > new Date(filters.dateTo)) {
                return false;
            }
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!task.text.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }
            return true;
        });
        
        // Note: This approach may return fewer results than requested if many are filtered out
        // A more sophisticated implementation would fetch additional pages until limit is reached
        return {
            tasks: filteredTasks,
            lastDoc: result.lastDoc,
            hasMore: result.hasMore,
            filteredCount: result.tasks.length - filteredTasks.length
        };
    }

    /**
     * Migrate tasks from TaskParser format to Firestore using batch operations
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
                skipped: 0,
                errors: [],
                sections: {}
            };

            // Get existing tasks to avoid duplicates
            console.log('🔍 Checking for existing tasks...');
            const existingTasks = await this.getAllTasks();
            const existingTaskIds = new Set(existingTasks.map(t => t.id));
            
            // Also create a map of existing tasks by normalized text content to catch duplicates
            const existingTasksByContent = new Map();
            existingTasks.forEach(task => {
                const normalizedText = task.text.trim().toLowerCase();
                const key = `${task.section}-${normalizedText}`;
                existingTasksByContent.set(key, task);
            });
            
            console.log(`📊 Found ${existingTasks.length} existing tasks in Firestore`);

            // Get batch from Firestore modules
            const { writeBatch, doc } = this.firestoreService.firestoreModules;
            const batch = writeBatch(this.firestoreService.db);
            let batchCount = 0;
            const BATCH_LIMIT = 500; // Firestore batch limit

            // Process each section
            console.log('📂 Processing sections:', Object.keys(parsedTasks));
            
            for (const [sectionName, sectionTasks] of Object.entries(parsedTasks)) {
                if (!Array.isArray(sectionTasks)) {
                    console.log(`⚠️ Skipping ${sectionName} - not an array`);
                    continue;
                }
                
                console.log(`📋 Processing ${sectionName}: ${sectionTasks.length} tasks`);
                
                migrationResults.sections[sectionName] = {
                    total: sectionTasks.length,
                    migrated: 0,
                    skipped: 0,
                    errors: []
                };

                for (const task of sectionTasks) {
                    try {
                        // Skip if task already exists by ID
                        if (existingTaskIds.has(task.id)) {
                            migrationResults.skipped++;
                            migrationResults.sections[sectionName].skipped++;
                            console.log(`⏭️ Skipping task (ID match): ${task.text}`);
                            continue;
                        }
                        
                        // Also check for duplicate by content
                        const normalizedText = task.text.trim().toLowerCase();
                        const contentKey = `${sectionName}-${normalizedText}`;
                        if (existingTasksByContent.has(contentKey)) {
                            migrationResults.skipped++;
                            migrationResults.sections[sectionName].skipped++;
                            console.log(`⏭️ Skipping task (content match): ${task.text}`);
                            continue;
                        }

                        // Convert TaskParser format to TaskDataService format
                        const taskData = {
                            id: task.id,
                            text: task.text,
                            section: task.section || sectionName,
                            priority: task.priority || 'medium',
                            date: this.sanitizeDate(task.date),
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

                        // Add to batch
                        const docRef = doc(this.firestoreService.db, 'users', this.firestoreService.userId, 'tasks', taskData.id);
                        batch.set(docRef, taskData);
                        
                        migrationResults.migrated++;
                        migrationResults.sections[sectionName].migrated++;
                        batchCount++;

                        // Commit batch if limit reached
                        if (batchCount >= BATCH_LIMIT) {
                            console.log(`💾 Committing batch of ${batchCount} tasks...`);
                            await batch.commit();
                            // Create new batch for remaining tasks
                            batch = writeBatch(this.firestoreService.db);
                            batchCount = 0;
                        }
                    } catch (error) {
                        console.error(`Error preparing task ${task.id}:`, error);
                        migrationResults.errors.push({
                            taskId: task.id,
                            error: error.message
                        });
                        migrationResults.sections[sectionName].errors.push(error.message);
                    }
                }
            }

            // Commit remaining tasks in batch
            if (batchCount > 0) {
                console.log(`💾 Committing final batch of ${batchCount} tasks...`);
                await batch.commit();
            }

            console.log(`✅ Migration completed: ${migrationResults.migrated} new tasks migrated, ${migrationResults.skipped} skipped (already exist)`);
            console.log('📊 Migration breakdown by section:', migrationResults.sections);
            
            // Update cache with newly migrated tasks
            const allTasks = await this.getAllTasks();
            console.log(`📋 Total tasks in Firestore after migration: ${allTasks.length}`);
            
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
     * Sanitize date to ensure it's valid for Firestore
     */
    sanitizeDate(date) {
        if (!date) return null;
        
        try {
            // If it's already a valid date string or Date object
            const dateObj = new Date(date);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toISOString();
            }
        } catch (e) {
            // Invalid date
        }
        
        // Return null for invalid dates instead of throwing
        console.warn(`Invalid date detected: ${date}, using null instead`);
        return null;
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
    
    /**
     * Remove duplicate tasks from Firestore
     * Keeps the oldest task (by createdAt) when duplicates are found
     */
    async deduplicateTasks() {
        if (!this.isAvailable()) {
            console.warn('Cannot deduplicate - TaskDataService not available');
            return { success: false, error: 'Service not available' };
        }

        try {
            console.log('🧹 Starting task deduplication...');
            
            // Get all tasks
            const allTasks = await this.getAllTasks();
            console.log(`📊 Total tasks before deduplication: ${allTasks.length}`);
            
            // Group tasks by normalized content
            const taskGroups = new Map();
            
            allTasks.forEach(task => {
                const normalizedText = task.text.trim().toLowerCase();
                const key = `${task.section}-${normalizedText}`;
                
                if (!taskGroups.has(key)) {
                    taskGroups.set(key, []);
                }
                taskGroups.get(key).push(task);
            });
            
            // Find and remove duplicates
            const duplicatesToDelete = [];
            let duplicateCount = 0;
            
            taskGroups.forEach((tasks, key) => {
                if (tasks.length > 1) {
                    console.log(`🔍 Found ${tasks.length} duplicates for: ${tasks[0].text}`);
                    duplicateCount += tasks.length - 1;
                    
                    // Sort by multiple criteria to keep the best version
                    tasks.sort((a, b) => {
                        // First priority: Keep completed tasks over incomplete
                        if (a.completed !== b.completed) {
                            return a.completed ? -1 : 1;
                        }
                        
                        // Second priority: Keep tasks with more details (subTasks, reminders)
                        const aDetails = (a.subTasks?.length || 0) + (a.reminders?.length || 0);
                        const bDetails = (b.subTasks?.length || 0) + (b.reminders?.length || 0);
                        if (aDetails !== bDetails) {
                            return bDetails - aDetails; // Higher detail count first
                        }
                        
                        // Third priority: Keep older tasks (by createdAt)
                        const dateA = new Date(a.createdAt || '2000-01-01');
                        const dateB = new Date(b.createdAt || '2000-01-01');
                        return dateA - dateB;
                    });
                    
                    // Log which one we're keeping
                    console.log(`✅ Keeping: "${tasks[0].text}" (completed: ${tasks[0].completed}, details: ${(tasks[0].subTasks?.length || 0) + (tasks[0].reminders?.length || 0)})`);
                    
                    // Mark all but the first (best) for deletion
                    for (let i = 1; i < tasks.length; i++) {
                        duplicatesToDelete.push(tasks[i].id);
                    }
                }
            });
            
            // Delete duplicates
            if (duplicatesToDelete.length > 0) {
                console.log(`🗑️ Deleting ${duplicatesToDelete.length} duplicate tasks...`);
                
                for (const taskId of duplicatesToDelete) {
                    await this.deleteTask(taskId);
                }
                
                console.log(`✅ Deduplication complete! Removed ${duplicateCount} duplicates`);
            } else {
                console.log('✅ No duplicates found!');
            }
            
            return {
                success: true,
                totalTasks: allTasks.length,
                duplicatesRemoved: duplicateCount,
                remainingTasks: allTasks.length - duplicateCount
            };
        } catch (error) {
            console.error('Error during deduplication:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export for use in other modules
window.TaskDataService = TaskDataService;
export { TaskDataService };