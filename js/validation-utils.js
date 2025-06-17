/**
 * Validation Utilities for Task Management
 * Handles form validation, natural language date parsing, and input sanitization
 */

class ValidationUtils {
    constructor() {
        // Common date patterns
        this.relativeDatePatterns = {
            today: () => new Date(),
            tomorrow: () => {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                return date;
            },
            yesterday: () => {
                const date = new Date();
                date.setDate(date.getDate() - 1);
                return date;
            },
            'next week': () => {
                const date = new Date();
                date.setDate(date.getDate() + 7);
                return date;
            },
            'next month': () => {
                const date = new Date();
                date.setMonth(date.getMonth() + 1);
                return date;
            }
        };

        // Day names for parsing
        this.dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        // Month names for parsing
        this.monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december'];
    }

    /**
     * Validate task data
     * @param {Object} taskData - Task data to validate
     * @returns {Object} Validation result with isValid flag and errors array
     */
    validateTask(taskData) {
        const errors = [];

        // Required fields
        if (!taskData.text || taskData.text.trim().length === 0) {
            errors.push({ field: 'text', message: 'Task description is required' });
        } else if (taskData.text.trim().length < 3) {
            errors.push({ field: 'text', message: 'Task description must be at least 3 characters' });
        } else if (taskData.text.length > 500) {
            errors.push({ field: 'text', message: 'Task description cannot exceed 500 characters' });
        }

        // Section validation
        const validSections = ['todayTasks', 'upcomingTasks', 'dailyTasks', 
                              'weeklyTasks', 'monthlyTasks', 'yearlyTasks', 'undatedTasks'];
        if (!validSections.includes(taskData.section)) {
            errors.push({ field: 'section', message: 'Invalid task category' });
        }

        // Priority validation
        const validPriorities = ['low', 'medium', 'high'];
        if (taskData.priority && !validPriorities.includes(taskData.priority)) {
            errors.push({ field: 'priority', message: 'Invalid priority level' });
        }

        // Date validation for sections that require it
        if (['todayTasks', 'upcomingTasks'].includes(taskData.section)) {
            if (taskData.date) {
                const parsedDate = this.parseNaturalDate(taskData.date);
                if (!parsedDate.isValid) {
                    errors.push({ field: 'date', message: parsedDate.error || 'Invalid date format' });
                } else {
                    // Check if upcoming task is actually in the future
                    if (taskData.section === 'upcomingTasks' && parsedDate.date < new Date()) {
                        errors.push({ field: 'date', message: 'Upcoming tasks must have a future date' });
                    }
                }
            }
        }

        // Duration validation
        if (taskData.estimatedDuration !== null && taskData.estimatedDuration !== undefined) {
            const duration = parseInt(taskData.estimatedDuration);
            if (isNaN(duration) || duration < 5 || duration > 480) {
                errors.push({ field: 'estimatedDuration', message: 'Duration must be between 5 and 480 minutes' });
            }
        }

        // Sub-tasks validation
        if (taskData.subTasks && Array.isArray(taskData.subTasks)) {
            taskData.subTasks.forEach((subTask, index) => {
                if (typeof subTask !== 'string' || subTask.trim().length === 0) {
                    errors.push({ field: `subTasks[${index}]`, message: 'Sub-task cannot be empty' });
                } else if (subTask.length > 200) {
                    errors.push({ field: `subTasks[${index}]`, message: 'Sub-task cannot exceed 200 characters' });
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Parse natural language date input
     * @param {string} input - Natural language date string
     * @returns {Object} Result with date object and validation status
     */
    parseNaturalDate(input) {
        if (!input || typeof input !== 'string') {
            return { isValid: false, error: 'Date input is required' };
        }

        const normalizedInput = input.trim().toLowerCase();

        // Check for relative date patterns
        if (this.relativeDatePatterns[normalizedInput]) {
            const date = this.relativeDatePatterns[normalizedInput]();
            return {
                isValid: true,
                date: date,
                formatted: this.formatDate(date)
            };
        }

        // Check for "next [day]" pattern
        const nextDayMatch = normalizedInput.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i);
        if (nextDayMatch) {
            const dayName = nextDayMatch[1].toLowerCase();
            const date = this.getNextDayOfWeek(dayName);
            return {
                isValid: true,
                date: date,
                formatted: this.formatDate(date)
            };
        }

        // Check for "this [day]" pattern
        const thisDayMatch = normalizedInput.match(/^this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i);
        if (thisDayMatch) {
            const dayName = thisDayMatch[1].toLowerCase();
            const date = this.getThisDayOfWeek(dayName);
            return {
                isValid: true,
                date: date,
                formatted: this.formatDate(date)
            };
        }

        // Check for "in X days/weeks/months" pattern
        const inTimeMatch = normalizedInput.match(/^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/i);
        if (inTimeMatch) {
            const amount = parseInt(inTimeMatch[1]);
            const unit = inTimeMatch[2].toLowerCase();
            const date = this.addTimeToDate(new Date(), amount, unit);
            return {
                isValid: true,
                date: date,
                formatted: this.formatDate(date)
            };
        }

        // Check for month day pattern (e.g., "June 15", "15 June")
        const monthDayMatch = normalizedInput.match(/^(\w+)\s+(\d{1,2})$|^(\d{1,2})\s+(\w+)$/i);
        if (monthDayMatch) {
            const monthStr = monthDayMatch[1] || monthDayMatch[4];
            const dayStr = monthDayMatch[2] || monthDayMatch[3];
            const date = this.parseMonthDay(monthStr, dayStr);
            if (date) {
                return {
                    isValid: true,
                    date: date,
                    formatted: this.formatDate(date)
                };
            }
        }

        // Try standard date parsing as fallback
        const parsedDate = new Date(input);
        if (!isNaN(parsedDate.getTime())) {
            return {
                isValid: true,
                date: parsedDate,
                formatted: this.formatDate(parsedDate)
            };
        }

        return {
            isValid: false,
            error: `Unable to parse date: "${input}". Try formats like "tomorrow", "next Friday", "June 15", or "in 3 days"`
        };
    }

    /**
     * Get next occurrence of a day of week
     */
    getNextDayOfWeek(dayName) {
        const targetDay = this.dayNames.indexOf(dayName.toLowerCase());
        if (targetDay === -1) return null;

        const today = new Date();
        const currentDay = today.getDay();
        let daysUntilTarget = targetDay - currentDay;

        // If target day is today or in the past this week, go to next week
        if (daysUntilTarget <= 0) {
            daysUntilTarget += 7;
        }

        const result = new Date(today);
        result.setDate(today.getDate() + daysUntilTarget);
        return result;
    }

    /**
     * Get this week's occurrence of a day
     */
    getThisDayOfWeek(dayName) {
        const targetDay = this.dayNames.indexOf(dayName.toLowerCase());
        if (targetDay === -1) return null;

        const today = new Date();
        const currentDay = today.getDay();
        const daysUntilTarget = targetDay - currentDay;

        const result = new Date(today);
        result.setDate(today.getDate() + daysUntilTarget);
        return result;
    }

    /**
     * Add time to a date
     */
    addTimeToDate(date, amount, unit) {
        const result = new Date(date);
        
        switch(unit) {
            case 'day':
            case 'days':
                result.setDate(result.getDate() + amount);
                break;
            case 'week':
            case 'weeks':
                result.setDate(result.getDate() + (amount * 7));
                break;
            case 'month':
            case 'months':
                result.setMonth(result.getMonth() + amount);
                break;
        }
        
        return result;
    }

    /**
     * Parse month and day
     */
    parseMonthDay(monthStr, dayStr) {
        const monthIndex = this.monthNames.findIndex(m => 
            m.startsWith(monthStr.toLowerCase().substring(0, 3))
        );
        
        if (monthIndex === -1) return null;
        
        const day = parseInt(dayStr);
        if (isNaN(day) || day < 1 || day > 31) return null;
        
        const year = new Date().getFullYear();
        const date = new Date(year, monthIndex, day);
        
        // If date is in the past, assume next year
        if (date < new Date()) {
            date.setFullYear(year + 1);
        }
        
        return date;
    }

    /**
     * Format date to readable string
     */
    formatDate(date) {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHtml(input) {
        if (typeof input !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    /**
     * Validate and sanitize all task data
     */
    sanitizeTaskData(taskData) {
        return {
            ...taskData,
            text: this.sanitizeHtml(taskData.text || ''),
            subTasks: (taskData.subTasks || []).map(st => this.sanitizeHtml(st)),
            reminders: (taskData.reminders || []).map(r => ({
                ...r,
                text: this.sanitizeHtml(r.text || '')
            }))
        };
    }

    /**
     * Check if a string contains valid search terms
     */
    validateSearchQuery(query) {
        if (!query || typeof query !== 'string') {
            return { isValid: false, error: 'Search query is required' };
        }

        const trimmed = query.trim();
        
        if (trimmed.length < 2) {
            return { isValid: false, error: 'Search query must be at least 2 characters' };
        }

        if (trimmed.length > 100) {
            return { isValid: false, error: 'Search query cannot exceed 100 characters' };
        }

        // Check for SQL injection patterns (basic check)
        const dangerousPatterns = /(\b(DROP|DELETE|INSERT|UPDATE|SELECT)\b|[;<>])/i;
        if (dangerousPatterns.test(trimmed)) {
            return { isValid: false, error: 'Invalid search query' };
        }

        return { isValid: true, sanitized: trimmed };
    }

    /**
     * Generate validation error message for UI
     */
    formatValidationErrors(errors) {
        if (!Array.isArray(errors) || errors.length === 0) {
            return '';
        }

        if (errors.length === 1) {
            return errors[0].message;
        }

        return 'Please fix the following errors:\n' + 
               errors.map(err => `• ${err.message}`).join('\n');
    }
}

// Export for use in other modules
window.ValidationUtils = new ValidationUtils();