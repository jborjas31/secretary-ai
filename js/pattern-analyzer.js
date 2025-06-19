/**
 * Pattern Analyzer Service - Analyzes user behavior patterns and provides insights
 * Tracks completion rates, productive hours, and task performance metrics
 */

class PatternAnalyzer {
    constructor() {
        this.storageKey = 'secretaryai_patterns';
        this.patterns = this.loadPatterns();
        this.scheduleDataService = null;
        this.initialized = false;
    }

    /**
     * Initialize with required services
     */
    initialize(scheduleDataService) {
        this.scheduleDataService = scheduleDataService;
        this.initialized = true;
        console.log('PatternAnalyzer initialized successfully');
        return true;
    }

    /**
     * Load patterns from localStorage
     */
    loadPatterns() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : this.getDefaultPatterns();
        } catch (error) {
            console.error('Error loading patterns:', error);
            return this.getDefaultPatterns();
        }
    }

    /**
     * Save patterns to localStorage
     */
    savePatterns() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.patterns));
        } catch (error) {
            console.error('Error saving patterns:', error);
        }
    }

    /**
     * Get default pattern structure
     */
    getDefaultPatterns() {
        return {
            lastUpdated: null,
            sampleSize: 0,
            timeOfDay: {
                morning: { total: 0, completed: 0 },   // 6-12
                afternoon: { total: 0, completed: 0 }, // 12-17
                evening: { total: 0, completed: 0 },   // 17-22
                night: { total: 0, completed: 0 }      // 22-6
            },
            dayOfWeek: {
                monday: { total: 0, completed: 0 },
                tuesday: { total: 0, completed: 0 },
                wednesday: { total: 0, completed: 0 },
                thursday: { total: 0, completed: 0 },
                friday: { total: 0, completed: 0 },
                saturday: { total: 0, completed: 0 },
                sunday: { total: 0, completed: 0 }
            },
            categories: {},
            priorities: {
                high: { total: 0, completed: 0 },
                medium: { total: 0, completed: 0 },
                low: { total: 0, completed: 0 }
            },
            durationAccuracy: {
                overestimated: 0,
                underestimated: 0,
                accurate: 0
            },
            productivity: {
                totalTasks: 0,
                completedTasks: 0,
                totalHoursScheduled: 0,
                totalHoursActual: 0,
                dailyAverages: []
            }
        };
    }

    /**
     * Analyze completion patterns from historical data
     * @param {Array} historicalData - Array of historical schedules
     */
    async analyzeCompletionPatterns(historicalData = null) {
        if (!this.initialized || !this.scheduleDataService) {
            console.warn('PatternAnalyzer not properly initialized');
            return this.patterns;
        }

        try {
            // If no data provided, fetch last 30 days
            if (!historicalData) {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                
                const result = await this.scheduleDataService.getScheduleHistory(
                    startDate, 
                    endDate, 
                    { limit: 365 } // Get all data for the period
                );
                historicalData = result.schedules;
            }

            // Reset patterns for fresh analysis
            this.patterns = this.getDefaultPatterns();
            this.patterns.lastUpdated = new Date().toISOString();
            this.patterns.sampleSize = historicalData.length;

            // Analyze each historical schedule
            historicalData.forEach(scheduleData => {
                if (!scheduleData.schedule || !Array.isArray(scheduleData.schedule)) return;
                
                const dayOfWeek = new Date(scheduleData.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                
                scheduleData.schedule.forEach(task => {
                    // Time of day analysis
                    const timeCategory = this.categorizeTimeOfDay(task.time);
                    if (timeCategory && this.patterns.timeOfDay[timeCategory]) {
                        this.patterns.timeOfDay[timeCategory].total++;
                        if (task.completed) {
                            this.patterns.timeOfDay[timeCategory].completed++;
                        }
                    }

                    // Day of week analysis
                    if (this.patterns.dayOfWeek[dayOfWeek]) {
                        this.patterns.dayOfWeek[dayOfWeek].total++;
                        if (task.completed) {
                            this.patterns.dayOfWeek[dayOfWeek].completed++;
                        }
                    }

                    // Category analysis
                    if (task.category) {
                        if (!this.patterns.categories[task.category]) {
                            this.patterns.categories[task.category] = { total: 0, completed: 0 };
                        }
                        this.patterns.categories[task.category].total++;
                        if (task.completed) {
                            this.patterns.categories[task.category].completed++;
                        }
                    }

                    // Priority analysis
                    if (task.priority && this.patterns.priorities[task.priority]) {
                        this.patterns.priorities[task.priority].total++;
                        if (task.completed) {
                            this.patterns.priorities[task.priority].completed++;
                        }
                    }

                    // Duration accuracy analysis
                    if (task.duration && task.actualDuration) {
                        const estimated = this.parseDuration(task.duration);
                        const actual = task.actualDuration;
                        const diff = actual - estimated;
                        const threshold = estimated * 0.2; // 20% margin

                        if (Math.abs(diff) <= threshold) {
                            this.patterns.durationAccuracy.accurate++;
                        } else if (diff > 0) {
                            this.patterns.durationAccuracy.underestimated++;
                        } else {
                            this.patterns.durationAccuracy.overestimated++;
                        }
                    }

                    // Productivity metrics
                    this.patterns.productivity.totalTasks++;
                    if (task.completed) {
                        this.patterns.productivity.completedTasks++;
                    }
                    if (task.duration) {
                        this.patterns.productivity.totalHoursScheduled += this.parseDuration(task.duration) / 60;
                    }
                    if (task.actualDuration) {
                        this.patterns.productivity.totalHoursActual += task.actualDuration / 60;
                    }
                });

                // Daily average tracking
                const dailyTaskCount = scheduleData.schedule.length;
                const dailyCompleted = scheduleData.schedule.filter(t => t.completed).length;
                const dailyRate = dailyTaskCount > 0 ? (dailyCompleted / dailyTaskCount * 100) : 0;
                
                this.patterns.productivity.dailyAverages.push({
                    date: scheduleData.date,
                    taskCount: dailyTaskCount,
                    completed: dailyCompleted,
                    completionRate: dailyRate
                });
            });

            // Save analyzed patterns
            this.savePatterns();
            
            console.log('Pattern analysis complete:', this.patterns);
            return this.patterns;
        } catch (error) {
            console.error('Error analyzing patterns:', error);
            return this.patterns;
        }
    }

    /**
     * Get human-readable insights from patterns
     */
    getInsights() {
        const insights = {
            overview: this.getOverviewInsights(),
            timeOfDay: this.getTimeOfDayInsights(),
            dayOfWeek: this.getDayOfWeekInsights(),
            categories: this.getCategoryInsights(),
            priorities: this.getPriorityInsights(),
            durationAccuracy: this.getDurationInsights(),
            recommendations: this.getRecommendations()
        };

        return insights;
    }

    /**
     * Get overview insights
     */
    getOverviewInsights() {
        const productivity = this.patterns.productivity;
        const completionRate = productivity.totalTasks > 0 
            ? Math.round((productivity.completedTasks / productivity.totalTasks) * 100)
            : 0;

        const avgTasksPerDay = this.patterns.sampleSize > 0
            ? Math.round(productivity.totalTasks / this.patterns.sampleSize)
            : 0;

        return {
            completionRate,
            totalTasks: productivity.totalTasks,
            completedTasks: productivity.completedTasks,
            avgTasksPerDay,
            sampleSize: this.patterns.sampleSize,
            lastUpdated: this.patterns.lastUpdated
        };
    }

    /**
     * Get time of day insights
     */
    getTimeOfDayInsights() {
        const times = this.patterns.timeOfDay;
        const insights = {};

        Object.entries(times).forEach(([period, data]) => {
            insights[period] = {
                completionRate: data.total > 0 
                    ? Math.round((data.completed / data.total) * 100)
                    : 0,
                taskCount: data.total
            };
        });

        // Find best productive time
        let bestTime = null;
        let bestRate = 0;
        Object.entries(insights).forEach(([period, data]) => {
            if (data.taskCount >= 5 && data.completionRate > bestRate) {
                bestRate = data.completionRate;
                bestTime = period;
            }
        });

        return {
            periods: insights,
            bestProductiveTime: bestTime,
            bestRate
        };
    }

    /**
     * Get day of week insights
     */
    getDayOfWeekInsights() {
        const days = this.patterns.dayOfWeek;
        const insights = {};

        Object.entries(days).forEach(([day, data]) => {
            insights[day] = {
                completionRate: data.total > 0 
                    ? Math.round((data.completed / data.total) * 100)
                    : 0,
                taskCount: data.total
            };
        });

        // Find best and worst days
        let bestDay = null;
        let worstDay = null;
        let bestRate = 0;
        let worstRate = 100;

        Object.entries(insights).forEach(([day, data]) => {
            if (data.taskCount >= 3) {
                if (data.completionRate > bestRate) {
                    bestRate = data.completionRate;
                    bestDay = day;
                }
                if (data.completionRate < worstRate) {
                    worstRate = data.completionRate;
                    worstDay = day;
                }
            }
        });

        return {
            days: insights,
            bestDay,
            worstDay,
            bestRate,
            worstRate
        };
    }

    /**
     * Get category insights
     */
    getCategoryInsights() {
        const categories = this.patterns.categories;
        const insights = {};

        Object.entries(categories).forEach(([category, data]) => {
            insights[category] = {
                completionRate: data.total > 0 
                    ? Math.round((data.completed / data.total) * 100)
                    : 0,
                taskCount: data.total
            };
        });

        return insights;
    }

    /**
     * Get priority insights
     */
    getPriorityInsights() {
        const priorities = this.patterns.priorities;
        const insights = {};

        Object.entries(priorities).forEach(([priority, data]) => {
            insights[priority] = {
                completionRate: data.total > 0 
                    ? Math.round((data.completed / data.total) * 100)
                    : 0,
                taskCount: data.total
            };
        });

        return insights;
    }

    /**
     * Get duration accuracy insights
     */
    getDurationInsights() {
        const accuracy = this.patterns.durationAccuracy;
        const total = accuracy.accurate + accuracy.overestimated + accuracy.underestimated;

        return {
            accuracyRate: total > 0 
                ? Math.round((accuracy.accurate / total) * 100)
                : 0,
            overestimatedRate: total > 0
                ? Math.round((accuracy.overestimated / total) * 100)
                : 0,
            underestimatedRate: total > 0
                ? Math.round((accuracy.underestimated / total) * 100)
                : 0,
            totalEstimated: total
        };
    }

    /**
     * Get personalized recommendations
     */
    getRecommendations() {
        const recommendations = [];
        const insights = this.getInsights();

        // Time-based recommendations
        if (insights.timeOfDay.bestProductiveTime) {
            recommendations.push({
                type: 'productivity',
                message: `Schedule important tasks in the ${insights.timeOfDay.bestProductiveTime} - you complete ${insights.timeOfDay.bestRate}% of tasks during this time`
            });
        }

        // Day-based recommendations
        if (insights.dayOfWeek.worstDay && insights.dayOfWeek.worstRate < 50) {
            recommendations.push({
                type: 'planning',
                message: `Consider lighter workload on ${insights.dayOfWeek.worstDay}s - completion rate is only ${insights.dayOfWeek.worstRate}%`
            });
        }

        // Duration recommendations
        if (insights.durationAccuracy.underestimatedRate > 40) {
            recommendations.push({
                type: 'estimation',
                message: `You tend to underestimate task duration. Consider adding 20-30% buffer time to estimates`
            });
        }

        // Priority recommendations
        if (insights.priorities.high.completionRate < 70 && insights.priorities.high.taskCount > 10) {
            recommendations.push({
                type: 'priority',
                message: `High priority task completion is ${insights.priorities.high.completionRate}%. Consider scheduling fewer high-priority tasks or allocating more time`
            });
        }

        // Overall productivity
        if (insights.overview.completionRate < 60) {
            recommendations.push({
                type: 'workload',
                message: `Overall completion rate is ${insights.overview.completionRate}%. Consider reducing daily task count or reassessing time estimates`
            });
        }

        return recommendations;
    }

    /**
     * Categorize time into periods
     */
    categorizeTimeOfDay(timeStr) {
        if (!timeStr) return null;
        
        const [hours] = timeStr.split(':').map(Number);
        
        if (hours >= 6 && hours < 12) return 'morning';
        if (hours >= 12 && hours < 17) return 'afternoon';
        if (hours >= 17 && hours < 22) return 'evening';
        return 'night';
    }

    /**
     * Parse duration string to minutes
     */
    parseDuration(durationStr) {
        if (!durationStr) return 0;
        
        const matches = durationStr.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
        if (!matches) return 30; // Default 30 minutes
        
        const value = parseInt(matches[1]);
        const unit = matches[2].toLowerCase();
        
        if (unit.startsWith('hour') || unit.startsWith('hr')) {
            return value * 60;
        }
        return value;
    }

    /**
     * Update patterns with new schedule data
     */
    async updatePatterns() {
        return await this.analyzeCompletionPatterns();
    }

    /**
     * Get patterns for LLM context
     */
    getPatternsForLLM() {
        const insights = this.getInsights();
        
        return {
            bestProductiveHours: insights.timeOfDay.bestProductiveTime 
                ? `${insights.timeOfDay.bestProductiveTime} (${insights.timeOfDay.bestRate}% completion)` 
                : null,
            worstProductiveHours: this.getWorstProductiveTime(),
            categoryPreferences: this.getCategoryPreferences(),
            averageCompletion: insights.overview.completionRate,
            averageTasksCompleted: Math.round(
                insights.overview.completedTasks / Math.max(1, this.patterns.sampleSize)
            )
        };
    }

    /**
     * Get worst productive time
     */
    getWorstProductiveTime() {
        const times = this.patterns.timeOfDay;
        let worstTime = null;
        let worstRate = 100;

        Object.entries(times).forEach(([period, data]) => {
            if (data.total >= 5) {
                const rate = (data.completed / data.total) * 100;
                if (rate < worstRate) {
                    worstRate = rate;
                    worstTime = period;
                }
            }
        });

        return worstTime ? `${worstTime} (${Math.round(worstRate)}% completion)` : null;
    }

    /**
     * Get category timing preferences
     */
    getCategoryPreferences() {
        // This would require more complex analysis of when categories are scheduled vs completed
        // For now, return basic preferences
        const preferences = {};
        const timeInsights = this.getTimeOfDayInsights();
        
        if (timeInsights.bestProductiveTime) {
            preferences.important = timeInsights.bestProductiveTime;
            preferences.routine = 'afternoon';
        }
        
        return preferences;
    }
}

// Export for use in other modules
window.PatternAnalyzer = PatternAnalyzer;