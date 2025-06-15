/**
 * Task Parser - Converts tasks.md into structured format
 * Handles different task categories and generates unique IDs
 */

class TaskParser {
    constructor() {
        this.taskIdCounter = 1;
        this.parsedTasks = null;
        this.lastParsed = null;
    }

    /**
     * Generate a unique ID for a task
     */
    generateTaskId(category, index) {
        return `${category}-${index}-${Date.now()}-${this.taskIdCounter++}`;
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
                    id: this.generateTaskId(currentSection, tasks[currentSection].length),
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
            const response = await fetch('/tasks.md');
            if (!response.ok) {
                throw new Error(`Failed to load tasks.md: ${response.status}`);
            }
            
            const content = await response.text();
            return await this.parseTasksFromMarkdown(content);
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
}

// Export for use in other modules
window.TaskParser = TaskParser;