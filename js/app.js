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
        
        // App state
        this.currentSchedule = null;
        this.isOnline = navigator.onLine;
        this.refreshInterval = null;
        this.lastRefresh = null;
        this.settings = null;
        
        // UI elements (will be initialized in initializeUI)
        this.elements = {};
        
        // Bind methods
        this.refreshSchedule = this.refreshSchedule.bind(this);
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
            loadingOverlay: document.getElementById('loadingOverlay')
        };

        // Update current time
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 30000); // Update every 30 seconds
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
        this.updateScheduleDisplay();
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