import { BaseManager } from '../base-manager.js';

/**
 * UIManager
 * Handles all UI updates, user feedback, and display management
 */
export class UIManager extends BaseManager {
    constructor(app) {
        super(app);
        this.toastQueue = [];
        this.currentToast = null;
    }
    
    /**
     * Initialize the UI manager
     */
    async initialize() {
        // Initialize DOM element references
        this.initializeElements();
        
        // Start UI update intervals
        this.startUIIntervals();
    }
    
    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // Main containers
        this.app.elements = {
            // Main views
            scheduleView: document.getElementById('scheduleView'),
            taskView: document.getElementById('taskManagementView'),
            
            // Schedule elements
            scheduleContainer: document.getElementById('scheduleView'),
            scheduleTitle: document.getElementById('scheduleTitle'),
            scheduleList: document.getElementById('taskList'),
            currentDateDisplay: document.getElementById('currentDateDisplay'),
            
            // Task management elements
            taskSectionsContainer: document.getElementById('taskSectionsContainer'),
            taskSearchContainer: document.getElementById('searchBarContainer'),
            
            // Navigation
            prevDateBtn: document.getElementById('prevDateBtn'),
            nextDateBtn: document.getElementById('nextDateBtn'),
            todayBtn: null, // Not in HTML
            datePickerBtn: document.getElementById('datePickerBtn'),
            calendarToggleBtn: document.getElementById('calendarToggleBtn'),
            
            // Actions
            refreshBtn: document.getElementById('refreshBtn'),
            generateBtn: null, // Not in HTML
            settingsBtn: document.getElementById('settingsBtn'),
            insightsBtn: document.getElementById('insightsBtn'),
            
            // Status and info
            status: document.getElementById('status'),
            statusText: document.getElementById('statusText'),
            currentTime: document.getElementById('currentTime'),
            lastUpdated: document.getElementById('lastUpdated'),
            modelBadge: document.getElementById('modelBadge'),
            modelName: document.getElementById('modelName'),
            
            // Loading
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingMessage: document.querySelector('#loadingOverlay .loading-text'),
            
            // Settings modal
            settingsModal: document.getElementById('settingsModal'),
            modalClose: document.getElementById('modalClose'),
            openrouterKey: document.getElementById('openrouterKey'),
            modelSelect: document.getElementById('modelSelect'),
            refreshInterval: document.getElementById('refreshInterval'),
            saveSettings: document.getElementById('saveSettings'),
            toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),
            
            // View toggles
            scheduleTab: document.querySelector('[data-view="schedule"]'),
            tasksTab: document.querySelector('[data-view="tasks"]'),
            
            // Buttons that might not exist yet
            loadMoreButton: null
        };
    }
    
    /**
     * Start recurring UI update intervals
     */
    startUIIntervals() {
        // Update current time every minute
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 60000);
    }
    
    /**
     * Main UI update method
     */
    updateUI() {
        const currentView = this.state.currentView || 'schedule';
        
        if (currentView === 'schedule') {
            this.emit('request-schedule-display-update');
            this.emit('request-date-display-update');
        } else {
            this.emit('request-task-display-update');
        }
        
        this.updateLastUpdated();
        this.updateStatus();
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
        
        if (this.elements.currentTime) {
            this.elements.currentTime.textContent = timeStr;
        }
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
     * Update last updated timestamp
     */
    updateLastUpdated() {
        const lastRefresh = this.state.lastScheduleDate;
        if (lastRefresh && this.elements.lastUpdated) {
            const timeStr = new Date(lastRefresh).toLocaleTimeString('en-US', { 
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
        if (this.elements.status) {
            this.elements.status.className = `status ${type}`;
        }
        if (this.elements.statusText) {
            this.elements.statusText.textContent = message;
        }
    }
    
    /**
     * Update connection status
     */
    updateStatus() {
        const isOnline = navigator.onLine;
        const hasApiKey = this.llmService?.isConfigured();
        
        if (!isOnline) {
            this.setStatus('offline', 'Offline mode');
        } else if (hasApiKey) {
            this.setStatus('online', 'Connected');
        } else {
            this.setStatus('offline', 'OpenRouter API not configured');
        }
    }
    
    /**
     * Show/hide loading overlay
     */
    showLoading(show, message = 'Loading...') {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
            
            if (show && message && this.elements.loadingMessage) {
                this.elements.loadingMessage.textContent = message;
            }
        }
        
        // Update state
        this.updateState({ 
            isLoading: show,
            loadingMessage: show ? message : ''
        });
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = {
            message,
            type,
            id: Date.now()
        };
        
        this.toastQueue.push(toast);
        if (!this.currentToast) {
            this.processToastQueue();
        }
    }
    
    /**
     * Process toast queue
     */
    processToastQueue() {
        if (this.toastQueue.length === 0) {
            this.currentToast = null;
            return;
        }
        
        const toast = this.toastQueue.shift();
        this.currentToast = toast;
        
        const toastEl = document.createElement('div');
        toastEl.className = `toast toast-${toast.type}`;
        toastEl.textContent = toast.message;
        toastEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${toast.type === 'success' ? '#4CAF50' : toast.type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(toastEl);

        setTimeout(() => {
            toastEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                toastEl.remove();
                this.processToastQueue();
            }, 300);
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
     * Show search loading state
     */
    showSearchLoading() {
        const searchBar = document.querySelector('.search-bar-component');
        if (searchBar) {
            searchBar.classList.add('searching');
        }
        
        const searchInput = searchBar?.querySelector('.search-input');
        if (searchInput) {
            searchInput.classList.add('loading');
        }
    }
    
    /**
     * Hide search loading state
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
     * Update load more button visibility
     */
    updateLoadMoreButton(hasMore = false) {
        if (!this.elements.loadMoreButton) {
            // Create load more button if it doesn't exist
            const button = document.createElement('button');
            button.className = 'load-more-button';
            button.innerHTML = '<span class="material-icons">expand_more</span> Load More Tasks';
            this.elements.loadMoreButton = button;
            
            // Add to the end of task sections container
            if (this.elements.taskSectionsContainer) {
                this.elements.taskSectionsContainer.appendChild(button);
            }
            
            // Request task manager to handle click
            this.app.addEventListener(button, 'click', () => {
                this.emit('request-load-more-tasks');
            });
        }
        
        // Update visibility and state
        if (hasMore) {
            this.elements.loadMoreButton.style.display = 'block';
            this.elements.loadMoreButton.disabled = false;
        } else {
            this.elements.loadMoreButton.style.display = 'none';
        }
    }
    
    /**
     * Set loading state for button
     */
    setButtonLoading(button, isLoading, originalText) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Loading...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.innerHTML = originalText;
            button.classList.remove('loading');
        }
    }
    
    /**
     * Hide task form
     */
    hideTaskForm() {
        if (this.app.components?.taskForm) {
            this.app.components.taskForm.destroy();
            this.app.components.taskForm = null;
        }
    }
    
    /**
     * Sanitize HTML string
     */
    sanitizeHtml(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
    
    /**
     * Show confirmation dialog
     */
    async showConfirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';
            dialog.style.cssText = `
                background: white;
                padding: 24px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                max-width: 400px;
                width: 90%;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 16px 0;">${this.sanitizeHtml(title)}</h3>
                <p style="margin: 0 0 24px 0;">${this.sanitizeHtml(message)}</p>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn-cancel" style="padding: 8px 16px;">Cancel</button>
                    <button class="btn-confirm" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px;">Confirm</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            const cleanup = () => {
                overlay.remove();
            };
            
            dialog.querySelector('.btn-cancel').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            dialog.querySelector('.btn-confirm').addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }
    
    /**
     * Update view mode UI
     */
    updateViewMode(mode) {
        // Update tab states
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === mode);
        });
        
        // Update view visibility
        if (this.elements.scheduleView) {
            this.elements.scheduleView.style.display = mode === 'schedule' ? 'block' : 'none';
        }
        if (this.elements.taskView) {
            this.elements.taskView.style.display = mode === 'tasks' ? 'block' : 'none';
        }
        
        // Update state
        this.updateState({ currentView: mode });
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear any intervals
        super.cleanup();
    }
}