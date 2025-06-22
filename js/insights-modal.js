/**
 * Insights Modal Component - Displays productivity insights and analytics
 * Shows patterns, trends, and recommendations based on user behavior
 */

class InsightsModal extends UIComponent {
    constructor(options = {}) {
        super();
        this.patternAnalyzer = options.patternAnalyzer;
        this.isVisible = false;
        this.insights = null;
    }

    /**
     * Initialize the component
     */
    async initialize() {
        this.render();
        this.attachEventListeners();
        return true;
    }

    /**
     * Render the modal HTML
     */
    render() {
        const html = `
            <div class="modal insights-modal" id="insightsModal" style="display: none;">
                <div class="modal-content modal-insights">
                    <div class="modal-header">
                        <h3>📊 Productivity Insights</h3>
                        <button class="modal-close" id="insightsModalClose">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="insights-loading" id="insightsLoading">
                            <div class="loading-spinner"></div>
                            <p>Analyzing your patterns...</p>
                        </div>
                        <div class="insights-content" id="insightsContent" style="display: none;">
                            <!-- Content will be dynamically inserted -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', html);
        this.element = document.getElementById('insightsModal');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        this.registerEvent('#insightsModalClose', 'click', () => this.hide());

        // Click outside to close
        this.registerEvent(this.element, 'click', (e) => {
            if (e.target === this.element) {
                this.hide();
            }
        });

        // Escape key to close - store this for cleanup
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        };
        this.documentKeydownId = this.listenerRegistry.add(document, 'keydown', this.escapeHandler);
    }

    /**
     * Show the modal and load insights
     */
    async show() {
        this.element.style.display = 'flex';
        this.isVisible = true;
        
        // Show loading state
        document.getElementById('insightsLoading').style.display = 'block';
        document.getElementById('insightsContent').style.display = 'none';

        try {
            // Update patterns with latest data
            await this.patternAnalyzer.updatePatterns();
            
            // Get insights
            this.insights = this.patternAnalyzer.getInsights();
            
            // Render insights
            this.renderInsights();
            
            // Show content
            document.getElementById('insightsLoading').style.display = 'none';
            document.getElementById('insightsContent').style.display = 'block';
        } catch (error) {
            console.error('Error loading insights:', error);
            this.renderError();
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        this.element.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * Render insights content
     */
    renderInsights() {
        const content = document.getElementById('insightsContent');
        
        content.innerHTML = `
            <div class="insights-grid">
                ${this.renderOverviewCard()}
                ${this.renderTimeOfDayCard()}
                ${this.renderDayOfWeekCard()}
                ${this.renderCategoryCard()}
                ${this.renderDurationCard()}
                ${this.renderRecommendationsCard()}
            </div>
        `;
    }

    /**
     * Render overview card
     */
    renderOverviewCard() {
        const overview = this.insights.overview;
        
        return `
            <div class="insight-card overview-card">
                <h4>Overall Performance</h4>
                <div class="insight-value">${overview.completionRate}%</div>
                <div class="insight-label">Completion Rate</div>
                <div class="insight-stats">
                    <div class="stat-item">
                        <span class="stat-value">${overview.completedTasks}</span>
                        <span class="stat-label">Tasks Completed</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${overview.avgTasksPerDay}</span>
                        <span class="stat-label">Avg. Tasks/Day</span>
                    </div>
                </div>
                <div class="insight-footer">
                    Based on ${overview.sampleSize} days of data
                </div>
            </div>
        `;
    }

    /**
     * Render time of day card
     */
    renderTimeOfDayCard() {
        const timeData = this.insights.timeOfDay;
        const periods = timeData.periods;
        
        // Create bar chart data
        const maxRate = Math.max(...Object.values(periods).map(p => p.completionRate));
        
        return `
            <div class="insight-card time-card">
                <h4>Best Time to Work</h4>
                ${timeData.bestProductiveTime ? `
                    <div class="insight-highlight">
                        <span class="highlight-emoji">🌟</span>
                        <span class="highlight-text">${this.capitalize(timeData.bestProductiveTime)}</span>
                        <span class="highlight-value">${timeData.bestRate}% completion</span>
                    </div>
                ` : '<p class="no-data">Not enough data yet</p>'}
                <div class="insight-bar-chart">
                    ${Object.entries(periods).map(([period, data]) => `
                        <div class="bar-container">
                            <div class="bar" style="height: ${(data.completionRate / maxRate) * 100}%">
                                <span class="bar-value">${data.completionRate}%</span>
                            </div>
                            <span class="bar-label">${this.capitalize(period)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render day of week card
     */
    renderDayOfWeekCard() {
        const dayData = this.insights.dayOfWeek;
        
        return `
            <div class="insight-card day-card">
                <h4>Weekly Patterns</h4>
                <div class="day-grid">
                    ${dayData.bestDay ? `
                        <div class="day-highlight best">
                            <span class="day-emoji">✅</span>
                            <span class="day-name">${this.capitalize(dayData.bestDay)}</span>
                            <span class="day-rate">${dayData.bestRate}%</span>
                        </div>
                    ` : ''}
                    ${dayData.worstDay && dayData.worstDay !== dayData.bestDay ? `
                        <div class="day-highlight worst">
                            <span class="day-emoji">⚠️</span>
                            <span class="day-name">${this.capitalize(dayData.worstDay)}</span>
                            <span class="day-rate">${dayData.worstRate}%</span>
                        </div>
                    ` : ''}
                </div>
                <div class="day-chart">
                    ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                        const data = dayData.days[day] || { completionRate: 0, taskCount: 0 };
                        return `
                            <div class="day-bar ${day === dayData.bestDay ? 'best' : ''} ${day === dayData.worstDay ? 'worst' : ''}">
                                <div class="day-fill" style="width: ${data.completionRate}%"></div>
                                <span class="day-abbr">${day.substring(0, 3).toUpperCase()}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render category performance card
     */
    renderCategoryCard() {
        const categories = this.insights.categories;
        const sortedCategories = Object.entries(categories)
            .sort((a, b) => b[1].taskCount - a[1].taskCount)
            .slice(0, 5); // Top 5 categories
        
        return `
            <div class="insight-card category-card">
                <h4>Category Performance</h4>
                ${sortedCategories.length > 0 ? `
                    <div class="category-list">
                        ${sortedCategories.map(([category, data]) => `
                            <div class="category-item">
                                <span class="category-name task-category ${category}">${category}</span>
                                <div class="category-stats">
                                    <span class="category-rate">${data.completionRate}%</span>
                                    <span class="category-count">${data.taskCount} tasks</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="no-data">No category data available</p>'}
            </div>
        `;
    }

    /**
     * Render duration accuracy card
     */
    renderDurationCard() {
        const duration = this.insights.durationAccuracy;
        
        return `
            <div class="insight-card duration-card">
                <h4>Time Estimation Accuracy</h4>
                ${duration.totalEstimated > 0 ? `
                    <div class="duration-chart">
                        <div class="duration-segment accurate" style="width: ${duration.accuracyRate}%">
                            <span class="duration-label">Accurate ${duration.accuracyRate}%</span>
                        </div>
                        <div class="duration-segment over" style="width: ${duration.overestimatedRate}%">
                            <span class="duration-label">Over ${duration.overestimatedRate}%</span>
                        </div>
                        <div class="duration-segment under" style="width: ${duration.underestimatedRate}%">
                            <span class="duration-label">Under ${duration.underestimatedRate}%</span>
                        </div>
                    </div>
                ` : '<p class="no-data">Not enough duration data yet</p>'}
            </div>
        `;
    }

    /**
     * Render recommendations card
     */
    renderRecommendationsCard() {
        const recommendations = this.insights.recommendations;
        
        return `
            <div class="insight-card recommendations-card">
                <h4>💡 Recommendations</h4>
                ${recommendations.length > 0 ? `
                    <div class="recommendations-list">
                        ${recommendations.map(rec => `
                            <div class="recommendation-item ${rec.type}">
                                <span class="rec-icon">${this.getRecommendationIcon(rec.type)}</span>
                                <span class="rec-text">${rec.message}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="no-recommendations">Great job! No specific recommendations at this time.</p>'}
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError() {
        const content = document.getElementById('insightsContent');
        content.innerHTML = `
            <div class="insights-error">
                <p>😕 Unable to load insights at this time.</p>
                <p>Please try again later.</p>
            </div>
        `;
        
        document.getElementById('insightsLoading').style.display = 'none';
        content.style.display = 'block';
    }

    /**
     * Get recommendation icon based on type
     */
    getRecommendationIcon(type) {
        const icons = {
            productivity: '⚡',
            planning: '📅',
            estimation: '⏱️',
            priority: '🎯',
            workload: '⚖️'
        };
        return icons[type] || '💡';
    }

    /**
     * Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Export for use in other modules
window.InsightsModal = InsightsModal;