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
            { path: './task-parser.js', export: 'TaskParser', name: 'TaskParser' },
            { path: './llm-service.js', export: 'LLMService', name: 'LLMService' },
            { path: './firestore.js', export: 'FirestoreService', name: 'FirestoreService' },
            { path: './task-data-service.js', export: 'TaskDataService', name: 'TaskDataService' },
            { path: './schedule-data-service.js', export: 'ScheduleDataService', name: 'ScheduleDataService' }
        ]);

        // Make primary modules globally available for compatibility
        primaryModules.forEach((module, name) => {
            window[name] = module;
        });

        // Phase 2: Load the main app module
        console.log('📦 Phase 2: Loading main application...');
        const SecretaryApp = await moduleLoader.loadModule('./app.js', 'SecretaryApp');
        
        // Create app instance
        appInstance = new SecretaryApp();
        window.app = appInstance;

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
            './ui-components.js',
            './pattern-analyzer.js'
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