import { BaseManager } from '../base-manager.js';

/**
 * SettingsManager
 * Handles all application settings including API keys, model selection, and preferences
 */
export class SettingsManager extends BaseManager {
    constructor(app) {
        super(app);
        this.refreshInterval = null;
        this.defaultSettings = {
            openrouterApiKey: '',
            selectedModel: 'deepseek/deepseek-r1',
            refreshInterval: 30,
            notifications: true,
            theme: 'light'
        };
    }
    
    /**
     * Initialize the settings manager
     */
    async initialize() {
        // Initialize event listeners after UI elements are ready
        this.initializeEventListeners();
    }
    
    /**
     * Initialize event listeners for settings UI
     */
    initializeEventListeners() {
        // Model badge click to open settings
        this.app.addEventListener(this.elements.modelBadge, 'click', () => this.openSettings());
        
        // Settings button
        this.app.addEventListener(this.elements.settingsBtn, 'click', () => this.openSettings());
        
        // Modal close button
        this.app.addEventListener(this.elements.modalClose, 'click', () => this.closeSettings());
        
        // Save settings button
        this.app.addEventListener(this.elements.saveSettings, 'click', () => this.saveSettings());
        
        // Toggle API key visibility
        this.app.addEventListener(this.elements.toggleApiKeyVisibility, 'click', () => this.toggleApiKeyVisibility());
        
        // Close modal on backdrop click
        this.app.addEventListener(this.elements.settingsModal, 'click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });
    }
    
    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const settings = await this.storageService.loadSettings();
            this.updateState({ settings });
            console.log('Settings loaded:', settings);
            
            // Apply loaded settings
            if (settings.openrouterApiKey) {
                this.llmService.setApiKey(settings.openrouterApiKey);
            }
            if (settings.selectedModel) {
                this.llmService.setModel(settings.selectedModel);
            }
            
            // Update UI
            this.updateModelBadge();
            this.setupAutoRefresh();
            
            return settings;
        } catch (error) {
            console.error('Error loading settings:', error);
            const defaultSettings = { ...this.defaultSettings };
            this.updateState({ settings: defaultSettings });
            return defaultSettings;
        }
    }
    
    /**
     * Save settings to storage
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
            this.updateState({ settings: newSettings });

            // Update LLM service
            this.llmService.setApiKey(newSettings.openrouterApiKey);
            this.llmService.setModel(newSettings.selectedModel);
            
            // Update model badge display
            this.updateModelBadge();

            // Update auto-refresh
            this.setupAutoRefresh();

            // Close modal
            this.closeSettings();

            // Emit settings updated event
            this.emit('settings-updated', newSettings);

            this.app.uiManager.showToast('Settings saved', 'success');

            // Refresh schedule if API key was added and no current schedule
            if (newSettings.openrouterApiKey && !this.state.currentSchedule) {
                this.emit('request-schedule-refresh');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.app.uiManager.showToast('Failed to save settings', 'error');
        }
    }
    
    /**
     * Open settings modal
     */
    openSettings() {
        const settings = this.state.settings || this.defaultSettings;
        
        // Populate current settings
        this.elements.openrouterKey.value = settings.openrouterApiKey || '';
        this.elements.modelSelect.value = settings.selectedModel || 'deepseek/deepseek-r1';
        this.elements.refreshInterval.value = settings.refreshInterval || 30;
        
        this.elements.settingsModal.style.display = 'flex';
    }
    
    /**
     * Close settings modal
     */
    closeSettings() {
        this.elements.settingsModal.style.display = 'none';
    }
    
    /**
     * Toggle API key visibility
     */
    toggleApiKeyVisibility() {
        const input = this.elements.openrouterKey;
        const icon = this.elements.toggleApiKeyVisibility.querySelector('.toggle-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = '👁️‍🗨️';
            this.elements.toggleApiKeyVisibility.title = 'Hide API key';
        } else {
            input.type = 'password';
            icon.textContent = '👁️';
            this.elements.toggleApiKeyVisibility.title = 'Show API key';
        }
    }
    
    /**
     * Setup auto-refresh interval
     */
    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        const settings = this.state.settings || this.defaultSettings;
        const intervalMinutes = settings.refreshInterval || 30;
        
        if (intervalMinutes > 0) {
            this.refreshInterval = setInterval(() => {
                this.emit('request-schedule-refresh');
            }, intervalMinutes * 60 * 1000);
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
     * Get current settings
     */
    getSettings() {
        return this.state.settings || this.defaultSettings;
    }
    
    /**
     * Check if API key is configured
     */
    hasApiKey() {
        const settings = this.getSettings();
        return !!(settings.openrouterApiKey && settings.openrouterApiKey.trim());
    }
    
    /**
     * Get current model
     */
    getCurrentModel() {
        const settings = this.getSettings();
        return settings.selectedModel || 'deepseek/deepseek-r1';
    }
    
    /**
     * Configure LLM service with current settings
     */
    async configureLLMService() {
        const settings = this.getSettings();
        
        if (settings.openrouterApiKey) {
            this.llmService.setApiKey(settings.openrouterApiKey);
        }
        
        if (settings.selectedModel) {
            this.llmService.setModel(settings.selectedModel);
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        super.cleanup();
    }
}