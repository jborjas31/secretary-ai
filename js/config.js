/**
 * Configuration file for Secretary AI
 * Contains Firebase config, API settings, and app constants
 */

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBJw_vR1LfN-izs6ghOM7e5ImbQy73KHpY",
  authDomain: "secretary-ai-1bad7.firebaseapp.com",
  projectId: "secretary-ai-1bad7",
  storageBucket: "secretary-ai-1bad7.firebasestorage.app",
  messagingSenderId: "662034359495",
  appId: "1:662034359495:web:044ab6012f59f8645c8ae2"
};


// App configuration
const APP_CONFIG = {
    name: 'Secretary AI',
    version: '1.0.0',
    
    // Default settings
    defaults: {
        selectedModel: 'deepseek/deepseek-r1',
        refreshInterval: 30, // minutes
        maxScheduleHours: 12, // hours to schedule ahead
        maxTasks: 20, // maximum tasks to include in schedule
        cacheExpiry: 3600000, // 1 hour in milliseconds
    },
    
    // OpenRouter settings
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        defaultModel: 'deepseek/deepseek-r1',
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
                      window.location.hostname === '127.0.0.1';

// Environment-specific configuration
const ENV_CONFIG = {
    development: {
        debug: true,
        logLevel: 'verbose',
        enableFirestore: true, // Enable Firestore for local testing
        mockData: false, // Use real API calls in development too
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

// Base URL detection for GitHub Pages and other deployments
const getBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '';
    }
    if (window.location.hostname.includes('github.io')) {
        // For GitHub Pages: https://username.github.io/repository-name/
        const pathParts = window.location.pathname.split('/').filter(part => part);
        return pathParts.length > 0 ? `/${pathParts[0]}` : '';
    }
    return '';
};

// Utility functions
const Config = {
    // Get base URL for the application
    getBaseUrl() {
        return getBaseUrl();
    },
    
    // Get full URL for a resource
    getResourceUrl(path) {
        const baseUrl = this.getBaseUrl();
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    },
    
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
                text: "Pick up package from Correos",
                duration: "30 minutes",
                priority: "high",
                category: "urgent"
            },
            {
                time: "15:30",
                text: "Refill prepaid Movistar data sim card",
                duration: "45 minutes",
                priority: "high",
                category: "urgent"
            },
            {
                time: "16:30",
                text: "Prepare work lunch for tomorrow",
                duration: "30 minutes",
                priority: "medium",
                category: "routine"
            },
            {
                time: "17:00",
                text: "Check and respond to emails",
                duration: "15 minutes",
                priority: "medium",
                category: "work"
            },
            {
                time: "17:30",
                text: "Take medicines and supplements (2g Lysine)",
                duration: "10 minutes",
                priority: "high",
                category: "health"
            },
            {
                time: "18:00",
                text: "Journal - Log today's activities",
                duration: "20 minutes",
                priority: "medium",
                category: "personal"
            },
            {
                time: "19:00",
                text: "Plan tomorrow's activities and priorities",
                duration: "30 minutes",
                priority: "medium",
                category: "personal"
            },
            {
                time: "21:00",
                text: "Apply topical minoxidil on scalp",
                duration: "5 minutes",
                priority: "medium",
                category: "health"
            },
            {
                time: "21:30",
                text: "Brush teeth and use nasal strips before sleep",
                duration: "10 minutes",
                priority: "high",
                category: "health"
            }
        ],
        summary: "Schedule prioritizes urgent tasks first (package pickup, SIM refill), followed by work and routine activities. Evening focuses on personal planning and health routines to prepare for tomorrow.",
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