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
        this.taskParser = new TaskParser();
        this.llmService = new LLMService();
        this.firestoreService = new FirestoreService();
        this.storageService = new StorageService();
        this.taskDataService = new TaskDataService();
        this.scheduleDataService = new ScheduleDataService();
        
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
        // Listen for settings updates
        this.settingsManager.on('settings-updated', (settings) => {
            this.uiManager.updateStatus();
        });
        
        this.settingsManager.on('request-schedule-refresh', () => {
            this.scheduleManager.refreshSchedule();
        });
        
        // Listen for date navigation events
        this.dateNavigationManager.on('date-changed', async ({ date, previousDate }) => {
            await this.scheduleManager.loadScheduleForDate(date);
            this.uiManager.updateUI();
        });
        
        this.dateNavigationManager.on('request-schedule-load', async ({ date, dateKey }) => {
            await this.scheduleManager.loadScheduleForDate(date);
        });
        
        // Listen for UI manager events
        this.uiManager.on('request-schedule-display-update', () => {
            this.scheduleManager.updateScheduleDisplay();
        });
        
        // Listen for schedule manager events
        this.scheduleManager.on('schedule-generated', ({ schedule, date }) => {
            this.uiManager.updateUI();
        });
        
        this.scheduleManager.on('schedule-display-updated', ({ schedule }) => {
            // Any additional UI updates if needed
        });
        
        this.scheduleManager.on('schedule-task-completed', ({ task, completed }) => {
            // Handle task completion if needed
        });
        
        this.uiManager.on('request-task-display-update', () => {
            this.taskManager.updateTaskManagementDisplay();
        });
        
        this.uiManager.on('request-date-display-update', () => {
            this.dateNavigationManager.updateDateDisplay();
        });
        
        this.uiManager.on('request-load-more-tasks', () => {
            this.taskManager.loadMoreTasks();
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
                
                // Test migration on first run
                await this.testTaskMigration();
                
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
            // Always load and cache tasks for Task Management view
            await this.taskParser.loadAndParseTasks();
            console.log('Tasks loaded and cached for Task Management');
            
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

        // Date navigation
        this.addEventListener(this.elements.prevDateBtn, 'click', () => this.dateNavigationManager.navigateDate(-1));
        this.addEventListener(this.elements.nextDateBtn, 'click', () => this.dateNavigationManager.navigateDate(1));
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
     * Check if migration is needed based on timestamps
     */
    async isMigrationNeeded() {
        try {
            // Get last migration timestamp from localStorage
            const lastMigration = localStorage.getItem('lastTaskMigrationTimestamp');
            const lastMigrationVersion = localStorage.getItem('lastTaskMigrationVersion') || '1.0';
            const currentMigrationVersion = '1.1'; // Increment this when migration logic changes
            
            // Check if we have any tasks in Firestore
            const migrationStatus = await this.taskParser.checkMigrationStatus(this.taskDataService);
            
            // Only migrate if:
            // 1. Never migrated before AND Firestore has NO tasks at all
            // 2. OR migration version has changed (for critical updates)
            if (!lastMigration && migrationStatus.taskCount === 0) {
                console.log('First-time migration needed - no tasks in Firestore');
                return true;
            }
            
            // If migration version changed and we need to fix issues
            if (lastMigrationVersion !== currentMigrationVersion && migrationStatus.taskCount === 0) {
                console.log('Migration version changed - re-migration needed');
                localStorage.setItem('lastTaskMigrationVersion', currentMigrationVersion);
                return true;
            }
            
            // If we have any tasks in Firestore, don't migrate
            // This prevents re-migration even if tasks.md has new items
            if (migrationStatus.taskCount > 0) {
                // Save current version if not saved
                if (lastMigrationVersion !== currentMigrationVersion) {
                    localStorage.setItem('lastTaskMigrationVersion', currentMigrationVersion);
                }
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

            // Use a more robust migration lock
            const migrationLockKey = 'secretaryai_migration_lock';
            const existingLock = localStorage.getItem(migrationLockKey);
            
            // Check if migration is locked (in progress)
            if (existingLock) {
                const lockTime = new Date(existingLock);
                const lockAge = Date.now() - lockTime.getTime();
                
                // If lock is older than 5 minutes, assume it's stale and remove it
                if (lockAge > 5 * 60 * 1000) {
                    console.log('Removing stale migration lock');
                    localStorage.removeItem(migrationLockKey);
                } else {
                    console.log('Migration already in progress, skipping');
                    return;
                }
            }

            // Check if migration is needed
            const migrationNeeded = await this.isMigrationNeeded();
            if (!migrationNeeded) {
                // Migration already completed, no need to log anything
                return;
            }
            
            console.log('🧪 Checking task migration status...');
            
            // Set migration lock
            localStorage.setItem(migrationLockKey, new Date().toISOString());
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
                    this.uiManager.setStatus('online', 'Tasks synced successfully');
                } else {
                    console.log('⚠️ Migration failed or was skipped:', migrationResult.reason || migrationResult.error);
                }
            } else if (migrationStatus.migrated) {
                console.log(`✅ Migration already completed - ${migrationStatus.taskCount} tasks in Firestore`);
                
                // Check if all sections were migrated
                const parsedTasks = await this.taskParser.getCachedTasks();
                const totalTasksInMd = Object.values(parsedTasks).reduce((total, section) => 
                    Array.isArray(section) ? total + section.length : total, 0);
                
                // Only re-migrate if there's a significant difference (more than 10% or 5 tasks)
                const taskDifference = totalTasksInMd - migrationStatus.taskCount;
                const percentDifference = (taskDifference / migrationStatus.taskCount) * 100;
                
                if (taskDifference > 5 && percentDifference > 10) {
                    console.log(`⚠️ Significant task difference detected: ${migrationStatus.taskCount} tasks in Firestore, but ${totalTasksInMd} tasks in tasks.md`);
                    console.log(`📊 Difference: ${taskDifference} tasks (${percentDifference.toFixed(1)}%)`);
                    
                    // Ask for confirmation in console (for debugging)
                    console.warn('⚠️ Re-migration may cause duplicates. Only proceed if you are sure tasks are missing.');
                    console.log('To force re-migration, run: app.forceTaskMigration()');
                    
                    // Don't automatically re-migrate to prevent duplicates
                    localStorage.setItem('lastTaskMigrationTimestamp', new Date().toISOString());
                } else if (taskDifference > 0) {
                    console.log(`ℹ️ Minor difference detected: ${taskDifference} tasks. This is within acceptable range.`);
                    localStorage.setItem('lastTaskMigrationTimestamp', new Date().toISOString());
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
            // Remove migration lock
            localStorage.removeItem('secretaryai_migration_lock');
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
            
            // Add insights button handler
            const insightsBtn = document.getElementById('insightsBtn');
            if (insightsBtn) {
                this.addEventListener(insightsBtn, 'click', () => {
                    this.components.insightsModal.show();
                });
            }
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
    getSystemStatus() {
        return {
            app: {
                initialized: true,
                online: this.isOnline,
                hasSchedule: !!this.appState.get('currentSchedule')
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
            settings: this.settingsManager?.getSettings()
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
        console.warn('⚠️ Force migration requested. This may create duplicates!');
        console.log('Running deduplication first to clean existing tasks...');
        
        // First run deduplication
        await this.manualDeduplication();
        
        // Clear migration timestamp to force re-migration
        localStorage.removeItem('lastTaskMigrationTimestamp');
        localStorage.removeItem('secretaryai_migration_lock');
        
        // Run migration
        console.log('Starting force migration...');
        await this.testTaskMigration();
        
        // Run deduplication again after migration
        console.log('Running post-migration deduplication...');
        await this.manualDeduplication();
        
        console.log('✅ Force migration completed');
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
