/**
 * Application Initialization with Lazy Loading
 * Bootstraps the app with optimized module loading
 */

import moduleLoader from './module-loader.js';

// Track initialization state
let appInitialized = false;
let appInstance = null;

/**
 * Initialize the application with lazy loading
 */
async function initializeApp() {
    if (appInitialized) {
        console.log('App already initialized');
        return appInstance;
    }

    try {
        console.log('🚀 Starting optimized app initialization...');
        const startTime = performance.now();

        // Phase 1: Load primary modules needed for basic functionality
        console.log('📦 Phase 1: Loading primary modules...');
        const primaryModules = await moduleLoader.loadModules([
            { path: './validation-utils.js', export: 'ValidationUtils', name: 'ValidationUtils' },
            { path: './event-registry.js', export: 'EventListenerRegistry', name: 'EventListenerRegistry' },
            { path: './event-registry.js', export: 'ComponentWithListeners', name: 'ComponentWithListeners' },
            { path: './llm-service.js', export: 'LLMService', name: 'LLMService' },
            { path: './firestore.js', export: 'FirestoreService', name: 'FirestoreService' },
            { path: './task-data-service.js', export: 'TaskDataService', name: 'TaskDataService' },
            { path: './schedule-data-service.js', export: 'ScheduleDataService', name: 'ScheduleDataService' },
            { path: './task-index-manager.js', export: 'TaskIndexManager', name: 'TaskIndexManager' },
            { path: './filter-cache.js', export: 'FilterCache', name: 'FilterCache' },
            { path: './app-state.js', export: 'AppState', name: 'AppState' },
            { path: './base-manager.js', export: 'BaseManager', name: 'BaseManager' },
            { path: './managers/settings-manager.js', export: 'SettingsManager', name: 'SettingsManager' },
            { path: './managers/date-navigation-manager.js', export: 'DateNavigationManager', name: 'DateNavigationManager' },
            { path: './managers/ui-manager.js', export: 'UIManager', name: 'UIManager' },
            { path: './managers/schedule-manager.js', export: 'ScheduleManager', name: 'ScheduleManager' },
            { path: './managers/task-manager.js', export: 'TaskManager', name: 'TaskManager' }
        ]);

        // Make primary modules globally available for compatibility
        primaryModules.forEach((module, name) => {
            window[name] = module;
        });

        // Phase 2: Load the main app controller module
        console.log('📦 Phase 2: Loading main application controller...');
        const AppController = await moduleLoader.loadModule('./app-controller.js', 'AppController');
        
        // Create app instance
        appInstance = new AppController();
        window.app = appInstance;
        window.SecretaryApp = AppController; // Maintain backward compatibility

        // Initialize the app
        await appInstance.initialize();

        const loadTime = performance.now() - startTime;
        console.log(`✅ App initialized in ${loadTime.toFixed(2)}ms`);

        appInitialized = true;

        // Phase 3: Preload secondary modules in background
        setTimeout(() => {
            console.log('📦 Phase 3: Preloading secondary modules...');
            preloadSecondaryModules();
        }, 1000);

        return appInstance;

    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        
        // Show user-friendly error
        showInitError(error);
        throw error;
    }
}

/**
 * Preload secondary modules that might be needed soon
 */
async function preloadSecondaryModules() {
    try {
        // Preload modules that are likely to be used
        await moduleLoader.preloadModules([
            './js/ui-components.js',
            './js/pattern-analyzer.js'
        ]);
        
        console.log('✅ Secondary modules preloaded');
    } catch (error) {
        console.error('Failed to preload secondary modules:', error);
        // Non-critical error, don't throw
    }
}

/**
 * Lazy load calendar view when needed
 */
window.loadCalendarView = async function() {
    try {
        if (!window.CalendarView) {
            const CalendarView = await moduleLoader.loadModule('./calendar-view.js', 'CalendarView');
            window.CalendarView = CalendarView;
        }
        return window.CalendarView;
    } catch (error) {
        console.error('Failed to load calendar view:', error);
        throw error;
    }
};

/**
 * Lazy load insights modal when needed
 */
window.loadInsightsModal = async function() {
    try {
        if (!window.InsightsModal) {
            // Load pattern analyzer first if not loaded
            if (!window.PatternAnalyzer) {
                const PatternAnalyzer = await moduleLoader.loadModule('./pattern-analyzer.js', 'PatternAnalyzer');
                window.PatternAnalyzer = PatternAnalyzer;
            }
            
            const InsightsModal = await moduleLoader.loadModule('./insights-modal.js', 'InsightsModal');
            window.InsightsModal = InsightsModal;
        }
        return window.InsightsModal;
    } catch (error) {
        console.error('Failed to load insights modal:', error);
        throw error;
    }
};

/**
 * Lazy load UI components for task management
 */
window.loadUIComponents = async function() {
    try {
        if (!window.UIComponents) {
            await moduleLoader.loadModule('./ui-components.js');
            // Don't reassign - ui-components.js already sets window.UIComponents
        }
        return window.UIComponents;
    } catch (error) {
        console.error('Failed to load UI components:', error);
        throw error;
    }
};

/**
 * Show initialization error to user
 */
function showInitError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f44336;
        color: white;
        padding: 20px;
        border-radius: 4px;
        max-width: 400px;
        text-align: center;
        z-index: 10001;
    `;
    errorDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">Initialization Error</h3>
        <p style="margin: 0 0 10px 0;">Failed to load application modules. Please refresh the page.</p>
        <button onclick="location.reload()" style="
            background: white;
            color: #f44336;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        ">Refresh Page</button>
    `;
    document.body.appendChild(errorDiv);
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}

// Export for testing
export { initializeApp, appInstance };