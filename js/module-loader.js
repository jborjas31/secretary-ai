/**
 * Module Loader Utility
 * Provides simple dynamic module loading with caching and loading states
 */

class ModuleLoader {
    constructor() {
        // Cache for loaded modules
        this.moduleCache = new Map();
        
        // Track loading states
        this.loadingModules = new Map();
        
        // Loading indicator element
        this.loadingIndicator = null;
        this.activeLoads = 0;
        
        // Initialize loading indicator
        this.initializeLoadingIndicator();
    }

    /**
     * Initialize the loading indicator
     */
    initializeLoadingIndicator() {
        // Create loading indicator element
        const indicator = document.createElement('div');
        indicator.id = 'module-loading-indicator';
        indicator.innerHTML = `
            <div class="module-loading-spinner"></div>
            <div class="module-loading-text">Loading...</div>
        `;
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            display: none;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            z-index: 10000;
        `;
        
        // Add spinner styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes module-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .module-loading-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #ffffff30;
                border-top-color: white;
                border-radius: 50%;
                animation: module-spin 0.8s linear infinite;
            }
            #module-loading-indicator {
                display: none;
            }
            #module-loading-indicator.active {
                display: flex !important;
            }
        `;
        
        // Add to page when DOM is ready
        if (document.body) {
            document.head.appendChild(style);
            document.body.appendChild(indicator);
            this.loadingIndicator = indicator;
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.head.appendChild(style);
                document.body.appendChild(indicator);
                this.loadingIndicator = indicator;
            });
        }
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show = true) {
        if (!this.loadingIndicator) return;
        
        if (show) {
            this.activeLoads++;
            this.loadingIndicator.classList.add('active');
        } else {
            this.activeLoads--;
            if (this.activeLoads <= 0) {
                this.activeLoads = 0;
                this.loadingIndicator.classList.remove('active');
            }
        }
    }

    /**
     * Load a module dynamically
     * @param {string} modulePath - Path to the module
     * @param {string} exportName - Optional specific export to retrieve
     * @returns {Promise<any>} The loaded module or specific export
     */
    async loadModule(modulePath, exportName = null) {
        // Check cache first
        const cacheKey = `${modulePath}:${exportName || 'default'}`;
        if (this.moduleCache.has(cacheKey)) {
            console.log(`📦 Module cache hit: ${modulePath}`);
            return this.moduleCache.get(cacheKey);
        }

        // Check if already loading
        if (this.loadingModules.has(modulePath)) {
            console.log(`⏳ Module already loading: ${modulePath}`);
            return this.loadingModules.get(modulePath);
        }

        // Start loading
        console.log(`📥 Loading module: ${modulePath}`);
        this.showLoading(true);
        
        const loadPromise = this.performLoad(modulePath, exportName, cacheKey);
        this.loadingModules.set(modulePath, loadPromise);
        
        try {
            const result = await loadPromise;
            this.loadingModules.delete(modulePath);
            this.showLoading(false);
            return result;
        } catch (error) {
            this.loadingModules.delete(modulePath);
            this.showLoading(false);
            throw error;
        }
    }

    /**
     * Perform the actual module load
     */
    async performLoad(modulePath, exportName, cacheKey) {
        try {
            const startTime = performance.now();
            
            // Dynamic import
            const module = await import(modulePath);
            
            // Get the requested export
            let result;
            if (exportName) {
                if (!(exportName in module)) {
                    throw new Error(`Export '${exportName}' not found in ${modulePath}`);
                }
                result = module[exportName];
            } else {
                // Default to 'default' export, or the whole module
                result = module.default || module;
            }
            
            // Cache the result
            this.moduleCache.set(cacheKey, result);
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ Module loaded: ${modulePath} (${loadTime.toFixed(2)}ms)`);
            
            // Record performance metric
            if (window.performanceMonitor) {
                window.performanceMonitor.recordMetric('module-load', loadTime, { module: modulePath });
            }
            
            return result;
            
        } catch (error) {
            console.error(`❌ Failed to load module ${modulePath}:`, error);
            
            // Try fallback to global if available
            if (exportName && window[exportName]) {
                console.log(`📌 Using global fallback for ${exportName}`);
                this.moduleCache.set(cacheKey, window[exportName]);
                return window[exportName];
            }
            
            throw error;
        }
    }

    /**
     * Load multiple modules in parallel
     * @param {Array} modules - Array of module configurations
     * @returns {Promise<Object>} Map of loaded modules
     */
    async loadModules(modules) {
        const startTime = performance.now();
        console.log(`📦 Loading ${modules.length} modules in parallel...`);
        
        const promises = modules.map(config => {
            if (typeof config === 'string') {
                return this.loadModule(config).then(m => ({ path: config, module: m }));
            } else {
                return this.loadModule(config.path, config.export).then(m => ({ 
                    path: config.path, 
                    name: config.name || config.export || config.path,
                    module: m 
                }));
            }
        });
        
        const results = await Promise.all(promises);
        
        // Convert to map
        const moduleMap = new Map();
        results.forEach(({ path, name, module }) => {
            moduleMap.set(name || path, module);
        });
        
        const totalTime = performance.now() - startTime;
        console.log(`✅ All modules loaded (${totalTime.toFixed(2)}ms)`);
        
        return moduleMap;
    }

    /**
     * Preload modules without executing them immediately
     * @param {Array<string>} modulePaths - Paths to preload
     */
    async preloadModules(modulePaths) {
        console.log(`🔄 Preloading ${modulePaths.length} modules...`);
        
        // Use link rel="modulepreload" for better performance
        modulePaths.forEach(path => {
            const link = document.createElement('link');
            link.rel = 'modulepreload';
            link.href = path;
            document.head.appendChild(link);
        });
    }

    /**
     * Clear module cache
     */
    clearCache() {
        this.moduleCache.clear();
        console.log('🗑️ Module cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.moduleCache.size,
            modules: Array.from(this.moduleCache.keys())
        };
    }
}

// Create and export singleton instance
const moduleLoader = new ModuleLoader();

// Also export the class for testing
export { ModuleLoader, moduleLoader as default };

// Make available globally for gradual migration
window.moduleLoader = moduleLoader;