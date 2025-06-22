/**
 * Task Index Manager for O(1) lookups and efficient filtering
 * Manages multiple indexes for tasks to enable fast filtering and search
 */
class TaskIndexManager {
    constructor() {
        // Primary indexes for O(1) lookups
        this.taskById = new Map();              // taskId -> task
        this.tasksBySection = new Map();        // section -> Set of taskIds
        this.tasksByPriority = new Map();       // priority -> Set of taskIds
        this.tasksByCompletion = new Map();     // true/false -> Set of taskIds
        
        // Search optimization
        this.searchTokens = new Map();         // taskId -> lowercase tokens
        this.tokenToTasks = new Map();         // token -> Set of taskIds
    }
    
    /**
     * Build indexes from task array
     */
    buildIndexes(tasks) {
        // Clear existing indexes
        this.clearIndexes();
        
        tasks.forEach(task => {
            this.addTaskToIndexes(task);
        });
    }
    
    /**
     * Clear all indexes
     */
    clearIndexes() {
        this.taskById.clear();
        this.tasksBySection.clear();
        this.tasksByPriority.clear();
        this.tasksByCompletion.clear();
        this.searchTokens.clear();
        this.tokenToTasks.clear();
    }
    
    /**
     * Remove single task from all indexes
     */
    removeTaskFromIndexes(task) {
        // Remove from primary index
        this.taskById.delete(task.id);
        
        // Remove from section index
        const sectionSet = this.tasksBySection.get(task.section);
        if (sectionSet) {
            sectionSet.delete(task.id);
            if (sectionSet.size === 0) {
                this.tasksBySection.delete(task.section);
            }
        }
        
        // Remove from priority index
        const prioritySet = this.tasksByPriority.get(task.priority);
        if (prioritySet) {
            prioritySet.delete(task.id);
            if (prioritySet.size === 0) {
                this.tasksByPriority.delete(task.priority);
            }
        }
        
        // Remove from completion index
        const completionSet = this.tasksByCompletion.get(!!task.completed);
        if (completionSet) {
            completionSet.delete(task.id);
            if (completionSet.size === 0) {
                this.tasksByCompletion.delete(!!task.completed);
            }
        }
        
        // Remove from search tokens
        const tokens = this.searchTokens.get(task.id);
        if (tokens) {
            tokens.forEach(token => {
                const tokenSet = this.tokenToTasks.get(token);
                if (tokenSet) {
                    tokenSet.delete(task.id);
                    if (tokenSet.size === 0) {
                        this.tokenToTasks.delete(token);
                    }
                }
            });
            this.searchTokens.delete(task.id);
        }
    }
    
    /**
     * Add single task to all indexes
     */
    addTaskToIndexes(task) {
        // Primary index
        this.taskById.set(task.id, task);
        
        // Section index
        if (!this.tasksBySection.has(task.section)) {
            this.tasksBySection.set(task.section, new Set());
        }
        this.tasksBySection.get(task.section).add(task.id);
        
        // Priority index
        if (!this.tasksByPriority.has(task.priority)) {
            this.tasksByPriority.set(task.priority, new Set());
        }
        this.tasksByPriority.get(task.priority).add(task.id);
        
        // Completion index
        const isCompleted = !!task.completed;
        if (!this.tasksByCompletion.has(isCompleted)) {
            this.tasksByCompletion.set(isCompleted, new Set());
        }
        this.tasksByCompletion.get(isCompleted).add(task.id);
        
        // Search tokens
        const tokens = this.tokenizeText(task.text || '');
        this.searchTokens.set(task.id, tokens);
        
        tokens.forEach(token => {
            if (!this.tokenToTasks.has(token)) {
                this.tokenToTasks.set(token, new Set());
            }
            this.tokenToTasks.get(token).add(task.id);
        });
    }
    
    /**
     * Tokenize text for search optimization
     */
    tokenizeText(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')  // Remove punctuation for better matching
            .split(/\s+/)
            .filter(token => token.length > 2);  // Ignore very short words
    }
    
    /**
     * Get tasks matching all filters using indexes
     */
    getFilteredTaskIds(filters) {
        let resultIds = null;
        
        // Start with the most restrictive filter
        if (filters.section && filters.section !== 'all') {
            resultIds = new Set(this.tasksBySection.get(filters.section) || []);
        }
        
        if (filters.priority && filters.priority !== 'all') {
            const priorityIds = this.tasksByPriority.get(filters.priority) || new Set();
            resultIds = resultIds 
                ? this.intersectSets(resultIds, priorityIds)
                : new Set(priorityIds);
        }
        
        if (filters.completed && filters.completed !== 'all') {
            const isCompleted = filters.completed === 'completed';
            const completionIds = this.tasksByCompletion.get(isCompleted) || new Set();
            resultIds = resultIds
                ? this.intersectSets(resultIds, completionIds)
                : new Set(completionIds);
        }
        
        // If no filters, return all task IDs
        if (!resultIds) {
            resultIds = new Set(this.taskById.keys());
        }
        
        return resultIds;
    }
    
    /**
     * Efficient set intersection
     */
    intersectSets(set1, set2) {
        // Iterate over smaller set for efficiency
        const [smaller, larger] = set1.size <= set2.size ? [set1, set2] : [set2, set1];
        const result = new Set();
        
        for (const item of smaller) {
            if (larger.has(item)) {
                result.add(item);
            }
        }
        
        return result;
    }
    
    /**
     * Search tasks using token index
     */
    searchTasks(query, taskIds = null) {
        if (!query) return taskIds || new Set(this.taskById.keys());
        
        const queryTokens = this.tokenizeText(query);
        if (queryTokens.length === 0) return taskIds || new Set(this.taskById.keys());
        
        // Find tasks containing all query tokens
        let matchingIds = null;
        
        for (const token of queryTokens) {
            let tokenMatches = new Set();
            
            // Find all tasks containing this token (prefix match)
            for (const [indexToken, taskIdSet] of this.tokenToTasks) {
                if (indexToken.startsWith(token)) {
                    taskIdSet.forEach(id => tokenMatches.add(id));
                }
            }
            
            matchingIds = matchingIds
                ? this.intersectSets(matchingIds, tokenMatches)
                : tokenMatches;
                
            // Early exit if no matches
            if (matchingIds.size === 0) break;
        }
        
        // Intersect with provided taskIds if given
        if (taskIds) {
            matchingIds = this.intersectSets(matchingIds, taskIds);
        }
        
        return matchingIds || new Set();
    }
}

// Export for use in other modules
export { TaskIndexManager };

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.TaskIndexManager = TaskIndexManager;
}