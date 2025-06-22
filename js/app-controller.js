/**
 * Main Application Controller for Secretary AI
 * Coordinates all services and managers
 * 
 * This is the main controller after code splitting optimization.
 * Original app.js (2,779 lines) has been split into:
 * - SettingsManager (200 lines)
 * - DateNavigationManager (385 lines)
 * - UIManager (280 lines)
 * - ScheduleManager (496 lines)
 * - TaskManager (1,021 lines)
 * - AppController (this file, ~944 lines)
 */

import { ComponentWithListeners } from './event-registry.js';

class AppController extends ComponentWithListeners {
    constructor() {
        super(); // Initialize listener management
        
        // Initialize centralized state management
        this.appState = new AppState();
        
        // Initialize services (some will be lazy loaded)
        this.llmService = new LLMService();
        this.firestoreService = new FirestoreService();
        this.storageService = new StorageService();
        this.taskDataService = new TaskDataService();
        this.scheduleDataService = new ScheduleDataService();
        
        // Task management services (must be created before managers)
        this.taskIndexManager = new TaskIndexManager();
        this.filterCache = new FilterCache();
        
        // Lazy loaded services
        this.patternAnalyzer = null; // Loaded when insights are accessed
        
        // UI elements (must be initialized before managers)
        this.elements = {};
        
        // Properties not yet extracted to managers
        this.isOnline = navigator.onLine;
        this.refreshInterval = null;
        this.lastRefresh = null;
        
        // Initialize managers (after elements is defined)
        this.settingsManager = new SettingsManager(this);
        this.dateNavigationManager = new DateNavigationManager(this);
        this.uiManager = new UIManager(this);
        this.scheduleManager = new ScheduleManager(this);
        this.taskManager = new TaskManager(this);
        
        // UI components for task management
        this.components = {
            calendarView: null,
            insightsModal: null
        };
        
        // State helper properties for backward compatibility
        this.state = this.appState.state;
    }
    
    /**
     * Helper method to update state (for managers and backward compatibility)
     */
    updateState(updates) {
        this.appState.update(updates);
    }
    
    /**
     * Helper method to get state (for managers and backward compatibility)
     */
    getState(key) {
        return this.appState.get(key);
    }
    
    /**
     * Subscribe to state changes
     */
    subscribeToState(key, callback) {
        return this.appState.subscribe(key, callback);
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
            
            // Initialize UI through UIManager
            await this.uiManager.initialize();
            this.elements = this.uiManager.elements; // Maintain backward compatibility
            
            // Initialize SettingsManager after UI elements are ready
            await this.settingsManager.initialize();
            
            // Load settings through SettingsManager
            await this.settingsManager.loadSettings();
            
            // Initialize services
            await this.initializeServices();
            
            // Initialize managers
            await this.dateNavigationManager.initialize();
            await this.scheduleManager.initialize();
            await this.taskManager.initialize();
            
            // Load initial data
            await this.loadInitialData();
            
            // Set up auto-refresh through SettingsManager
            this.settingsManager.setupAutoRefresh();
            
            // Set up event listeners
            this.setupEventListeners();
            this.setupManagerEventListeners();
            
            // Update UI through UIManager
            this.uiManager.updateUI();
            
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
            this.uiManager.showError('Failed to initialize the application', error);
        }
    }
    
    /**
     * Set up event listeners for manager communication
     */
    setupManagerEventListeners() {
        const eventBus = window.globalEventManager;

        // Listen for settings updates
        eventBus.on('settings-updated', (settings) => {
            this.uiManager.updateStatus();
        });

        eventBus.on('request-schedule-refresh', () => {
            this.scheduleManager.refreshSchedule();
        });

        // Listen for date navigation events
        eventBus.on('date-changed', async ({ date, previousDate }) => {
            await this.scheduleManager.loadScheduleForDate(date);
            this.uiManager.updateUI();
        });

        eventBus.on('request-schedule-load', async ({ date, dateKey }) => {
            await this.scheduleManager.loadScheduleForDate(date);
        });

        // Listen for UI manager events
        eventBus.on('request-schedule-display-update', () => {
            this.scheduleManager.updateScheduleDisplay();
        });

        eventBus.on('request-task-display-update', () => {
            this.taskManager.updateTaskManagementDisplay();
        });
        
        eventBus.on('request-date-display-update', () => {
            this.dateNavigationManager.updateDateDisplay();
        });

        eventBus.on('request-load-more-tasks', () => {
            this.taskManager.loadMoreTasks();
        });

        // Listen for schedule manager events
        eventBus.on('schedule-generated', ({ schedule, date }) => {
            this.uiManager.updateUI();
        });

        eventBus.on('schedule-display-updated', ({ schedule }) => {
            // Any additional UI updates if needed
        });

        eventBus.on('schedule-task-completed', ({ task, completed }) => {
            // Handle task completion if needed
        });
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
                
            } catch (error) {
                console.warn('⚠️ Firestore initialization failed:', error);
            }
        }

        // Pattern analyzer will be initialized when first accessed
        
        // Configure LLM service through SettingsManager
        await this.settingsManager.configureLLMService();
        
        // Update model badge display through SettingsManager
        this.settingsManager.updateModelBadge();
    }


    /**
     * Load initial data and generate schedule
     */
    async loadInitialData() {
        this.uiManager.setStatus('loading', 'Loading your tasks...');
        
        try {
            // Load schedule for current view date through ScheduleManager
            const currentDate = this.appState.get('currentDate');
            await this.scheduleManager.loadScheduleForDate(currentDate);
        } catch (error) {
            console.error('Error loading initial data:', error);
            
            // Try to show mock data in development
            if (Config.shouldUseMockData()) {
                console.log('Using mock data');
                this.updateState({ currentSchedule: MOCK_DATA.schedule });
                this.uiManager.setStatus('offline', 'Using sample data (development mode)');
            } else if (!this.isOnline) {
                // Clear offline message
                this.uiManager.setStatus('offline', 'You\'re offline - schedule generation unavailable');
                this.uiManager.showToast('You\'re offline. Connect to internet to generate schedules.', 'info');
            } else {
                this.uiManager.setStatus('offline', 'Failed to load schedule');
                this.uiManager.showError('Failed to load your schedule', error);
            }
        }
    }



    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Refresh button
        this.addEventListener(this.elements.refreshBtn, 'click', () => this.scheduleManager.refreshSchedule());

        // View toggle button
        this.addEventListener(this.elements.viewToggleBtn, 'click', this.toggleViewMode);
        
        // Calendar toggle button
        this.addEventListener(this.elements.calendarToggleBtn, 'click', () => this.toggleCalendar());
        
        // Insights button
        this.addEventListener(this.elements.insightsBtn, 'click', () => this.showInsights());

        // Date navigation (handled by DateNavigationManager, except date picker)
        this.addEventListener(this.elements.datePickerBtn, 'click', () => this.dateNavigationManager.showDatePicker());

        // Settings modal is handled by SettingsManager
        
        // Deduplication button
        const deduplicateBtn = document.getElementById('deduplicateBtn');
        if (deduplicateBtn) {
            this.addEventListener(deduplicateBtn, 'click', async () => {
                deduplicateBtn.disabled = true;
                deduplicateBtn.textContent = 'Removing duplicates...';
                await this.manualDeduplication();
                deduplicateBtn.disabled = false;
                deduplicateBtn.textContent = 'Remove Duplicate Tasks';
            });
        }

        // Close modal on backdrop click
        this.addEventListener(this.elements.settingsModal, 'click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.settingsManager.closeSettings();
            }
        });

        // Network status
        this.addGlobalListener(window, 'online', () => {
            this.isOnline = true;
            this.uiManager.setStatus('online', 'Back online');
            this.storageService.syncPendingData();
        });

        this.addGlobalListener(window, 'offline', () => {
            this.isOnline = false;
            this.uiManager.setStatus('offline', 'Offline mode');
        });

        // Service worker messages
        if ('serviceWorker' in navigator) {
            this.addEventListener(navigator.serviceWorker, 'message', (event) => {
                if (event.data && event.data.type === 'SYNC_TASKS') {
                    this.storageService.syncPendingData();
                }
            });
        }
        
        // Keyboard shortcuts for date navigation
        this.addGlobalListener(document, 'keydown', (e) => {
            // Only handle in schedule view
            if (this.appState.get('currentView') !== 'schedule') return;
            
            // Don't handle if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.dateNavigationManager.navigateDate(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.dateNavigationManager.navigateDate(1);
            } else if (e.key === 't' || e.key === 'T') {
                // Go to today
                e.preventDefault();
                this.appState.set('currentDate', new Date());
                this.scheduleManager.loadScheduleForDate(this.appState.get('currentDate'));
                this.uiManager.updateUI();
            } else if (e.key === 'p' || e.key === 'P') {
                // Show performance report
                e.preventDefault();
                console.log('=== Performance Report ===');
                window.performanceMonitor.logReport();
                this.uiManager.showToast('Performance report logged to console', 'info');
            }
        });
    }


    /**
     * Ensure Pattern Analyzer is loaded
     */
    async ensurePatternAnalyzer() {
        if (!this.patternAnalyzer) {
            console.log('Loading Pattern Analyzer...');
            if (!window.PatternAnalyzer) {
                // Use global loadInsightsModal which also loads PatternAnalyzer
                await window.loadInsightsModal();
            }
            this.patternAnalyzer = new PatternAnalyzer();
            if (this.scheduleDataService) {
                this.patternAnalyzer.initialize(this.scheduleDataService);
            }
        }
    }

    /**
     * Ensure Calendar View is loaded
     */
    async ensureCalendarView() {
        if (!this.components.calendarView) {
            console.log('Loading Calendar View...');
            const CalendarView = await window.loadCalendarView();
            
            this.components.calendarView = new CalendarView({
                onDateSelect: (date) => {
                    this.dateNavigationManager.navigateToDate(date);
                    this.components.calendarView.hide();
                },
                currentDate: this.appState.get('currentDate')
            });
            
            // Add calendar button handler
            if (this.elements.calendarToggleBtn) {
                this.addEventListener(this.elements.calendarToggleBtn, 'click', () => {
                    this.components.calendarView.toggle();
                });
            }
        }
    }

    /**
     * Ensure Insights Modal is loaded
     */
    async ensureInsightsModal() {
        if (!this.components.insightsModal) {
            console.log('Loading Insights Modal...');
            await this.ensurePatternAnalyzer(); // Ensure pattern analyzer is loaded first
            
            const InsightsModal = await window.loadInsightsModal();
            this.components.insightsModal = new InsightsModal({
                patternAnalyzer: this.patternAnalyzer
            });
            this.components.insightsModal.initialize();
        }
    }
    
    /**
     * Toggle between schedule and task management views
     */
    toggleViewMode = () => {
        const currentView = this.appState.get('currentView');
        const newView = currentView === 'schedule' ? 'tasks' : 'schedule';
        
        // Update view mode through UIManager
        this.uiManager.updateViewMode(newView);
        
        // Handle view-specific UI elements
        if (newView === 'schedule') {
            this.elements.viewToggleBtn.classList.remove('active');
            this.elements.viewToggleBtn.title = 'Switch to Task Management';
            
            // Remove floating action button
            this.taskManager.hideFloatingActionButton();
        } else {
            this.elements.viewToggleBtn.classList.add('active');
            this.elements.viewToggleBtn.title = 'Switch to Schedule View';
            
            // Add floating action button
            this.taskManager.showFloatingActionButton();
            
            // Load tasks for management view
            this.taskManager.loadTasksForManagement();
        }
        
        this.uiManager.updateUI();
    }
    
    /**
     * Clean up API keys from Firestore for security
     */
    async cleanupApiKeysFromFirestore() {
        try {
            const cloudSettings = await this.firestoreService.loadSettings();
            if (cloudSettings && cloudSettings.openrouterApiKey) {
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
                if (this.appState.get('currentView') === 'tasks') {
                    await this.taskManager.loadTasksForManagement();
                    this.taskManager.updateTaskManagementDisplay();
                }
            }
            
            // Save timestamp
            localStorage.setItem('lastTaskDeduplicationTimestamp', new Date().toISOString());
        } catch (error) {
            console.error('Error during task deduplication:', error);
        }
    }
    
    /**
     * Force task migration (manual trigger for debugging)
     * Use with caution as it may create duplicates
     */
    async forceTaskMigration() {
        console.log('Force migration is no longer needed - tasks.md has been deprecated');
        console.log('All tasks are now managed exclusively through the web app');
    }
    
    /**
     * Manual deduplication (can be called anytime)
     */
    async manualDeduplication() {
        if (!this.taskDataService || !this.taskDataService.isAvailable()) {
            console.error('TaskDataService not available');
            return;
        }
        
        try {
            console.log('🧹 Running manual task deduplication...');
            const result = await this.taskDataService.deduplicateTasks();
            
            if (result.success) {
                console.log(`✅ Deduplication completed!`);
                console.log(`📊 Results: ${result.duplicatesRemoved} duplicates removed`);
                console.log(`📋 Remaining tasks: ${result.remainingTasks}`);
                
                // Update UI if in task management view
                if (this.appState.get('currentView') === 'tasks') {
                    await this.taskManager.loadTasksForManagement();
                    this.taskManager.updateTaskManagementDisplay();
                }
                
                // Update timestamp
                localStorage.setItem('lastTaskDeduplicationTimestamp', new Date().toISOString());
                
                this.uiManager.showToast(`Removed ${result.duplicatesRemoved} duplicate tasks`, 'success');
            } else {
                console.error('❌ Deduplication failed:', result.error);
                this.uiManager.showToast('Deduplication failed', 'error');
            }
        } catch (error) {
            console.error('Error during manual deduplication:', error);
            this.uiManager.showToast('Error during deduplication', 'error');
        }
    }


    /**
     * Initialize calendar view component
     */
    initializeCalendarView() {
        if (typeof CalendarView === 'undefined') {
            console.warn('CalendarView not loaded');
            return;
        }
        
        this.components.calendarView = new CalendarView({
            currentDate: this.appState.get('currentDate'),
            onDateSelect: (date) => this.handleCalendarDateSelect(date),
            onClose: () => this.handleCalendarClose(),
            onLoadIndicators: (startDate, endDate) => this.scheduleManager.loadScheduleIndicators(startDate, endDate)
        });
        
        // Add calendar to the app container
        const appContainer = document.querySelector('.app');
        if (appContainer) {
            appContainer.insertBefore(this.components.calendarView.render(), appContainer.firstChild);
        }
    }
    
    /**
     * Initialize insights modal
     */
    initializeInsightsModal() {
        // Create insights modal
        this.components.insightsModal = new InsightsModal({
            patternAnalyzer: this.patternAnalyzer
        });
        
        // Initialize the modal
        this.components.insightsModal.initialize();
        
        // Add click handler for insights button
        const insightsBtn = document.getElementById('insightsBtn');
        if (insightsBtn) {
            this.addEventListener(insightsBtn, 'click', () => {
                this.showInsights();
            });
        }
    }
    
    /**
     * Show insights modal
     */
    async showInsights() {
        // Ensure insights modal is loaded
        await this.ensureInsightsModal();
        
        this.components.insightsModal.show();
    }
    
    /**
     * Toggle calendar visibility
     */
    async toggleCalendar() {
        // Ensure calendar view is loaded
        await this.ensureCalendarView();
        
        this.components.calendarView.toggle();
        this.elements.calendarToggleBtn.classList.toggle('active');
    }
    
    /**
     * Handle calendar date selection
     */
    async handleCalendarDateSelect(date) {
        await this.dateNavigationManager.navigateToDate(date);
        this.elements.calendarToggleBtn.classList.remove('active');
    }
    
    /**
     * Handle calendar close
     */
    handleCalendarClose() {
        this.elements.calendarToggleBtn.classList.remove('active');
    }
    

    /**
     * Clean up all resources and event listeners
     */
    destroy() {
        // Clean up all event listeners
        this.destroyListeners();
        
        // Clean up any other resources
        if (this.components) {
            if (this.components.calendarView) {
                this.components.calendarView.destroy();
            }
            if (this.components.insightsModal) {
                this.components.insightsModal.destroy();
            }
        }
        
        // Clear intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Export the class
export { AppController };

// Also make it available globally for compatibility
window.AppController = AppController;
window.SecretaryApp = AppController; // Maintain backward compatibility
