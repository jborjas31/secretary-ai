/**
 * Firestore Service - Handles Firebase/Firestore integration for cross-device sync
 * Simple implementation without authentication for single-user app
 */

class FirestoreService {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.userId = 'default-user'; // Fixed user ID for single-user app
        this.config = null;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Initialize Firebase and Firestore
     */
    async initialize(firebaseConfig) {
        try {
            // Dynamically import Firebase SDK
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getFirestore, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Store modules for later use
            this.firestoreModules = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Initialize Firebase
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            
            this.config = firebaseConfig;
            this.initialized = true;
            
            console.log('Firestore initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Firestore:', error);
            this.initialized = false;
            throw error;
        }
    }

    /**
     * Check if Firestore is initialized and available
     */
    isAvailable() {
        return this.initialized && this.db !== null;
    }

    /**
     * Get document reference for user data
     */
    getUserDocRef(collection, docId = null) {
        const { doc, collection: firestoreCollection } = this.firestoreModules;
        const collectionRef = firestoreCollection(this.db, `users/${this.userId}/${collection}`);
        
        if (docId) {
            return doc(collectionRef, docId);
        }
        return collectionRef;
    }

    /**
     * Save schedule data to Firestore
     */
    async saveSchedule(date, scheduleData) {
        if (!this.isAvailable()) {
            console.warn('Firestore not available, skipping save');
            return null;
        }

        try {
            const { setDoc } = this.firestoreModules;
            const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            
            const docRef = this.getUserDocRef('schedules', dateKey);
            const dataToSave = {
                ...scheduleData,
                savedAt: new Date().toISOString(),
                userId: this.userId
            };

            await setDoc(docRef, dataToSave, { merge: true });
            console.log(`Schedule saved for ${dateKey}`);
            return dataToSave;
        } catch (error) {
            console.error('Error saving schedule:', error);
            throw error;
        }
    }

    /**
     * Load schedule data from Firestore
     */
    async loadSchedule(date) {
        if (!this.isAvailable()) {
            console.warn('Firestore not available, returning null');
            return null;
        }

        try {
            const { getDoc } = this.firestoreModules;
            const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
            
            const docRef = this.getUserDocRef('schedules', dateKey);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log(`Schedule loaded for ${dateKey}`);
                return data;
            } else {
                console.log(`No schedule found for ${dateKey}`);
                return null;
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
            return null;
        }
    }

    /**
     * Save task states (completion status, etc.)
     */
    async saveTaskStates(taskStates) {
        if (!this.isAvailable()) {
            console.warn('Firestore not available, skipping task states save');
            return null;
        }

        try {
            const { setDoc } = this.firestoreModules;
            const docRef = this.getUserDocRef('task_states', 'current');
            
            const dataToSave = {
                states: taskStates,
                updatedAt: new Date().toISOString(),
                userId: this.userId
            };

            await setDoc(docRef, dataToSave, { merge: true });
            console.log('Task states saved');
            return dataToSave;
        } catch (error) {
            console.error('Error saving task states:', error);
            throw error;
        }
    }

    /**
     * Load task states from Firestore
     */
    async loadTaskStates() {
        if (!this.isAvailable()) {
            console.warn('Firestore not available, returning empty states');
            return {};
        }

        try {
            const { getDoc } = this.firestoreModules;
            const docRef = this.getUserDocRef('task_states', 'current');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('Task states loaded');
                return data.states || {};
            } else {
                console.log('No task states found');
                return {};
            }
        } catch (error) {
            console.error('Error loading task states:', error);
            return {};
        }
    }

    /**
     * Save user settings to Firestore
     */
    async saveSettings(settings) {
        if (!this.isAvailable()) {
            console.warn('Firestore not available, skipping settings save');
            return null;
        }

        try {
            const { setDoc } = this.firestoreModules;
            const docRef = this.getUserDocRef('settings', 'user_preferences');
            
            const dataToSave = {
                ...settings,
                updatedAt: new Date().toISOString(),
                userId: this.userId
            };

            await setDoc(docRef, dataToSave, { merge: true });
            console.log('Settings saved');
            return dataToSave;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    /**
     * Load user settings from Firestore
     */
    async loadSettings() {
        if (!this.isAvailable()) {
            console.warn('Firestore not available, returning default settings');
            return this.getDefaultSettings();
        }

        try {
            const { getDoc } = this.firestoreModules;
            const docRef = this.getUserDocRef('settings', 'user_preferences');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('Settings loaded');
                return { ...this.getDefaultSettings(), ...data };
            } else {
                console.log('No settings found, using defaults');
                return this.getDefaultSettings();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            openrouterApiKey: '',
            selectedModel: 'deepseek/deepseek-r1',
            refreshInterval: 30,
            notifications: true,
            theme: 'light'
        };
    }

    /**
     * Get all schedules for a date range
     */
    async getScheduleHistory(startDate, endDate) {
        if (!this.isAvailable()) {
            console.warn('Firestore not available');
            return [];
        }

        try {
            const { query, where, orderBy, getDocs } = this.firestoreModules;
            const collectionRef = this.getUserDocRef('schedules');
            
            const startKey = startDate.toISOString().split('T')[0];
            const endKey = endDate.toISOString().split('T')[0];
            
            const q = query(
                collectionRef,
                where('__name__', '>=', startKey),
                where('__name__', '<=', endKey),
                orderBy('__name__', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const schedules = [];
            
            querySnapshot.forEach((doc) => {
                schedules.push({
                    id: doc.id,
                    date: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`Loaded ${schedules.length} schedules from history`);
            return schedules;
        } catch (error) {
            console.error('Error loading schedule history:', error);
            return [];
        }
    }

    /**
     * Test Firestore connection
     */
    async testConnection() {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'Firestore not initialized'
            };
        }

        try {
            const { doc, getDoc } = this.firestoreModules;
            
            // Try to read a test document
            const testDoc = doc(this.db, 'test', 'connection');
            await getDoc(testDoc);
            
            return {
                success: true,
                message: 'Firestore connection successful'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean up old schedule data (keep last 30 days)
     */
    async cleanupOldSchedules(daysToKeep = 30) {
        if (!this.isAvailable()) {
            console.warn('Firestore not available');
            return;
        }

        try {
            const { query, where, getDocs, deleteDoc } = this.firestoreModules;
            const collectionRef = this.getUserDocRef('schedules');
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffKey = cutoffDate.toISOString().split('T')[0];
            
            const q = query(
                collectionRef,
                where('__name__', '<', cutoffKey)
            );
            
            const querySnapshot = await getDocs(q);
            const deletePromises = [];
            
            querySnapshot.forEach((docSnapshot) => {
                deletePromises.push(deleteDoc(docSnapshot.ref));
            });
            
            await Promise.all(deletePromises);
            console.log(`Cleaned up ${deletePromises.length} old schedules`);
        } catch (error) {
            console.error('Error cleaning up old schedules:', error);
        }
    }

    /**
     * Handle network state changes
     */
    onNetworkStateChange(isOnline) {
        if (isOnline && this.isAvailable()) {
            console.log('Back online, Firestore available');
            // Could trigger sync operations here
        } else {
            console.log('Offline or Firestore unavailable');
        }
    }
}

// Export for use in other modules
window.FirestoreService = FirestoreService;
export { FirestoreService };