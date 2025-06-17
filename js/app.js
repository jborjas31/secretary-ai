/**
 * Main Application Controller for Secretary AI
 * Coordinates all services and manages the user interface
 */

class SecretaryApp {
    constructor() {
        // Initialize services
        this.taskParser = new TaskParser();
        this.llmService = new LLMService();
        this.firestoreService = new FirestoreService();
        this.storageService = new StorageService();
        this.taskDataService = new TaskDataService();
        this.scheduleDataService = new ScheduleDataService();
        
        // App state
        this.currentSchedule = null;
        this.isOnline = navigator.onLine;
        this.refreshInterval = null;
        this.lastRefresh = null;
        this.settings = null;
        
        // Task management state
        this.viewMode = 'schedule'; // 'schedule' or 'manage'
        this.currentTasks = [];
        this.filteredTasks = [];
        this.searchQuery = '';
        this.activeFilters = {
            section: 'all',
            priority: 'all',
            completed: 'all'
        };
        
        // UI elements (will be initialized in initializeUI)
        this.elements = {};
        
        // UI components for task management
        this.components = {
            searchBar: null,
            floatingActionButton: null,
            taskForm: null,
            taskSections: {}
        };
        
        // Bind methods
        this.refreshSchedule = this.refreshSchedule.bind(this);
        this.toggleViewMode = this.toggleViewMode.bind(this);
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Secretary AI...');
            
            // Initialize UI
            this.initializeUI();
            
            // Load settings
            await this.loadSettings();
            
            // Initialize services
            await this.initializeServices();
            
            // Load initial data
            await this.loadInitialData();
            
            // Set up auto-refresh
            this.setupAutoRefresh();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update UI
            this.updateUI();
            
            console.log('✅ Secretary AI initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Secretary AI:', error);
            this.showError('Failed to initialize the application', error);
        }
    }

    /**
     * Initialize UI elements and get references
     */
    initializeUI() {
        this.elements = {
            // Existing elements
            currentTime: document.getElementById('currentTime'),
            refreshBtn: document.getElementById('refreshBtn'),
            status: document.getElementById('status'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            scheduleMeta: document.getElementById('scheduleMeta'),
            taskList: document.getElementById('taskList'),
            emptyState: document.getElementById('emptyState'),
            lastUpdated: document.getElementById('lastUpdated'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            modalClose: document.getElementById('modalClose'),
            openrouterKey: document.getElementById('openrouterKey'),
            modelSelect: document.getElementById('modelSelect'),
            refreshInterval: document.getElementById('refreshInterval'),
            saveSettings: document.getElementById('saveSettings'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            
            // New task management elements
            viewToggleBtn: document.getElementById('viewToggleBtn'),
            scheduleView: document.getElementById('scheduleView'),
            taskManagementView: document.getElementById('taskManagementView'),
            searchBarContainer: document.getElementById('searchBarContainer'),
            filterControlsContainer: document.getElementById('filterControlsContainer'),
            taskSectionsContainer: document.getElementById('taskSectionsContainer'),
            taskManagementEmpty: document.getElementById('taskManagementEmpty')
        };

        // Update current time
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 30000); // Update every 30 seconds
        
        // Initialize task management components
        this.initializeTaskManagementComponents();
    }

    /**
     * Initialize all services
     */
    async initializeServices() {
        // Connect storage service to Firestore
        this.storageService.setFirestoreService(this.firestoreService);

        // Initialize Firestore if configured
        if (Config.shouldEnableFirestore()) {
            try {
                await this.firestoreService.initialize(Config.getFirebaseConfig());
                console.log('✅ Firestore initialized');
                
                // Initialize new data services
                this.taskDataService.initialize(this.firestoreService);
                this.scheduleDataService.initialize(this.firestoreService, this.storageService);
                
                // Connect new services to StorageService
                this.storageService.setTaskDataService(this.taskDataService);
                this.storageService.setScheduleDataService(this.scheduleDataService);
                
                console.log('✅ Enhanced data services initialized');
                
                // Test migration on first run
                await this.testTaskMigration();
                
            } catch (error) {
                console.warn('⚠️ Firestore initialization failed:', error);
            }
        }

        // Configure LLM service
        if (this.settings && this.settings.openrouterApiKey) {
            this.llmService.setApiKey(this.settings.openrouterApiKey);
        }
        
        // Set selected model
        if (this.settings && this.settings.selectedModel) {
            this.llmService.setModel(this.settings.selectedModel);
        }
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            this.settings = await this.storageService.loadSettings();
            console.log('Settings loaded:', this.settings);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = {
                openrouterApiKey: '',
                selectedModel: 'anthropic/claude-3.5-sonnet',
                refreshInterval: 30,
                notifications: true,
                theme: 'light'
            };
        }
    }

    /**
     * Load initial data and generate schedule
     */
    async loadInitialData() {
        this.setStatus('loading', 'Loading your tasks...');
        
        try {
            // Try to load today's schedule from cache first
            const today = new Date().toISOString().split('T')[0];
            const cachedSchedule = await this.storageService.loadSchedule(today);
            
            if (cachedSchedule && this.isScheduleRecent(cachedSchedule)) {
                console.log('Using cached schedule');
                this.currentSchedule = cachedSchedule;
                this.setStatus('online', 'Schedule loaded from cache');
                return;
            }

            // Generate new schedule
            await this.generateSchedule();
        } catch (error) {
            console.error('Error loading initial data:', error);
            
            // Try to show mock data in development
            if (Config.shouldUseMockData()) {
                console.log('Using mock data');
                this.currentSchedule = MOCK_DATA.schedule;
                this.setStatus('offline', 'Using sample data (development mode)');
            } else {
                this.setStatus('offline', 'Failed to load schedule');
                this.showError('Failed to load your schedule', error);
            }
        }
    }

    /**
     * Generate a new schedule using LLM
     */
    async generateSchedule() {
        this.setStatus('loading', 'Generating your schedule...');
        this.showLoading(true);

        try {
            // Parse tasks
            const tasks = await this.taskParser.loadAndParseTasks();
            const relevantTasks = this.taskParser.formatTasksForLLM(tasks);

            if (relevantTasks.length === 0) {
                this.setStatus('online', 'No tasks found');
                this.currentSchedule = {
                    schedule: [],
                    summary: 'No tasks available for scheduling.',
                    generatedAt: new Date().toISOString(),
                    empty: true
                };
                return;
            }

            // Generate schedule with LLM
            if (this.llmService.isConfigured()) {
                this.currentSchedule = await this.llmService.generateDailySchedule(relevantTasks);
                
                // Save to storage
                const today = new Date().toISOString().split('T')[0];
                await this.storageService.saveSchedule(today, this.currentSchedule);
                
                this.setStatus('online', 'Schedule generated successfully');
            } else {
                // Use fallback scheduling
                this.currentSchedule = this.llmService.createFallbackSchedule(relevantTasks, new Date());
                this.setStatus('offline', 'OpenRouter API not configured - using basic scheduling');
            }

            this.lastRefresh = new Date();
        } catch (error) {
            console.error('Error generating schedule:', error);
            this.setStatus('offline', 'Failed to generate schedule');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Check if schedule is recent enough to use
     */
    isScheduleRecent(schedule) {
        if (!schedule.generatedAt) return false;
        
        const generated = new Date(schedule.generatedAt);
        const now = new Date();
        const diffMinutes = (now - generated) / (1000 * 60);
        
        // Consider schedule recent if less than refresh interval
        return diffMinutes < (this.settings.refreshInterval || 30);
    }

    /**
     * Refresh the schedule
     */
    async refreshSchedule() {
        if (!this.isOnline && !Config.shouldUseMockData()) {
            this.showToast('Offline - cannot refresh schedule', 'warning');
            return;
        }

        try {
            await this.generateSchedule();
            this.updateUI();
            this.showToast('Schedule refreshed', 'success');
        } catch (error) {
            this.showToast('Failed to refresh schedule', 'error');
        }
    }

    /**
     * Set up automatic refresh
     */
    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        const intervalMinutes = this.settings.refreshInterval || 30;
        if (intervalMinutes > 0) {
            this.refreshInterval = setInterval(this.refreshSchedule, intervalMinutes * 60 * 1000);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Refresh button
        this.elements.refreshBtn.addEventListener('click', this.refreshSchedule);

        // View toggle button
        this.elements.viewToggleBtn.addEventListener('click', this.toggleViewMode);

        // Settings modal
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.modalClose.addEventListener('click', () => this.closeSettings());
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());

        // Close modal on backdrop click
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });

        // Network status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.setStatus('online', 'Back online');
            this.storageService.syncPendingData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.setStatus('offline', 'Offline mode');
        });

        // Service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SYNC_TASKS') {
                    this.storageService.syncPendingData();
                }
            });
        }
    }

    /**
     * Update the main UI
     */
    updateUI() {
        if (this.viewMode === 'schedule') {
            this.updateScheduleDisplay();
        } else {
            this.updateTaskManagementDisplay();
        }
        this.updateLastUpdated();
        this.updateStatus();
    }

    /**
     * Update schedule display
     */
    updateScheduleDisplay() {
        if (!this.currentSchedule) {
            this.elements.emptyState.style.display = 'block';
            this.elements.taskList.innerHTML = '';
            return;
        }

        const schedule = this.currentSchedule.schedule || [];
        
        if (schedule.length === 0) {
            this.elements.emptyState.style.display = 'block';
            this.elements.taskList.innerHTML = '';
            this.elements.scheduleMeta.textContent = 'No tasks scheduled';
            return;
        }

        this.elements.emptyState.style.display = 'none';
        
        // Update meta info (sanitized)
        if (this.currentSchedule.summary) {
            this.elements.scheduleMeta.textContent = this.currentSchedule.summary;
        }

        // Filter tasks based on current time
        const now = new Date();
        const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                              now.getMinutes().toString().padStart(2, '0');
        
        const upcomingTasks = schedule.filter(task => {
            // Convert time strings to minutes since midnight
            const timeToMinutes = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };
            
            const currentMinutes = timeToMinutes(currentTimeStr);
            const taskMinutes = timeToMinutes(task.time);
            
            return taskMinutes >= currentMinutes;
        });

        // Render tasks
        this.elements.taskList.innerHTML = upcomingTasks.map(task => 
            this.renderTaskItem(task)
        ).join('');

        // Update meta with remaining tasks count
        if (upcomingTasks.length !== schedule.length) {
            this.elements.scheduleMeta.textContent += 
                ` • Showing ${upcomingTasks.length} of ${schedule.length} tasks remaining today`;
        }
    }

    /**
     * Sanitize HTML to prevent XSS attacks
     */
    sanitizeHtml(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /**
     * Render a single task item
     */
    renderTaskItem(task) {
        const categoryClass = task.category ? `task-category ${task.category}` : 'task-category';
        const priorityIndicator = task.priority === 'high' ? '🔴' : 
                                 task.priority === 'low' ? '🟡' : '🟠';

        // Sanitize all user content to prevent XSS
        const sanitizedTask = this.sanitizeHtml(task.task || '');
        const sanitizedTime = this.sanitizeHtml(task.time || '');
        const sanitizedDuration = this.sanitizeHtml(task.duration || '');
        const sanitizedCategory = this.sanitizeHtml(task.category || 'task');

        return `
            <div class="task-item">
                <div class="task-time">${sanitizedTime}</div>
                <div class="task-content">
                    <div class="task-title">${priorityIndicator} ${sanitizedTask}</div>
                    <div class="task-details">
                        Duration: ${sanitizedDuration}
                        <span class="${categoryClass}">${sanitizedCategory}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update current time display
     */
    updateCurrentTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        this.elements.currentTime.textContent = timeStr;
    }

    /**
     * Update last updated display
     */
    updateLastUpdated() {
        if (this.lastRefresh) {
            const timeStr = this.lastRefresh.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit'
            });
            this.elements.lastUpdated.textContent = `Last updated: ${timeStr}`;
        }
    }

    /**
     * Set status indicator
     */
    setStatus(type, message) {
        this.elements.status.className = `status ${type}`;
        this.elements.statusText.textContent = message;
    }

    /**
     * Update status based on current state
     */
    updateStatus() {
        if (!this.isOnline) {
            this.setStatus('offline', 'Offline mode');
        } else if (this.llmService.isConfigured()) {
            this.setStatus('online', 'Connected');
        } else {
            this.setStatus('offline', 'OpenRouter API not configured');
        }
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    /**
     * Open settings modal
     */
    openSettings() {
        // Populate current settings
        if (this.settings) {
            this.elements.openrouterKey.value = this.settings.openrouterApiKey || '';
            this.elements.modelSelect.value = this.settings.selectedModel || 'anthropic/claude-3.5-sonnet';
            this.elements.refreshInterval.value = this.settings.refreshInterval || 30;
        }
        
        this.elements.settingsModal.style.display = 'flex';
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        this.elements.settingsModal.style.display = 'none';
    }

    /**
     * Save settings
     */
    async saveSettings() {
        try {
            const newSettings = {
                openrouterApiKey: this.elements.openrouterKey.value.trim(),
                selectedModel: this.elements.modelSelect.value,
                refreshInterval: parseInt(this.elements.refreshInterval.value) || 30,
                notifications: true,
                theme: 'light'
            };

            // Save to storage
            await this.storageService.saveSettings(newSettings);
            this.settings = newSettings;

            // Update LLM service
            this.llmService.setApiKey(newSettings.openrouterApiKey);
            this.llmService.setModel(newSettings.selectedModel);

            // Update auto-refresh
            this.setupAutoRefresh();

            // Close modal
            this.closeSettings();

            // Update status
            this.updateStatus();

            this.showToast('Settings saved', 'success');

            // Refresh schedule if API key was added
            if (newSettings.openrouterApiKey && !this.currentSchedule) {
                await this.refreshSchedule();
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Show error message
     */
    showError(message, error) {
        console.error(message, error);
        this.showToast(message, 'error');
    }

    /**
     * Test task migration and verify Phase 1 implementation
     */
    async testTaskMigration() {
        try {
            console.log('🧪 Testing Phase 1 migration...');
            
            // Check if TaskDataService is available
            if (!this.taskDataService.isAvailable()) {
                console.log('⚠️ TaskDataService not available - skipping migration test');
                return;
            }

            // Check current migration status
            const migrationStatus = await this.taskParser.checkMigrationStatus(this.taskDataService);
            console.log('Migration Status:', migrationStatus);

            if (!migrationStatus.migrated && migrationStatus.available) {
                console.log('🔄 Starting initial task migration...');
                
                // Perform migration using StorageService helper
                const migrationResult = await this.storageService.performTaskMigration(this.taskParser);
                
                if (migrationResult.migrated) {
                    console.log('✅ Migration completed successfully!');
                    console.log(`📊 Migrated ${migrationResult.taskCount || migrationResult.migrated} tasks`);
                    
                    // Verify migration by loading tasks from Firestore
                    await this.verifyMigration();
                } else {
                    console.log('⚠️ Migration failed or was skipped:', migrationResult.reason || migrationResult.error);
                }
            } else if (migrationStatus.migrated) {
                console.log(`✅ Migration already completed - ${migrationStatus.taskCount} tasks in Firestore`);
                
                // Still verify the system is working
                await this.verifyMigration();
            }

            // Test backward compatibility
            await this.testBackwardCompatibility();

        } catch (error) {
            console.error('❌ Error during migration test:', error);
        }
    }

    /**
     * Verify migration was successful
     */
    async verifyMigration() {
        try {
            console.log('🔍 Verifying migration...');

            // Test TaskDataService
            const allTasks = await this.taskDataService.getAllTasks();
            console.log(`📋 Found ${allTasks.length} tasks in Firestore`);

            // Test task retrieval by section
            const todayTasks = await this.taskDataService.getTasksBySection('todayTasks');
            const upcomingTasks = await this.taskDataService.getTasksBySection('upcomingTasks');
            const undatedTasks = await this.taskDataService.getTasksBySection('undatedTasks');
            
            console.log(`📅 Task distribution:`, {
                today: todayTasks.length,
                upcoming: upcomingTasks.length,
                undated: undatedTasks.length,
                total: allTasks.length
            });

            // Test export functionality
            const exportedTasks = await this.taskDataService.exportToTaskParserFormat();
            console.log('📤 Export test successful - tasks structured for TaskParser');

            // Test markdown export
            const markdownContent = await this.taskParser.exportToMarkdown(this.taskDataService);
            if (markdownContent) {
                console.log('📝 Markdown export test successful');
                console.log(`📏 Generated ${markdownContent.length} characters of markdown`);
            }

            console.log('✅ Migration verification completed successfully');
            return true;
        } catch (error) {
            console.error('❌ Migration verification failed:', error);
            return false;
        }
    }

    /**
     * Test backward compatibility
     */
    async testBackwardCompatibility() {
        try {
            console.log('🔄 Testing backward compatibility...');

            // Test that TaskParser still works with tasks.md
            const originalTasks = await this.taskParser.loadAndParseTasks();
            console.log('📖 Original TaskParser still works - loaded tasks from tasks.md');

            // Test that LLMService still receives the expected format
            const formattedTasks = this.taskParser.formatTasksForLLM(originalTasks);
            console.log(`🤖 LLM format compatibility confirmed - ${formattedTasks.length} tasks formatted`);

            // Test that StorageService still handles schedule saving
            const testSchedule = {
                schedule: [
                    {
                        time: "14:00",
                        task: "Test backward compatibility",
                        duration: "10 minutes",
                        priority: "high",
                        category: "test"
                    }
                ],
                summary: "Test schedule for backward compatibility verification",
                generatedAt: new Date().toISOString(),
                mock: true
            };

            const testDate = new Date().toISOString().split('T')[0];
            await this.storageService.saveSchedule(testDate + '-test', testSchedule);
            console.log('💾 Schedule saving compatibility confirmed');

            // Test enhanced schedule saving if available
            if (this.scheduleDataService.isAvailable()) {
                await this.storageService.saveScheduleWithHistory(testDate + '-enhanced-test', testSchedule);
                console.log('📈 Enhanced schedule saving confirmed');
            }

            console.log('✅ Backward compatibility verified successfully');
            return true;
        } catch (error) {
            console.error('❌ Backward compatibility test failed:', error);
            return false;
        }
    }

    /* ==============================================
       TASK MANAGEMENT METHODS (Phase 2)
       ============================================== */

    /**
     * Initialize task management UI components
     */
    initializeTaskManagementComponents() {
        // Initialize search bar
        if (this.elements.searchBarContainer) {
            this.components.searchBar = new UIComponents.SearchBarComponent({
                placeholder: 'Search tasks...',
                onSearch: (query) => this.handleTaskSearch(query)
            });
            this.elements.searchBarContainer.appendChild(this.components.searchBar.render());
        }

        // Initialize floating action button
        this.components.floatingActionButton = new UIComponents.FloatingActionButton({
            icon: '+',
            label: 'Add Task',
            onClick: () => this.showTaskForm('create')
        });
        
        // Initialize task event listeners
        this.setupTaskEventListeners();
    }

    /**
     * Set up task management event listeners
     */
    setupTaskEventListeners() {
        // Subscribe to task events
        globalEventManager.on(TaskEvents.TASK_CREATED, (data) => {
            this.handleTaskCreated(data.task);
        });

        globalEventManager.on(TaskEvents.TASK_UPDATED, (data) => {
            this.handleTaskUpdated(data.taskId, data.updates);
        });

        globalEventManager.on(TaskEvents.TASK_DELETED, (data) => {
            this.handleTaskDeleted(data.taskId);
        });

        globalEventManager.on(TaskEvents.TASK_COMPLETED, (data) => {
            this.handleTaskCompleted(data.taskId, data.completed);
        });
    }

    /**
     * Toggle between schedule and task management views
     */
    toggleViewMode() {
        this.viewMode = this.viewMode === 'schedule' ? 'manage' : 'schedule';
        
        // Update UI elements visibility
        if (this.viewMode === 'schedule') {
            this.elements.scheduleView.style.display = 'block';
            this.elements.taskManagementView.style.display = 'none';
            this.elements.viewToggleBtn.classList.remove('active');
            this.elements.viewToggleBtn.title = 'Switch to Task Management';
            
            // Remove floating action button
            if (this.components.floatingActionButton?.element) {
                this.components.floatingActionButton.element.remove();
            }
        } else {
            this.elements.scheduleView.style.display = 'none';
            this.elements.taskManagementView.style.display = 'block';
            this.elements.viewToggleBtn.classList.add('active');
            this.elements.viewToggleBtn.title = 'Switch to Schedule View';
            
            // Add floating action button
            if (this.components.floatingActionButton) {
                document.body.appendChild(this.components.floatingActionButton.render());
            }
            
            // Load tasks for management view
            this.loadTasksForManagement();
        }
        
        this.updateUI();
    }

    /**
     * Load tasks for task management view
     */
    async loadTasksForManagement() {
        try {
            if (this.taskDataService.isAvailable()) {
                // Load from TaskDataService (Phase 1)
                this.currentTasks = await this.taskDataService.getAllTasks();
            } else {
                // Fallback to TaskParser
                const parsedTasks = await this.taskParser.getCachedTasks();
                this.currentTasks = this.flattenTaskSections(parsedTasks);
            }
            
            this.applyTaskFilters();
        } catch (error) {
            console.error('Error loading tasks for management:', error);
            this.showToast('Failed to load tasks', 'error');
        }
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

    /**
     * Update task management display
     */
    updateTaskManagementDisplay() {
        if (!this.elements.taskSectionsContainer) return;

        // Group tasks by section
        const tasksBySection = this.groupTasksBySection(this.filteredTasks);
        
        // Clear existing content
        this.elements.taskSectionsContainer.innerHTML = '';
        
        // Check if there are any tasks
        if (this.filteredTasks.length === 0) {
            this.elements.taskManagementEmpty.style.display = 'block';
            return;
        } else {
            this.elements.taskManagementEmpty.style.display = 'none';
        }

        // Render each section
        const sectionOrder = ['todayTasks', 'upcomingTasks', 'dailyTasks', 'weeklyTasks', 'monthlyTasks', 'yearlyTasks', 'undatedTasks'];
        
        sectionOrder.forEach(sectionKey => {
            const tasks = tasksBySection[sectionKey];
            if (tasks && tasks.length > 0) {
                const sectionElement = this.createTaskSection(sectionKey, tasks);
                this.elements.taskSectionsContainer.appendChild(sectionElement);
            }
        });
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

        const sectionElement = document.createElement('div');
        sectionElement.className = 'collapsible-section';
        sectionElement.innerHTML = `
            <div class="section-header" data-section="${sectionKey}">
                <h3 class="section-title">
                    ${sectionNames[sectionKey] || sectionKey}
                    <span class="section-count">${tasks.length}</span>
                </h3>
                <span class="section-toggle">▼</span>
            </div>
            <div class="section-content expanded">
                <div class="section-task-list" data-section="${sectionKey}"></div>
            </div>
        `;

        // Add click handler for collapsible header
        const header = sectionElement.querySelector('.section-header');
        const content = sectionElement.querySelector('.section-content');
        const toggle = sectionElement.querySelector('.section-toggle');
        
        header.addEventListener('click', () => {
            content.classList.toggle('expanded');
            toggle.classList.toggle('expanded');
        });

        // Render tasks in this section
        const taskListElement = sectionElement.querySelector('.section-task-list');
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
        this.components.taskSections[sectionKey] = taskListComponent;

        return sectionElement;
    }

    /**
     * Apply current filters to tasks
     */
    applyTaskFilters() {
        let filtered = [...this.currentTasks];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(task => 
                task.text.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }

        // Apply section filter
        if (this.activeFilters.section !== 'all') {
            filtered = filtered.filter(task => task.section === this.activeFilters.section);
        }

        // Apply priority filter
        if (this.activeFilters.priority !== 'all') {
            filtered = filtered.filter(task => task.priority === this.activeFilters.priority);
        }

        // Apply completion filter
        if (this.activeFilters.completed !== 'all') {
            const showCompleted = this.activeFilters.completed === 'completed';
            filtered = filtered.filter(task => !!task.completed === showCompleted);
        }

        this.filteredTasks = filtered;
    }

    /**
     * Handle task search
     */
    handleTaskSearch(query) {
        this.searchQuery = query;
        this.applyTaskFilters();
        this.updateTaskManagementDisplay();
    }

    /**
     * Show task form for creating or editing
     */
    showTaskForm(mode, task = null) {
        // Remove existing form if any
        if (this.components.taskForm) {
            this.components.taskForm.destroy();
        }

        this.components.taskForm = new UIComponents.TaskFormComponent({
            mode: mode,
            task: task,
            onSubmit: (taskData) => this.handleTaskFormSubmit(mode, taskData),
            onCancel: () => this.hideTaskForm()
        });

        document.body.appendChild(this.components.taskForm.render());
    }

    /**
     * Hide task form
     */
    hideTaskForm() {
        if (this.components.taskForm) {
            this.components.taskForm.destroy();
            this.components.taskForm = null;
        }
    }

    /**
     * Handle task form submission
     */
    async handleTaskFormSubmit(mode, taskData) {
        try {
            // Validate task data
            const validation = ValidationUtils.validateTask(taskData);
            if (!validation.isValid) {
                const errorMessage = ValidationUtils.formatValidationErrors(validation.errors);
                this.showToast(errorMessage, 'error');
                return;
            }

            // Sanitize task data
            const sanitizedData = ValidationUtils.sanitizeTaskData(taskData);

            // Parse natural language date if provided
            if (sanitizedData.date) {
                const dateResult = ValidationUtils.parseNaturalDate(sanitizedData.date);
                if (dateResult.isValid) {
                    sanitizedData.date = dateResult.formatted;
                } else {
                    this.showToast(dateResult.error, 'error');
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
            this.showToast('Failed to save task', 'error');
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
                // Fallback: add to current tasks and save via TaskParser
                newTask = {
                    id: this.generateTaskId(),
                    ...taskData,
                    createdAt: new Date().toISOString()
                };
                this.currentTasks.push(newTask);
            }

            // Emit event
            await TaskEventHelpers.emitTaskCreated(newTask);
            
            this.showToast('Task created successfully', 'success');
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

            // Emit event
            await TaskEventHelpers.emitTaskUpdated(taskId, updates, updatedTask);
            
            this.showToast('Task updated successfully', 'success');
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

            // Emit event
            await TaskEventHelpers.emitTaskDeleted(taskId, deletedTask);
            
            this.showToast('Task deleted successfully', 'success');
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
            await TaskEventHelpers.emitTaskCompleted(taskId, completed);
            
            const message = completed ? 'Task completed!' : 'Task marked as incomplete';
            this.showToast(message, 'success');
        } catch (error) {
            console.error('Error updating task completion:', error);
            throw error;
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
        // Refresh task list
        this.loadTasksForManagement();
        this.updateTaskManagementDisplay();
    }

    /**
     * Handle task updated event
     */
    handleTaskUpdated(taskId, updates) {
        // Refresh task list
        this.loadTasksForManagement();
        this.updateTaskManagementDisplay();
    }

    /**
     * Handle task deleted event
     */
    handleTaskDeleted(taskId) {
        // Refresh task list
        this.loadTasksForManagement();
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

    /**
     * Generate a simple task ID
     */
    generateTaskId() {
        return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get comprehensive system status for debugging
     */
    getSystemStatus() {
        return {
            app: {
                initialized: true,
                online: this.isOnline,
                hasSchedule: !!this.currentSchedule
            },
            services: {
                taskParser: !!this.taskParser,
                llmService: !!this.llmService,
                firestoreService: this.firestoreService?.isAvailable() || false,
                storageService: !!this.storageService,
                taskDataService: this.taskDataService?.isAvailable() || false,
                scheduleDataService: this.scheduleDataService?.isAvailable() || false
            },
            storage: this.storageService?.getComprehensiveSyncStatus(),
            settings: this.settings
        };
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SecretaryApp();
    window.app.initialize();
});

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);