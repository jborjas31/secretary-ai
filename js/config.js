/**
 * Configuration file for Secretary AI
 * Contains Firebase config, API settings, and app constants
 */

// Firebase configuration
// Replace with your actual Firebase config
const FIREBASE_CONFIG = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// App configuration
const APP_CONFIG = {
    name: 'Secretary AI',
    version: '1.0.0',
    
    // Default settings
    defaults: {
        refreshInterval: 30, // minutes
        maxScheduleHours: 12, // hours to schedule ahead
        maxTasks: 20, // maximum tasks to include in schedule
        cacheExpiry: 3600000, // 1 hour in milliseconds
    },
    
    // OpenRouter settings
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        defaultModel: 'anthropic/claude-3.5-sonnet',
        maxTokens: 2000,
        temperature: 0.3,
        timeout: 30000, // 30 seconds
    },
    
    // UI settings
    ui: {
        animationDuration: 300, // milliseconds
        toastDuration: 5000, // milliseconds
        loadingDelay: 500, // milliseconds before showing loading
    },
    
    // Storage settings
    storage: {
        localStoragePrefix: 'secretary-ai-',
        maxLocalSchedules: 30, // keep last 30 days
        syncRetryAttempts: 3,
        syncRetryDelay: 1000, // milliseconds
    }
};

// Development mode detection
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('github.io');

// Environment-specific configuration
const ENV_CONFIG = {
    development: {
        debug: true,
        logLevel: 'verbose',
        enableFirestore: false, // Set to true when you have Firebase configured
        mockData: true,
    },
    production: {
        debug: false,
        logLevel: 'error',
        enableFirestore: true,
        mockData: false,
    }
};

// Get current environment config
const currentEnv = isDevelopment ? 'development' : 'production';
const ENVIRONMENT = ENV_CONFIG[currentEnv];

// Utility functions
const Config = {
    // Get Firebase config
    getFirebaseConfig() {
        return FIREBASE_CONFIG;
    },
    
    // Get app config
    getAppConfig() {
        return APP_CONFIG;
    },
    
    // Get environment config
    getEnvironment() {
        return ENVIRONMENT;
    },
    
    // Check if Firebase is configured
    isFirebaseConfigured() {
        return FIREBASE_CONFIG.apiKey !== 'your-api-key-here' && 
               FIREBASE_CONFIG.projectId !== 'your-project-id';
    },
    
    // Get debug mode
    isDebugMode() {
        return ENVIRONMENT.debug;
    },
    
    // Get log level
    getLogLevel() {
        return ENVIRONMENT.logLevel;
    },
    
    // Check if Firestore should be enabled
    shouldEnableFirestore() {
        return ENVIRONMENT.enableFirestore && this.isFirebaseConfigured();
    },
    
    // Get mock data setting
    shouldUseMockData() {
        return ENVIRONMENT.mockData;
    },
    
    // Log configuration info
    logConfigInfo() {
        if (this.isDebugMode()) {
            console.group('🔧 Secretary AI Configuration');
            console.log('Environment:', currentEnv);
            console.log('Debug Mode:', ENVIRONMENT.debug);
            console.log('Firebase Configured:', this.isFirebaseConfigured());
            console.log('Firestore Enabled:', this.shouldEnableFirestore());
            console.log('Mock Data:', this.shouldUseMockData());
            console.log('App Version:', APP_CONFIG.version);
            console.groupEnd();
        }
    }
};

// Mock data for development
const MOCK_DATA = {
    schedule: {
        schedule: [
            {
                time: "14:30",
                task: "Pick up package from Correos",
                duration: "30 minutes",
                priority: "high",
                category: "urgent"
            },
            {
                time: "15:30",
                task: "Refill prepaid Movistar data sim card",
                duration: "45 minutes",
                priority: "high",
                category: "urgent"
            },
            {
                time: "16:30",
                task: "Prepare work lunch",
                duration: "30 minutes",
                priority: "medium",
                category: "routine"
            },
            {
                time: "17:00",
                task: "Check email",
                duration: "15 minutes",
                priority: "medium",
                category: "routine"
            },
            {
                time: "17:30",
                task: "Take medicines and supplements",
                duration: "10 minutes",
                priority: "high",
                category: "routine"
            },
            {
                time: "18:00",
                task: "Journal - Log today's activities",
                duration: "20 minutes",
                priority: "medium",
                category: "personal"
            },
            {
                time: "19:00",
                task: "Plan tomorrow's activities",
                duration: "30 minutes",
                priority: "medium",
                category: "personal"
            },
            {
                time: "21:00",
                task: "Apply topical minoxidil on scalp",
                duration: "5 minutes",
                priority: "medium",
                category: "routine"
            }
        ],
        summary: "Your schedule focuses on urgent tasks first, then routine activities. The evening is reserved for personal planning and health routines.",
        generatedAt: new Date().toISOString(),
        generatedFor: new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        mock: true
    }
};

// Export configuration
window.Config = Config;
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.ENVIRONMENT = ENVIRONMENT;
window.MOCK_DATA = MOCK_DATA;

// Log configuration on load
Config.logConfigInfo();