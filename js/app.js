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
        this.migrationInProgress = false;
        
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
            
            // Check required dependencies
            if (!window.ValidationUtils) {
                throw new Error('ValidationUtils not loaded. Please refresh the page.');
            }
            
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
            
            // Clean up any API keys from Firestore (security fix)
            this.cleanupApiKeysFromFirestore().catch(error => {
                console.error('Failed to cleanup API keys:', error);
            });
            
            // Run deduplication to clean up any duplicate tasks
            this.deduplicateTasksOnStartup().catch(error => {
                console.error('Failed to deduplicate tasks:', error);
            });
            
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
            
            // Model badge elements
            modelBadge: document.getElementById('modelBadge'),
            modelName: document.getElementById('modelName'),
            
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
        
        // Update model badge display
        this.updateModelBadge();
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
                selectedModel: 'deepseek/deepseek-r1',
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
            // Always load and cache tasks for Task Management view
            await this.taskParser.loadAndParseTasks();
            console.log('Tasks loaded and cached for Task Management');
            
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

        // Model badge click to open settings
        this.elements.modelBadge.addEventListener('click', () => this.openSettings());

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
     * Update model badge display
     */
    updateModelBadge() {
        if (this.elements.modelName && this.llmService) {
            const displayName = this.llmService.getModelDisplayName();
            this.elements.modelName.textContent = displayName;
        }
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
            this.elements.modelSelect.value = this.settings.selectedModel || 'deepseek/deepseek-r1';
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
            
            // Update model badge display
            this.updateModelBadge();

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
     * Check if migration is needed based on timestamps
     */
    async isMigrationNeeded() {
        try {
            // Get last migration timestamp from localStorage
            const lastMigration = localStorage.getItem('lastTaskMigrationTimestamp');
            
            // Check if we have any tasks in Firestore
            const migrationStatus = await this.taskParser.checkMigrationStatus(this.taskDataService);
            
            // Only migrate if:
            // 1. Never migrated before AND
            // 2. Firestore has NO tasks at all
            if (!lastMigration && migrationStatus.taskCount === 0) {
                console.log('First-time migration needed - no tasks in Firestore');
                return true;
            }
            
            // If we have any tasks in Firestore, don't migrate
            // This prevents re-migration even if tasks.md has new items
            if (migrationStatus.taskCount > 0) {
                return false;
            }
            
            // Migration is not needed if we've already migrated
            return false;
        } catch (error) {
            console.error('Error checking migration status:', error);
            // If there's an error, assume migration is NOT needed to prevent duplicates
            return false;
        }
    }

    /**
     * Test task migration and verify Phase 1 implementation
     */
    async testTaskMigration() {
        try {
            // Check if TaskDataService is available
            if (!this.taskDataService.isAvailable()) {
                console.log('⚠️ TaskDataService not available - skipping migration');
                return;
            }

            // Check if migration is already in progress
            if (this.migrationInProgress) {
                return; // Silently skip
            }

            // Check if migration is needed
            const migrationNeeded = await this.isMigrationNeeded();
            if (!migrationNeeded) {
                // Migration already completed, no need to log anything
                return;
            }
            
            console.log('🧪 Checking task migration status...');
            this.migrationInProgress = true;

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
                    
                    // Save migration timestamp
                    localStorage.setItem('lastTaskMigrationTimestamp', new Date().toISOString());
                    
                    // Verify migration by loading tasks from Firestore
                    await this.verifyMigration();
                    
                    // Show success message briefly
                    this.setStatus('online', 'Tasks synced successfully');
                } else {
                    console.log('⚠️ Migration failed or was skipped:', migrationResult.reason || migrationResult.error);
                }
            } else if (migrationStatus.migrated) {
                console.log(`✅ Migration already completed - ${migrationStatus.taskCount} tasks in Firestore`);
                
                // Check if all sections were migrated
                const parsedTasks = await this.taskParser.getCachedTasks();
                const totalTasksInMd = Object.values(parsedTasks).reduce((total, section) => 
                    Array.isArray(section) ? total + section.length : total, 0);
                
                if (totalTasksInMd > migrationStatus.taskCount) {
                    console.log(`⚠️ Incomplete migration detected: ${migrationStatus.taskCount} tasks in Firestore, but ${totalTasksInMd} tasks in tasks.md`);
                    console.log('🔄 Re-running migration to include all sections...');
                    
                    // Show migration status to user
                    this.setStatus('loading', `Migrating ${totalTasksInMd - migrationStatus.taskCount} missing tasks...`);
                    
                    // Force re-migration
                    const migrationResult = await this.taskParser.migrateToFirestore(this.taskDataService);
                    
                    if (migrationResult.success) {
                        console.log('✅ Re-migration completed successfully!');
                        console.log(`📊 Total tasks after re-migration: ${migrationResult.migrated} new, ${migrationResult.skipped} skipped`);
                        
                        // Save migration timestamp
                        localStorage.setItem('lastTaskMigrationTimestamp', new Date().toISOString());
                        
                        this.setStatus('online', 'Task migration completed');
                    } else {
                        this.setStatus('offline', 'Migration failed - some features may be limited');
                    }
                } else {
                    // Migration is complete and up-to-date, save timestamp
                    localStorage.setItem('lastTaskMigrationTimestamp', new Date().toISOString());
                }
                
                // Still verify the system is working
                await this.verifyMigration();
            }

            // Only test backward compatibility during actual migration
            if (migrationStatus.available && (!migrationStatus.migrated || 
                (totalTasksInMd && totalTasksInMd > migrationStatus.taskCount))) {
                await this.testBackwardCompatibility();
            }

        } catch (error) {
            console.error('❌ Error during migration test:', error);
        } finally {
            this.migrationInProgress = false;
        }
    }

    /**
     * Verify migration was successful
     */
    async verifyMigration() {
        try {
            // Test TaskDataService silently
            const allTasks = await this.taskDataService.getAllTasks();
            
            // Only log if there's an issue
            if (allTasks.length === 0) {
                console.warn('⚠️ No tasks found in Firestore after migration');
                return false;
            }

            // Basic functionality test - no logging unless error
            await this.taskDataService.getTasksBySection('todayTasks');
            await this.taskDataService.exportToTaskParserFormat();
            
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
            // Silently test that TaskParser still works with tasks.md
            const originalTasks = await this.taskParser.loadAndParseTasks();
            
            // Test that LLMService still receives the expected format
            const formattedTasks = this.taskParser.formatTasksForLLM(originalTasks);
            
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

            // Test enhanced schedule saving if available
            if (this.scheduleDataService.isAvailable()) {
                await this.storageService.saveScheduleWithHistory(testDate + '-enhanced-test', testSchedule);
            }

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
            console.log('🔄 Loading tasks for management view...');
            console.log('TaskDataService available:', this.taskDataService.isAvailable());
            
            if (this.taskDataService.isAvailable()) {
                // Load from TaskDataService (Phase 1)
                this.currentTasks = await this.taskDataService.getAllTasks();
                console.log('📊 Loaded from TaskDataService:', this.currentTasks.length, 'tasks');
            } else {
                // Fallback to TaskParser
                console.log('📄 Falling back to TaskParser...');
                const parsedTasks = await this.taskParser.getCachedTasks();
                console.log('📋 Parsed task sections:', Object.keys(parsedTasks || {}));
                console.log('📋 Section contents:', parsedTasks);
                
                this.currentTasks = this.flattenTaskSections(parsedTasks);
                console.log('📝 Flattened tasks:', this.currentTasks.length, 'total tasks');
                
                // Log tasks by section for debugging
                const tasksBySection = this.groupTasksBySection(this.currentTasks);
                console.log('📂 Tasks grouped by section:', Object.keys(tasksBySection));
                Object.entries(tasksBySection).forEach(([section, tasks]) => {
                    console.log(`  ${section}: ${tasks.length} tasks`);
                });
            }
            
            this.applyTaskFilters();
            console.log('✅ Task loading completed. Filtered tasks:', this.filteredTasks.length);
        } catch (error) {
            console.error('❌ Error loading tasks for management:', error);
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
        console.log('🖼️ Updating task management display...');
        if (!this.elements.taskSectionsContainer) {
            console.error('❌ taskSectionsContainer element not found!');
            return;
        }

        // Group tasks by section
        const tasksBySection = this.groupTasksBySection(this.filteredTasks);
        console.log('📂 Display: Tasks grouped by section:', Object.keys(tasksBySection));
        
        // Clear existing content
        this.elements.taskSectionsContainer.innerHTML = '';
        
        // Check if there are any tasks
        if (this.filteredTasks.length === 0) {
            console.log('📭 No filtered tasks - showing empty state');
            this.elements.taskManagementEmpty.style.display = 'block';
            return;
        } else {
            this.elements.taskManagementEmpty.style.display = 'none';
        }

        // Render each section
        const sectionOrder = ['todayTasks', 'upcomingTasks', 'dailyTasks', 'weeklyTasks', 'monthlyTasks', 'yearlyTasks', 'undatedTasks'];
        console.log('🔢 Section rendering order:', sectionOrder);
        
        let sectionsRendered = 0;
        sectionOrder.forEach(sectionKey => {
            const tasks = tasksBySection[sectionKey];
            console.log(`📋 Section ${sectionKey}:`, tasks ? tasks.length : 0, 'tasks');
            if (tasks && tasks.length > 0) {
                const sectionElement = this.createTaskSection(sectionKey, tasks);
                this.elements.taskSectionsContainer.appendChild(sectionElement);
                sectionsRendered++;
                console.log(`✅ Rendered section: ${sectionKey} with ${tasks.length} tasks`);
            }
        });
        
        console.log(`🎨 Total sections rendered: ${sectionsRendered}`);
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
            // Check if ValidationUtils is available
            if (!window.ValidationUtils) {
                console.error('ValidationUtils not available');
                this.showToast('Validation system not loaded. Please refresh the page.', 'error');
                return;
            }

            // Validate task data
            const validation = window.ValidationUtils.validateTask(taskData);
            if (!validation.isValid) {
                const errorMessage = window.ValidationUtils.formatValidationErrors(validation.errors);
                this.showToast(errorMessage, 'error');
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
    /**
     * Clean up API keys from Firestore (security fix)
     * This should be run once to remove any accidentally stored API keys
     */
    async cleanupApiKeysFromFirestore() {
        if (!this.firestoreService || !this.firestoreService.isAvailable()) {
            console.log('Firestore not available, skipping API key cleanup');
            return;
        }

        try {
            // Load current settings from Firestore
            const cloudSettings = await this.firestoreService.loadSettings();
            
            if (cloudSettings && cloudSettings.openrouterApiKey) {
                console.warn('Found API key in Firestore - removing for security');
                
                // Remove API key from cloud settings
                const { openrouterApiKey, ...cleanSettings } = cloudSettings;
                
                // Save back without API key
                await this.firestoreService.saveSettings(cleanSettings);
                console.log('API key removed from Firestore');
            } else {
                console.log('No API key found in Firestore - system is secure');
            }
        } catch (error) {
            console.error('Error during API key cleanup:', error);
        }
    }
    
    /**
     * Run task deduplication on startup
     * Only runs if deduplication hasn't been performed recently
     */
    async deduplicateTasksOnStartup() {
        if (!this.taskDataService || !this.taskDataService.isAvailable()) {
            console.log('TaskDataService not available, skipping deduplication');
            return;
        }

        try {
            // Check if we've already run deduplication recently
            const lastDedup = localStorage.getItem('lastTaskDeduplicationTimestamp');
            if (lastDedup) {
                const lastDedupDate = new Date(lastDedup);
                const hoursSinceDedup = (Date.now() - lastDedupDate.getTime()) / (1000 * 60 * 60);
                
                // Only run deduplication once every 24 hours
                if (hoursSinceDedup < 24) {
                    console.log('Deduplication was run recently, skipping');
                    return;
                }
            }
            
            console.log('Running task deduplication...');
            const result = await this.taskDataService.deduplicateTasks();
            
            if (result.success && result.duplicatesRemoved > 0) {
                console.log(`✅ Removed ${result.duplicatesRemoved} duplicate tasks`);
                // Update the task management view if it's visible
                if (this.currentView === 'task-management') {
                    await this.loadTasksForManagement();
                    this.updateTaskManagementDisplay();
                }
            }
            
            // Save timestamp
            localStorage.setItem('lastTaskDeduplicationTimestamp', new Date().toISOString());
        } catch (error) {
            console.error('Error during task deduplication:', error);
        }
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