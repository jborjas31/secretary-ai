/**
 * Task Parser - Converts tasks.md into structured format
 * Handles different task categories and generates unique IDs
 */

class TaskParser {
    constructor() {
        this.parsedTasks = null;
        this.lastParsed = null;
    }

    /**
     * Generate a stable ID for a task based on its content
     * This ensures the same task always gets the same ID across parses
     */
    generateTaskId(category, taskText) {
        // Create a stable ID by hashing category + task text
        const normalizedText = taskText.trim().toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' '); // Normalize whitespace
        
        const baseString = `${category}-${normalizedText}`;
        const hash = this.simpleHash(baseString);
        return `${category}-${hash}`;
    }
    
    /**
     * Simple hash function to create consistent IDs
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36); // Convert to base36 for shorter string
    }

    /**
     * Parse a date string and return a Date object
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle various date formats
        const patterns = [
            /(\w+) (\d+),?\s*(\w+)?/i, // "June 16, Monday" or "June 16"
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // "6/16/2024"
            /(\d{4})-(\d{1,2})-(\d{1,2})/,   // "2024-06-16"
        ];

        for (const pattern of patterns) {
            const match = dateStr.match(pattern);
            if (match) {
                try {
                    if (pattern === patterns[0]) {
                        // Month Day format
                        const monthNames = {
                            'january': 0, 'february': 1, 'march': 2, 'april': 3,
                            'may': 4, 'june': 5, 'july': 6, 'august': 7,
                            'september': 8, 'october': 9, 'november': 10, 'december': 11
                        };
                        const month = monthNames[match[1].toLowerCase()];
                        const day = parseInt(match[2]);
                        const year = new Date().getFullYear();
                        return new Date(year, month, day);
                    } else if (pattern === patterns[1]) {
                        // MM/DD/YYYY
                        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
                    } else if (pattern === patterns[2]) {
                        // YYYY-MM-DD
                        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                    }
                } catch (e) {
                    console.warn('Failed to parse date:', dateStr, e);
                }
            }
        }
        return null;
    }

    /**
     * Parse task details and extract sub-tasks/reminders
     */
    parseTaskDetails(lines, startIndex) {
        const details = [];
        const subTasks = [];
        let currentIndex = startIndex + 1;

        while (currentIndex < lines.length) {
            const line = lines[currentIndex].trim();
            
            // Stop if we hit a new major section or task
            if (line.startsWith('#') || 
                (line.startsWith('-') && !line.startsWith('  -') && !line.startsWith('    -'))) {
                break;
            }

            // Handle nested items (reminders, sub-tasks)
            if (line.startsWith('  -') || line.startsWith('    -')) {
                const cleanLine = line.replace(/^\s*-\s*/, '').trim();
                if (cleanLine) {
                    if (line.includes('Reminder:')) {
                        details.push({ type: 'reminder', text: cleanLine });
                    } else {
                        subTasks.push(cleanLine);
                    }
                }
            } else if (line && !line.startsWith('#')) {
                // Additional context or details
                details.push({ type: 'context', text: line });
            }

            currentIndex++;
        }

        return { details, subTasks, nextIndex: currentIndex };
    }

    /**
     * Parse the tasks.md content into structured format
     */
    async parseTasksFromMarkdown(markdownContent) {
        const lines = markdownContent.split('\n');
        const tasks = {
            todayTasks: [],
            undatedTasks: [],
            upcomingTasks: [],
            dailyTasks: [],
            weeklyTasks: [],
            monthlyTasks: [],
            yearlyTasks: []
        };

        let currentSection = null;
        let currentPriority = null;
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) {
                i++;
                continue;
            }

            // Identify sections
            if (line.startsWith('## TO DO tasks for today')) {
                currentSection = 'todayTasks';
                currentPriority = null;
            } else if (line.startsWith('## TO DO tasks without defined dates')) {
                currentSection = 'undatedTasks';
                currentPriority = null;
            } else if (line.startsWith('## Upcoming important dates')) {
                currentSection = 'upcomingTasks';
                currentPriority = null;
            } else if (line.startsWith('## Daily Tasks')) {
                currentSection = 'dailyTasks';
                currentPriority = null;
            } else if (line.startsWith('## Weekly Tasks')) {
                currentSection = 'weeklyTasks';
                currentPriority = null;
            } else if (line.startsWith('## Monthly Tasks')) {
                currentSection = 'monthlyTasks';
                currentPriority = null;
            } else if (line.startsWith('## Yearly Tasks')) {
                currentSection = 'yearlyTasks';
                currentPriority = null;
            } else if (line.startsWith('### Priority ')) {
                currentPriority = line.replace('### Priority ', '').replace(':', '').toLowerCase();
            } else if (line.startsWith('- ') && currentSection) {
                // Parse main task
                const taskText = line.replace(/^- /, '').trim();
                
                if (!taskText) {
                    i++;
                    continue;
                }

                // Parse additional details
                const { details, subTasks, nextIndex } = this.parseTaskDetails(lines, i);
                
                const task = {
                    id: this.generateTaskId(currentSection, taskText),
                    text: taskText,
                    section: currentSection,
                    priority: currentPriority || 'medium',
                    details: details,
                    subTasks: subTasks,
                    completed: false,
                    createdAt: new Date().toISOString()
                };

                // Special handling for different sections
                if (currentSection === 'upcomingTasks') {
                    // Try to extract date from task text
                    const dateMatch = taskText.match(/^(.+?),?\s*(\w+)$/);
                    if (dateMatch) {
                        task.date = this.parseDate(dateMatch[1]);
                        task.dayOfWeek = dateMatch[2];
                    } else {
                        task.date = this.parseDate(taskText);
                    }
                }

                tasks[currentSection].push(task);
                i = nextIndex - 1; // -1 because the loop will increment
            }

            i++;
        }

        this.parsedTasks = tasks;
        this.lastParsed = new Date();
        
        console.log('Tasks parsed successfully:', tasks);
        return tasks;
    }

    /**
     * Load and parse tasks from tasks.md file
     */
    async loadAndParseTasks() {
        try {
            // Use dynamic base URL for GitHub Pages compatibility
            const tasksUrl = window.Config ? window.Config.getResourceUrl('tasks.md') : './tasks.md';
            const response = await fetch(tasksUrl);
            if (!response.ok) {
                throw new Error(`Failed to load tasks.md: ${response.status}`);
            }
            
            const content = await response.text();
            const tasks = await this.parseTasksFromMarkdown(content);
            
            // Cache the parsed tasks for getCachedTasks() to use
            this.parsedTasks = tasks;
            this.lastParsed = new Date();
            
            return tasks;
        } catch (error) {
            console.error('Error loading tasks:', error);
            throw error;
        }
    }

    /**
     * Get tasks filtered by relevance for today
     */
    getRelevantTasks(tasks = null) {
        const taskData = tasks || this.parsedTasks;
        if (!taskData) return [];

        const today = new Date();
        const relevantTasks = [];

        // Always include today's tasks
        relevantTasks.push(...taskData.todayTasks);

        // Include upcoming tasks for today
        const todayUpcoming = taskData.upcomingTasks.filter(task => {
            if (!task.date) return false;
            const taskDate = new Date(task.date);
            return taskDate.toDateString() === today.toDateString();
        });
        relevantTasks.push(...todayUpcoming);

        // Include high-priority undated tasks
        const highPriorityUndated = taskData.undatedTasks.filter(task => 
            task.priority === 'high'
        );
        relevantTasks.push(...highPriorityUndated);

        // Always include daily tasks
        relevantTasks.push(...taskData.dailyTasks);

        // Include weekly tasks (sample a few)
        const weeklySelection = taskData.weeklyTasks.slice(0, 3);
        relevantTasks.push(...weeklySelection);

        return relevantTasks;
    }

    /**
     * Convert tasks to a format suitable for LLM processing
     */
    formatTasksForLLM(tasks) {
        const relevantTasks = this.getRelevantTasks(tasks);
        
        return relevantTasks.map(task => {
            let formattedTask = `${task.text}`;
            
            if (task.subTasks && task.subTasks.length > 0) {
                formattedTask += `\n  Sub-tasks: ${task.subTasks.join(', ')}`;
            }
            
            if (task.details && task.details.length > 0) {
                const reminders = task.details.filter(d => d.type === 'reminder');
                if (reminders.length > 0) {
                    formattedTask += `\n  Reminders: ${reminders.map(r => r.text).join(', ')}`;
                }
            }
            
            return {
                id: task.id,
                content: formattedTask,
                section: task.section,
                priority: task.priority,
                date: task.date
            };
        });
    }

    /**
     * Get cached tasks or reload if stale
     */
    async getCachedTasks() {
        // Reload if no cached data or data is older than 1 hour
        if (!this.parsedTasks || 
            !this.lastParsed || 
            (Date.now() - this.lastParsed.getTime()) > 60 * 60 * 1000) {
            await this.loadAndParseTasks();
        }
        
        return this.parsedTasks;
    }

    /**
     * Migrate parsed tasks to Firestore using TaskDataService
     */
    async migrateToFirestore(taskDataService) {
        if (!taskDataService || !taskDataService.isAvailable()) {
            console.warn('TaskDataService not available for migration');
            return { success: false, error: 'TaskDataService not available' };
        }

        try {
            // Get latest parsed tasks
            const tasks = await this.getCachedTasks();
            
            console.log('Starting migration of tasks to Firestore...');
            const migrationResult = await taskDataService.migrateTasks(tasks);
            
            if (migrationResult.success) {
                console.log(`Migration completed: ${migrationResult.migrated} tasks migrated`);
            } else {
                console.error('Migration failed:', migrationResult.error);
            }
            
            return migrationResult;
        } catch (error) {
            console.error('Error during migration:', error);
            return {
                success: false,
                error: error.message,
                migrated: 0
            };
        }
    }

    /**
     * Export tasks from Firestore back to tasks.md format
     */
    async exportToMarkdown(taskDataService) {
        if (!taskDataService || !taskDataService.isAvailable()) {
            console.warn('TaskDataService not available for export');
            return null;
        }

        try {
            // Get all tasks from Firestore
            const allTasks = await taskDataService.getAllTasks();
            
            // Group tasks by section
            const tasksBySection = {
                todayTasks: [],
                undatedTasks: [],
                upcomingTasks: [],
                dailyTasks: [],
                weeklyTasks: [],
                monthlyTasks: [],
                yearlyTasks: []
            };

            // Sort tasks into sections
            allTasks.forEach(task => {
                const section = task.section || 'undatedTasks';
                if (tasksBySection[section]) {
                    tasksBySection[section].push(task);
                }
            });

            // Generate markdown content
            let markdown = '# Tasks and Responsibilities\n';

            // Today's tasks
            markdown += '## TO DO tasks for today\n';
            if (tasksBySection.todayTasks.length > 0) {
                tasksBySection.todayTasks.forEach(task => {
                    markdown += `- ${task.text}\n`;
                    markdown += this.formatTaskDetails(task);
                });
            } else {
                markdown += '- \n';
            }
            markdown += '\n';

            // Undated tasks
            markdown += '## TO DO tasks without defined dates\n';
            const undatedByPriority = this.groupTasksByPriority(tasksBySection.undatedTasks);
            
            ['high', 'medium', 'low'].forEach(priority => {
                if (undatedByPriority[priority] && undatedByPriority[priority].length > 0) {
                    markdown += `### Priority ${priority.charAt(0).toUpperCase() + priority.slice(1)}:\n`;
                    undatedByPriority[priority].forEach(task => {
                        markdown += `- ${task.text}\n`;
                        markdown += this.formatTaskDetails(task);
                    });
                }
            });
            markdown += '\n';

            // Upcoming tasks
            markdown += '## Upcoming important dates\n';
            if (tasksBySection.upcomingTasks.length > 0) {
                // Sort by date
                const sortedUpcoming = tasksBySection.upcomingTasks.sort((a, b) => {
                    if (!a.date && !b.date) return 0;
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return new Date(a.date) - new Date(b.date);
                });

                sortedUpcoming.forEach(task => {
                    if (task.date) {
                        const date = new Date(task.date);
                        const dateStr = date.toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric' 
                        });
                        const dayStr = date.toLocaleDateString('en-US', { weekday: 'long' });
                        markdown += `- ${dateStr}, ${dayStr}\n`;
                        markdown += `  - ${task.text}\n`;
                    } else {
                        markdown += `- ${task.text}\n`;
                    }
                    markdown += this.formatTaskDetails(task, '    ');
                });
            }
            markdown += '\n';

            // Daily, Weekly, Monthly, Yearly tasks
            const sectionTitles = {
                dailyTasks: 'Daily Tasks',
                weeklyTasks: 'Weekly Tasks',
                monthlyTasks: 'Monthly Tasks',
                yearlyTasks: 'Yearly Tasks'
            };

            Object.keys(sectionTitles).forEach(sectionKey => {
                markdown += `## ${sectionTitles[sectionKey]}\n`;
                if (tasksBySection[sectionKey].length > 0) {
                    tasksBySection[sectionKey].forEach(task => {
                        markdown += `- ${task.text}\n`;
                        markdown += this.formatTaskDetails(task);
                    });
                }
                markdown += '\n';
            });

            console.log('Tasks exported to markdown format');
            return markdown;
        } catch (error) {
            console.error('Error exporting tasks to markdown:', error);
            return null;
        }
    }

    /**
     * Format task details for markdown export
     */
    formatTaskDetails(task, indentPrefix = '  ') {
        let details = '';

        // Add sub-tasks
        if (task.subTasks && task.subTasks.length > 0) {
            task.subTasks.forEach(subTask => {
                details += `${indentPrefix}- ${subTask}\n`;
            });
        }

        // Add reminders
        if (task.reminders && task.reminders.length > 0) {
            task.reminders.forEach(reminder => {
                const reminderText = typeof reminder === 'string' ? reminder : reminder.text;
                details += `${indentPrefix}- Reminder: ${reminderText}\n`;
            });
        }

        // Add other details
        if (task.details && task.details.length > 0) {
            task.details.forEach(detail => {
                if (detail.type !== 'reminder') {
                    const detailText = typeof detail === 'string' ? detail : detail.text;
                    details += `${indentPrefix}- ${detailText}\n`;
                }
            });
        }

        return details;
    }

    /**
     * Group tasks by priority
     */
    groupTasksByPriority(tasks) {
        return tasks.reduce((groups, task) => {
            const priority = task.priority || 'medium';
            if (!groups[priority]) {
                groups[priority] = [];
            }
            groups[priority].push(task);
            return groups;
        }, {});
    }

    /**
     * Sync with Firestore - dual mode operation
     */
    async syncWithFirestore(taskDataService) {
        if (!taskDataService || !taskDataService.isAvailable()) {
            console.log('Firestore sync skipped - TaskDataService not available');
            return { success: true, synced: false };
        }

        try {
            // Check if tasks have been migrated
            const allFirestoreTasks = await taskDataService.getAllTasks();
            
            if (allFirestoreTasks.length === 0) {
                // No tasks in Firestore, perform migration
                console.log('No tasks found in Firestore, performing initial migration...');
                return await this.migrateToFirestore(taskDataService);
            } else {
                // Tasks exist in Firestore, sync if needed
                console.log(`Found ${allFirestoreTasks.length} tasks in Firestore`);
                
                // For now, we'll keep tasks.md as primary source in dual mode
                // Future enhancement: compare timestamps and sync changes
                return { 
                    success: true, 
                    synced: true,
                    firestoreTasks: allFirestoreTasks.length,
                    message: 'Firestore tasks loaded, dual mode active'
                };
            }
        } catch (error) {
            console.error('Error syncing with Firestore:', error);
            return {
                success: false,
                error: error.message,
                synced: false
            };
        }
    }

    /**
     * Get tasks from Firestore (for dual mode)
     */
    async getTasksFromFirestore(taskDataService) {
        if (!taskDataService || !taskDataService.isAvailable()) {
            return null;
        }

        try {
            const firestoreTasks = await taskDataService.exportToTaskParserFormat();
            console.log('Tasks loaded from Firestore');
            return firestoreTasks;
        } catch (error) {
            console.error('Error loading tasks from Firestore:', error);
            return null;
        }
    }

    /**
     * Check migration status
     */
    async checkMigrationStatus(taskDataService) {
        if (!taskDataService || !taskDataService.isAvailable()) {
            return {
                migrated: false,
                available: false,
                taskCount: 0
            };
        }

        try {
            const firestoreTasks = await taskDataService.getAllTasks();
            return {
                migrated: firestoreTasks.length > 0,
                available: true,
                taskCount: firestoreTasks.length,
                lastSync: taskDataService.getSyncStatus().lastSync
            };
        } catch (error) {
            console.error('Error checking migration status:', error);
            return {
                migrated: false,
                available: true,
                taskCount: 0,
                error: error.message
            };
        }
    }
}

// Export for use in other modules
window.TaskParser = TaskParser;