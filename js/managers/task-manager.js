import { BaseManager } from '../base-manager.js';

/**
 * TaskManager
 * Handles all task CRUD operations, filtering, searching, and task management UI
 */
export class TaskManager extends BaseManager {
    constructor(app) {
        super(app);
        
        // Task management state
        this.currentTasks = [];
        this.filteredTasks = [];
        this.searchQuery = '';
        this.searchDebounceTimer = null;
        
        // Active filters
        this.activeFilters = {
            section: 'all',
            priority: 'all',
            completed: 'all'
        };
        
        // Pagination state
        this.taskPagination = {
            pageSize: 50,
            lastDoc: null,
            hasMore: true,
            loading: false,
            sectionPagination: {} // Track pagination per section
        };
    }
    
    /**
     * Initialize the task manager
     */
    async initialize() {
        // Set up event listeners for task events
        this.setupTaskEventListeners();
        
        // Initialize components for task management
        await this.initializeTaskComponents();
    }
    
    /**
     * Initialize task management components
     */
    async initializeTaskComponents() {
        // Load UI Components on demand
        await window.loadUIComponents();
        
        // Initialize search bar with proper debouncing
        if (this.app.elements.searchBarContainer) {
            this.app.components.searchBar = new UIComponents.SearchBarComponent({
                placeholder: 'Search tasks...',
                debounceDelay: 300,
                onSearch: (query) => this.handleTaskSearch(query)
            });
            this.app.elements.searchBarContainer.appendChild(this.app.components.searchBar.render());
        }

        // Initialize floating action button
        this.app.components.floatingActionButton = new UIComponents.FloatingActionButton({
            icon: '+',
            label: 'Add Task',
            onClick: () => this.showTaskForm('create')
        });
    }
    
    /**
     * Set up task management event listeners
     */
    setupTaskEventListeners() {
        // Subscribe to global task events
        if (window.globalEventManager && window.TaskEvents) {
            window.globalEventManager.on(window.TaskEvents.TASK_CREATED, (data) => {
                this.handleTaskCreated(data.task);
            });

            window.globalEventManager.on(window.TaskEvents.TASK_UPDATED, (data) => {
                this.handleTaskUpdated(data.taskId, data.updates);
            });

            window.globalEventManager.on(window.TaskEvents.TASK_DELETED, (data) => {
                this.handleTaskDeleted(data.taskId);
            });

            window.globalEventManager.on(window.TaskEvents.TASK_COMPLETED, (data) => {
                this.handleTaskCompleted(data.taskId, data.completed);
            });
        }
    }
    
    /* ==============================================
       TASK CRUD OPERATIONS
       ============================================== */
    
    /**
     * Create a new task
     */
    async createTask(taskData) {
        try {
            let newTask;
            
            if (this.taskDataService.isAvailable()) {
                newTask = await this.taskDataService.createTask(taskData);
            } else {
                // Cannot create tasks without TaskDataService
                console.error('Cannot create tasks - TaskDataService not available');
                this.app.uiManager.showToast('Cannot create tasks - database not connected', 'error');
                return null;
            }

            // Add to indexes
            if (newTask) {
                this.taskIndexManager.addTaskToIndexes(newTask);
                this.filterCache.invalidate();
                
                // Apply filters to include new task if it matches
                this.applyTaskFilters();
                
                // Update display
                this.updateTaskManagementDisplay();
            }
            
            // Emit event
            if (window.TaskEventHelpers) {
                await window.TaskEventHelpers.emitTaskCreated(newTask);
            }
            
            this.app.uiManager.showToast('Task created successfully', 'success');
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    /**
     * Update an existing task
     */
    async updateTask(taskId, updates) {
        try {
            let updatedTask;
            
            if (this.taskDataService.isAvailable()) {
                await this.taskDataService.updateTask(taskId, updates);
                updatedTask = await this.taskDataService.getTask(taskId);
            } else {
                // Fallback: update in current tasks
                const taskIndex = this.currentTasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    this.currentTasks[taskIndex] = { ...this.currentTasks[taskIndex], ...updates };
                    updatedTask = this.currentTasks[taskIndex];
                }
            }

            // Update indexes
            if (updatedTask) {
                const task = this.taskIndexManager.taskById.get(taskId);
                if (task) {
                    // Remove from old indexes
                    this.taskIndexManager.removeTaskFromIndexes(task);
                    
                    // Apply updates to the task
                    Object.assign(task, updates);
                    
                    // Add to new indexes
                    this.taskIndexManager.addTaskToIndexes(task);
                    
                    // Invalidate cache
                    this.filterCache.invalidate();
                    
                    // Reapply filters and update display
                    this.applyTaskFilters();
                    this.updateTaskManagementDisplay();
                }
            }
            
            // Emit event
            if (window.TaskEventHelpers) {
                await window.TaskEventHelpers.emitTaskUpdated(taskId, updates, updatedTask);
            }
            
            this.app.uiManager.showToast('Task updated successfully', 'success');
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        try {
            let deletedTask;
            
            if (this.taskDataService.isAvailable()) {
                deletedTask = await this.taskDataService.getTask(taskId);
                await this.taskDataService.deleteTask(taskId);
            } else {
                // Fallback: remove from current tasks
                const taskIndex = this.currentTasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    deletedTask = this.currentTasks[taskIndex];
                    this.currentTasks.splice(taskIndex, 1);
                }
            }

            // Remove from indexes
            if (deletedTask) {
                this.taskIndexManager.removeTaskFromIndexes(deletedTask);
                
                // Remove from filtered tasks if present
                const filteredIndex = this.filteredTasks.findIndex(t => t.id === taskId);
                if (filteredIndex !== -1) {
                    this.filteredTasks.splice(filteredIndex, 1);
                }
                
                // Invalidate cache
                this.filterCache.invalidate();
                
                // Update display
                this.updateTaskManagementDisplay();
            }
            
            // Emit event
            if (window.TaskEventHelpers) {
                await window.TaskEventHelpers.emitTaskDeleted(taskId, deletedTask);
            }
            
            this.app.uiManager.showToast('Task deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    /**
     * Toggle task completion
     */
    async completeTask(taskId, completed) {
        try {
            const updates = { 
                completed: completed,
                completedAt: completed ? new Date().toISOString() : null
            };
            
            await this.updateTask(taskId, updates);
            
            // Emit completion event
            if (window.TaskEventHelpers) {
                await window.TaskEventHelpers.emitTaskCompleted(taskId, completed);
            }
            
            const message = completed ? 'Task completed!' : 'Task marked as incomplete';
            this.app.uiManager.showToast(message, 'success');
        } catch (error) {
            console.error('Error updating task completion:', error);
            throw error;
        }
    }
    
    /* ==============================================
       TASK LOADING AND PAGINATION
       ============================================== */
    
    /**
     * Load tasks for task management view - now with pagination
     */
    async loadTasksForManagement(reset = true) {
        try {
            console.log('🔄 Loading tasks for management view...');
            console.log('TaskDataService available:', this.taskDataService.isAvailable());
            
            if (reset) {
                // Reset pagination state
                this.taskPagination.lastDoc = null;
                this.taskPagination.hasMore = true;
                this.currentTasks = [];
            }
            
            if (this.taskDataService.isAvailable()) {
                // Load from TaskDataService with pagination
                await this.loadMoreTasks();
            } else {
                // TaskDataService not available
                console.log('⚠️ TaskDataService not available');
                this.currentTasks = [];
                this.taskPagination.hasMore = false;
            }
            
            // Build indexes after loading tasks
            this.taskIndexManager.buildIndexes(this.currentTasks);
            this.filterCache.invalidate();
            
            this.applyTaskFilters();
            console.log('✅ Task loading completed. Filtered tasks:', this.filteredTasks.length);
        } catch (error) {
            console.error('❌ Error loading tasks for management:', error);
            this.app.uiManager.showToast('Failed to load tasks', 'error');
        }
    }
    
    /**
     * Load more tasks with pagination
     */
    async loadMoreTasks() {
        if (!this.taskDataService.isAvailable() || !this.taskPagination.hasMore || this.taskPagination.loading) {
            return;
        }
        
        try {
            this.taskPagination.loading = true;
            console.log('📄 Loading more tasks...', { 
                lastDoc: this.taskPagination.lastDoc, 
                pageSize: this.taskPagination.pageSize 
            });
            
            // Get the current section filter
            const sectionFilter = this.activeFilters.section;
            
            let result;
            if (sectionFilter && sectionFilter !== 'all') {
                // Load tasks for specific section
                result = await this.taskDataService.getTasksBySectionPaginated(sectionFilter, {
                    limit: this.taskPagination.pageSize,
                    startAfterDoc: this.taskPagination.sectionPagination[sectionFilter]?.lastDoc || null
                });
                
                // Update section-specific pagination
                if (!this.taskPagination.sectionPagination[sectionFilter]) {
                    this.taskPagination.sectionPagination[sectionFilter] = {};
                }
                this.taskPagination.sectionPagination[sectionFilter].lastDoc = result.lastDoc;
                this.taskPagination.sectionPagination[sectionFilter].hasMore = result.hasMore;
            } else {
                // Load all tasks
                result = await this.taskDataService.getAllTasksPaginated({
                    limit: this.taskPagination.pageSize,
                    startAfterDoc: this.taskPagination.lastDoc,
                    orderByField: 'createdAt',
                    orderDirection: 'desc'
                });
                
                this.taskPagination.lastDoc = result.lastDoc;
                this.taskPagination.hasMore = result.hasMore;
            }
            
            // Add new tasks to current tasks
            this.currentTasks = [...this.currentTasks, ...result.tasks];
            console.log(`📊 Loaded ${result.tasks.length} new tasks. Total: ${this.currentTasks.length}`);
            
            // Update indexes for new tasks
            result.tasks.forEach(task => {
                this.taskIndexManager.addTaskToIndexes(task);
            });
            this.filterCache.invalidate();
            
            // Apply filters and update display
            this.applyTaskFilters();
            
            // Update load more button visibility
            this.updateLoadMoreButton();
            
        } catch (error) {
            console.error('❌ Error loading more tasks:', error);
            this.app.uiManager.showToast('Failed to load more tasks', 'error');
        } finally {
            this.taskPagination.loading = false;
        }
    }

    /**
     * Update load more button visibility and state
     */
    updateLoadMoreButton() {
        if (!this.app.elements.loadMoreButton) {
            // Create load more button if it doesn't exist
            const button = document.createElement('button');
            button.className = 'load-more-button';
            button.innerHTML = '<span class="material-icons">expand_more</span> Load More Tasks';
            this.app.addEventListener(button, 'click', () => this.loadMoreTasks());
            this.app.elements.loadMoreButton = button;
            
            // Add to the end of task sections container
            if (this.app.elements.taskSectionsContainer) {
                this.app.elements.taskSectionsContainer.appendChild(button);
            }
        }
        
        // Update button visibility and state
        const button = this.app.elements.loadMoreButton;
        const sectionFilter = this.activeFilters.section;
        
        // Determine if we have more to load based on current filter
        let hasMore = false;
        if (sectionFilter && sectionFilter !== 'all') {
            hasMore = this.taskPagination.sectionPagination[sectionFilter]?.hasMore || false;
        } else {
            hasMore = this.taskPagination.hasMore;
        }
        
        if (hasMore && this.filteredTasks.length > 0) {
            button.style.display = 'flex';
            button.disabled = this.taskPagination.loading;
            button.innerHTML = this.taskPagination.loading ? 
                '<span class="material-icons rotating">refresh</span> Loading...' : 
                '<span class="material-icons">expand_more</span> Load More Tasks';
        } else {
            button.style.display = 'none';
        }
    }
    
    /* ==============================================
       TASK FILTERING AND DISPLAY
       ============================================== */
    
    /**
     * Apply current filters to tasks using indexes and caching
     */
    applyTaskFilters() {
        // Check cache first
        if (!this.filterCache.hasFiltersChanged(this.activeFilters, this.searchQuery)) {
            this.filteredTasks = this.filterCache.lastResult;
            return;
        }
        
        const startTime = performance.now();
        
        // Get filtered task IDs using indexes
        const filteredIds = this.taskIndexManager.getFilteredTaskIds(this.activeFilters);
        
        // Apply search filter if needed
        const matchingIds = this.searchQuery
            ? this.taskIndexManager.searchTasks(this.searchQuery, filteredIds)
            : filteredIds;
        
        // Convert IDs back to tasks (single pass)
        this.filteredTasks = Array.from(matchingIds)
            .map(id => this.taskIndexManager.taskById.get(id))
            .filter(task => task != null);
        
        // Update cache
        this.filterCache.updateCache(this.activeFilters, this.searchQuery, this.filteredTasks);
        
        const endTime = performance.now();
        console.log(`✅ Filtering completed in ${(endTime - startTime).toFixed(2)}ms for ${matchingIds.size} tasks`);
    }

    /**
     * Handle task search with debouncing
     */
    handleTaskSearch(query) {
        // Update search query immediately for UI responsiveness
        this.searchQuery = query;
        
        // Clear existing debounce timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        // Show loading indicator for search
        if (query) {
            this.showSearchLoading();
        }
        
        // Debounce the actual filtering
        this.searchDebounceTimer = setTimeout(() => {
            this.applyTaskFilters();
            this.updateTaskManagementDisplay();
            this.hideSearchLoading();
        }, 300); // 300ms delay
    }
    
    /**
     * Handle filter change
     * @param {string} filterType - Type of filter (section, priority, completed)
     * @param {string} value - New filter value
     */
    async handleFilterChange(filterType, value) {
        // Update the filter
        this.activeFilters[filterType] = value;
        
        // Reset pagination when filter changes
        if (this.taskDataService.isAvailable()) {
            console.log(`📎 Filter changed: ${filterType} = ${value}, resetting pagination`);
            await this.loadTasksForManagement(true); // true = reset pagination
        } else {
            // No pagination with TaskParser, just apply filters
            this.applyTaskFilters();
            this.updateTaskManagementDisplay();
        }
    }

    /**
     * Update task management display
     */
    updateTaskManagementDisplay() {
        console.log('🖼️ Updating task management display...');
        if (!this.app.elements.taskSectionsContainer) {
            console.error('❌ taskSectionsContainer element not found!');
            return;
        }

        // Clean up existing section listeners before recreating
        const existingHeaders = this.app.elements.taskSectionsContainer
            .querySelectorAll('.section-header');
        
        existingHeaders.forEach(header => {
            if (header._listenerId) {
                this.app.listenerRegistry.remove(header._listenerId);
            }
        });

        // Group tasks by section
        const tasksBySection = this.groupTasksBySection(this.filteredTasks);
        console.log('📂 Display: Tasks grouped by section:', Object.keys(tasksBySection));
        
        // Check if there are any tasks
        if (this.filteredTasks.length === 0) {
            console.log('📭 No filtered tasks - showing empty state');
            this.app.elements.taskManagementEmpty.style.display = 'block';
            // Use DOM diff to clear efficiently
            if (window.domDiff) {
                window.domDiff.updateContainer(this.app.elements.taskSectionsContainer, [], () => null, () => '');
            }
            return;
        } else {
            this.app.elements.taskManagementEmpty.style.display = 'none';
        }

        // Prepare sections data for DOM diff
        const sectionOrder = ['todayTasks', 'upcomingTasks', 'dailyTasks', 'weeklyTasks', 'monthlyTasks', 'yearlyTasks', 'undatedTasks'];
        const sectionsToRender = [];
        
        sectionOrder.forEach(sectionKey => {
            const tasks = tasksBySection[sectionKey];
            if (tasks && tasks.length > 0) {
                sectionsToRender.push({ key: sectionKey, tasks });
            }
        });
        
        // Use DOM diff for efficient section rendering with performance tracking
        const renderStartTime = performance.now();
        if (window.domDiff) {
            window.domDiff.updateContainer(
                this.app.elements.taskSectionsContainer,
                sectionsToRender,
                (section) => this.createTaskSection(section.key, section.tasks),
                (section) => `section-${section.key}`
            );
        }
        const renderEndTime = performance.now();
        
        // Track render performance
        if (window.performanceMonitor) {
            window.performanceMonitor.recordMetric('task-management-render', renderEndTime - renderStartTime);
        }
        
        const totalTasks = sectionsToRender.reduce((sum, section) => sum + section.tasks.length, 0);
        console.log(`🎨 Task management rendered in ${(renderEndTime - renderStartTime).toFixed(2)}ms | Sections: ${sectionsToRender.length} | Tasks: ${totalTasks}`);
        
        // Update load more button
        this.updateLoadMoreButton();
    }

    /**
     * Group tasks by section
     */
    groupTasksBySection(tasks) {
        return tasks.reduce((sections, task) => {
            const section = task.section || 'undatedTasks';
            if (!sections[section]) {
                sections[section] = [];
            }
            sections[section].push(task);
            return sections;
        }, {});
    }

    /**
     * Create a collapsible task section
     */
    createTaskSection(sectionKey, tasks) {
        const sectionNames = {
            todayTasks: 'Today',
            upcomingTasks: 'Upcoming',
            dailyTasks: 'Daily Routine',
            weeklyTasks: 'Weekly',
            monthlyTasks: 'Monthly',
            yearlyTasks: 'Yearly',
            undatedTasks: 'Undated'
        };

        // Create section container
        const sectionElement = document.createElement('div');
        sectionElement.className = 'collapsible-section';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'section-header';
        header.dataset.section = sectionKey;
        
        // Create title
        const h3 = document.createElement('h3');
        h3.className = 'section-title';
        h3.textContent = sectionNames[sectionKey] || sectionKey;
        
        // Create count span
        const countSpan = document.createElement('span');
        countSpan.className = 'section-count';
        countSpan.textContent = tasks.length.toString();
        h3.appendChild(document.createTextNode(' '));
        h3.appendChild(countSpan);
        
        // Create toggle
        const toggle = document.createElement('span');
        toggle.className = 'section-toggle';
        toggle.textContent = '▼';
        
        // Assemble header
        header.appendChild(h3);
        header.appendChild(toggle);
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'section-content expanded';
        
        // Create task list container
        const taskListDiv = document.createElement('div');
        taskListDiv.className = 'section-task-list';
        taskListDiv.dataset.section = sectionKey;
        content.appendChild(taskListDiv);
        
        // Assemble section
        sectionElement.appendChild(header);
        sectionElement.appendChild(content);
        
        // Track the collapsible header listener
        const clickHandler = () => {
            content.classList.toggle('expanded');
            toggle.classList.toggle('expanded');
        };
        
        // Store listener ID on the element for later cleanup
        header._listenerId = this.app.addEventListener(header, 'click', clickHandler);

        // Render tasks in this section
        const taskListElement = sectionElement.querySelector('.section-task-list');
        
        // UIComponents should already be loaded when we get here
        if (!window.UIComponents) {
            console.error('UIComponents not loaded when creating task section');
            return sectionElement;
        }
        
        const taskListComponent = new UIComponents.TaskListComponent({
            tasks: tasks,
            onTaskClick: (taskId) => this.handleTaskClick(taskId),
            onTaskEdit: (taskId) => this.handleTaskEdit(taskId),
            onTaskDelete: (taskId) => this.handleTaskDelete(taskId),
            onTaskComplete: (taskId, completed) => this.handleTaskComplete(taskId, completed),
            showActions: true
        });

        taskListElement.appendChild(taskListComponent.render());
        
        // Store component reference for updates
        if (!this.app.components.taskSections) {
            this.app.components.taskSections = {};
        }
        this.app.components.taskSections[sectionKey] = taskListComponent;

        return sectionElement;
    }

    /**
     * Flatten task sections into a single array
     */
    flattenTaskSections(taskSections) {
        const allTasks = [];
        
        Object.entries(taskSections).forEach(([sectionName, tasks]) => {
            if (Array.isArray(tasks)) {
                tasks.forEach(task => {
                    allTasks.push({
                        ...task,
                        section: task.section || sectionName
                    });
                });
            }
        });
        
        return allTasks;
    }
    
    /* ==============================================
       TASK FORM HANDLING
       ============================================== */
    
    /**
     * Show task form for creating or editing
     */
    async showTaskForm(mode, task = null) {
        // Ensure UI Components are loaded
        await window.loadUIComponents();
        
        // Remove existing form if any
        if (this.app.components.taskForm) {
            this.app.components.taskForm.destroy();
        }

        this.app.components.taskForm = new UIComponents.TaskFormComponent({
            mode: mode,
            task: task,
            onSubmit: (taskData) => this.handleTaskFormSubmit(mode, taskData),
            onCancel: () => this.hideTaskForm()
        });

        document.body.appendChild(this.app.components.taskForm.render());
    }

    /**
     * Hide task form
     */
    hideTaskForm() {
        if (this.app.components.taskForm) {
            this.app.components.taskForm.destroy();
            this.app.components.taskForm = null;
        }
    }

    /**
     * Handle task form submission
     */
    async handleTaskFormSubmit(mode, taskData) {
        try {
            // Check if ValidationUtils is available
            if (!window.ValidationUtils) {
                console.error('ValidationUtils not available');
                this.app.uiManager.showToast('Validation system not loaded. Please refresh the page.', 'error');
                return;
            }

            // Validate task data
            const validation = window.ValidationUtils.validateTask(taskData);
            if (!validation.isValid) {
                const errorMessage = window.ValidationUtils.formatValidationErrors(validation.errors);
                this.app.uiManager.showToast(errorMessage, 'error');
                return;
            }

            // Sanitize task data
            const sanitizedData = window.ValidationUtils.sanitizeTaskData(taskData);

            // Parse natural language date if provided
            if (sanitizedData.date) {
                const dateResult = window.ValidationUtils.parseNaturalDate(sanitizedData.date);
                if (dateResult.isValid) {
                    sanitizedData.date = dateResult.formatted;
                } else {
                    this.app.uiManager.showToast(dateResult.error, 'error');
                    return;
                }
            }

            if (mode === 'create') {
                await this.createTask(sanitizedData);
            } else {
                await this.updateTask(sanitizedData.id, sanitizedData);
            }

            this.hideTaskForm();
        } catch (error) {
            console.error('Error submitting task form:', error);
            this.app.uiManager.showToast('Failed to save task', 'error');
        }
    }
    
    /* ==============================================
       TASK EVENT HANDLERS
       ============================================== */
    
    /**
     * Handle task click
     */
    handleTaskClick(taskId) {
        const task = this.currentTasks.find(t => t.id === taskId);
        if (task) {
            // Show task details or quick actions
            console.log('Task clicked:', task);
        }
    }

    /**
     * Handle task edit
     */
    handleTaskEdit(taskId) {
        const task = this.currentTasks.find(t => t.id === taskId);
        if (task) {
            this.showTaskForm('edit', task);
        }
    }

    /**
     * Handle task delete
     */
    async handleTaskDelete(taskId) {
        await this.deleteTask(taskId);
    }

    /**
     * Handle task completion toggle
     */
    async handleTaskComplete(taskId, completed) {
        await this.completeTask(taskId, completed);
    }

    /**
     * Handle task created event
     */
    handleTaskCreated(task) {
        console.log('Task created event received:', task);
        // Add task to current list if not already there
        if (!this.currentTasks.find(t => t.id === task.id)) {
            this.currentTasks.push(task);
        }
        
        // Refresh filters and display
        this.applyTaskFilters();
        this.updateTaskManagementDisplay();
    }

    /**
     * Handle task updated event
     */
    handleTaskUpdated(taskId, updates) {
        console.log('Task updated event received:', taskId, updates);
        // Update task in current list
        const taskIndex = this.currentTasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.currentTasks[taskIndex] = { ...this.currentTasks[taskIndex], ...updates };
        }
        
        // Refresh filters and display
        this.applyTaskFilters();
        this.updateTaskManagementDisplay();
    }

    /**
     * Handle task deleted event
     */
    handleTaskDeleted(taskId) {
        console.log('Task deleted event received:', taskId);
        // Remove task from current list
        const taskIndex = this.currentTasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.currentTasks.splice(taskIndex, 1);
        }
        
        // Refresh filters and display
        this.applyTaskFilters();
        this.updateTaskManagementDisplay();
    }

    /**
     * Handle task completed event
     */
    handleTaskCompleted(taskId, completed) {
        // Update task in current list
        const task = this.currentTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            task.completedAt = completed ? new Date().toISOString() : null;
        }
        
        this.applyTaskFilters();
        this.updateTaskManagementDisplay();
    }
    
    /* ==============================================
       UTILITY METHODS
       ============================================== */
    
    /**
     * Generate a simple task ID
     */
    generateTaskId() {
        return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if task matches current filters
     */
    taskMatchesCurrentFilters(task) {
        // Section filter
        if (this.activeFilters.section !== 'all' && 
            task.section !== this.activeFilters.section) {
            return false;
        }
        
        // Priority filter
        if (this.activeFilters.priority !== 'all' && 
            task.priority !== this.activeFilters.priority) {
            return false;
        }
        
        // Completion filter
        if (this.activeFilters.completed !== 'all') {
            const showCompleted = this.activeFilters.completed === 'completed';
            if (!!task.completed !== showCompleted) {
                return false;
            }
        }
        
        // Search filter
        if (this.searchQuery) {
            const taskTokens = this.taskIndexManager.searchTokens.get(task.id);
            const queryTokens = this.taskIndexManager.tokenizeText(this.searchQuery);
            
            // Check if all query tokens are found in task tokens
            return queryTokens.every(queryToken => 
                taskTokens.some(taskToken => taskToken.startsWith(queryToken))
            );
        }
        
        return true;
    }

    /**
     * Show search loading indicator
     */
    showSearchLoading() {
        // Add loading class to search bar
        const searchBar = document.querySelector('.search-bar-component');
        if (searchBar) {
            searchBar.classList.add('searching');
        }
        
        // Update search input to show spinner
        const searchInput = searchBar?.querySelector('.search-input');
        if (searchInput) {
            searchInput.classList.add('loading');
        }
    }

    /**
     * Hide search loading indicator
     */
    hideSearchLoading() {
        const searchBar = document.querySelector('.search-bar-component');
        if (searchBar) {
            searchBar.classList.remove('searching');
        }
        
        const searchInput = searchBar?.querySelector('.search-input');
        if (searchInput) {
            searchInput.classList.remove('loading');
        }
    }

    /**
     * Show floating action button
     */
    showFloatingActionButton() {
        if (this.app.components.floatingActionButton) {
            document.body.appendChild(this.app.components.floatingActionButton.render());
        }
    }

    /**
     * Hide floating action button
     */
    hideFloatingActionButton() {
        if (this.app.components.floatingActionButton?.element) {
            this.app.components.floatingActionButton.element.remove();
        }
    }
}