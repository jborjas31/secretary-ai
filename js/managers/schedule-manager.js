import { BaseManager } from '../base-manager.js';

/**
 * ScheduleManager
 * Handles schedule generation, loading, caching, and display
 */
export class ScheduleManager extends BaseManager {
    constructor(app) {
        super(app);
        this.generateInProgress = false;
    }
    
    /**
     * Initialize the schedule manager
     */
    async initialize() {
        // Set up event listeners for schedule requests
        this.on('request-schedule-refresh', () => this.refreshSchedule());
        this.on('request-schedule-load', async ({ date, dateKey }) => {
            await this.loadScheduleForDate(date);
        });
    }
    
    /**
     * Generate a new schedule using LLM
     */
    async generateSchedule(targetDate = new Date()) {
        const endMeasure = window.performanceMonitor?.startMeasure('generateSchedule');
        this.app.uiManager.setStatus('loading', 'Generating your schedule...');
        this.app.uiManager.showLoading(true, 'Creating your personalized schedule...');
        
        // Prevent multiple simultaneous generations
        if (this.generateInProgress) {
            console.log('Schedule generation already in progress');
            this.app.uiManager.showLoading(false);
            endMeasure?.();
            return null;
        }
        
        this.generateInProgress = true;
        
        try {
            // Get all tasks
            const allTasks = await this.getTasksForSchedule();
            if (!allTasks || allTasks.length === 0) {
                this.app.uiManager.showToast('No tasks found. Add some tasks first!', 'warning');
                endMeasure?.();
                return null;
            }
            
            // Prepare multi-day context
            const context = await this.prepareScheduleContext(targetDate);
            
            // Generate schedule with LLM
            let schedule = null;
            let attempt = 0;
            const maxAttempts = 2;
            
            while (!schedule && attempt < maxAttempts) {
                attempt++;
                try {
                    console.log(`🤖 Attempt ${attempt}: Generating schedule for ${targetDate.toDateString()}`);
                    schedule = await window.performanceMonitor?.measureAsync('llm.generateSchedule',
                        async () => await this.llmService.generateDailySchedule(allTasks, targetDate, context)
                    );
                } catch (error) {
                    console.error(`Attempt ${attempt} failed:`, error);
                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        throw error;
                    }
                }
            }
            
            if (!schedule) {
                throw new Error('Failed to generate schedule after multiple attempts');
            }
            
            // Add metadata
            const scheduleData = {
                ...schedule,
                generatedAt: new Date().toISOString(),
                targetDate: targetDate.toISOString(),
                tasksSnapshot: allTasks.map(t => ({
                    id: t.id,
                    text: t.text,
                    priority: t.priority
                }))
            };
            
            // Save to storage
            const dateKey = this.app.dateNavigationManager.getDateKey(targetDate);
            await window.performanceMonitor?.measureAsync('scheduleDataService.save',
                async () => await this.scheduleDataService.saveSchedule(dateKey, scheduleData)
            );
            
            // Update cache
            const scheduleCache = this.state.scheduleCache || new Map();
            scheduleCache.set(dateKey, scheduleData);
            this.updateState({ 
                scheduleCache,
                lastScheduleDate: new Date().toISOString()
            });
            
            this.app.uiManager.setStatus('online', 'Schedule generated');
            this.emit('schedule-generated', { schedule: scheduleData, date: targetDate });
            
            endMeasure?.();
            return scheduleData;
            
        } catch (error) {
            console.error('Error generating schedule:', error);
            this.app.uiManager.setStatus('error', 'Failed to generate schedule');
            this.app.uiManager.showError('Failed to generate schedule. Please try again.', error);
            endMeasure?.();
            return null;
        } finally {
            this.generateInProgress = false;
            this.app.uiManager.showLoading(false);
        }
    }
    
    /**
     * Load schedule for a specific date
     */
    async loadScheduleForDate(date) {
        const endMeasure = window.performanceMonitor?.startMeasure('loadScheduleForDate');
        const dateKey = this.app.dateNavigationManager.getDateKey(date);

        const scheduleCache = this.state.scheduleCache || new Map();
        if (scheduleCache.has(dateKey) && scheduleCache.get(dateKey)?.schedule?.length > 0) {
            this.updateState({ currentSchedule: scheduleCache.get(dateKey) });
            this.app.dateNavigationManager.updateDateDisplay();
            endMeasure?.();
            return;
        }

        try {
            const savedSchedule = await window.performanceMonitor?.measureAsync('scheduleDataService.load',
                async () => await this.scheduleDataService.loadSchedule(dateKey)
            );

            // Debug logging to track savedSchedule value
            console.log(`[loadScheduleForDate] savedSchedule for ${dateKey}:`, savedSchedule);

            // This condition now explicitly checks for a valid, non-empty schedule array.
            const isValidAndPopulated = savedSchedule && 
                                        savedSchedule.schedule && 
                                        savedSchedule.schedule.length > 0 && 
                                        this.isScheduleValidForDate(savedSchedule, date);

            if (isValidAndPopulated) {
                console.log(`✅ Valid schedule found for ${dateKey}, loading from storage.`);
                this.updateState({ currentSchedule: savedSchedule });
                scheduleCache.set(dateKey, savedSchedule);
                this.updateState({ scheduleCache });
                this.app.uiManager.setStatus('online', 'Schedule loaded');

            } else {
                // This block will now correctly execute for future dates with no schedule.
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const requestedDate = new Date(date);
                requestedDate.setHours(0, 0, 0, 0);

                if (requestedDate < today) {
                    console.log(`No schedule exists for past date: ${dateKey}`);
                    this.updateState({ currentSchedule: null });
                    this.app.uiManager.showToast('No schedule was created for this date', 'info');
                } else {
                    // Generate a new schedule because none exists or the existing one is invalid/empty.
                    console.log(`No valid schedule found for ${dateKey}. Generating a new one.`);
                    const newSchedule = await this.generateSchedule(date);
                    this.updateState({ currentSchedule: newSchedule });
                    
                    if (newSchedule) { // Only cache if generation was successful
                        scheduleCache.set(dateKey, newSchedule);
                        this.updateState({ scheduleCache });
                    }
                }
            }
            
            this.app.dateNavigationManager.updateDateDisplay();
            endMeasure?.();
        } catch (error) {
            console.error('Error loading schedule for date:', error);
            if (!navigator.onLine) {
                this.app.uiManager.setStatus('offline', 'Offline - cannot load schedule');
            } else {
                this.app.uiManager.setStatus('error', 'Failed to load schedule');
            }
            this.app.uiManager.showError('Failed to load schedule', error);
            endMeasure?.();
        }
    }
    
    /**
     * Refresh the current schedule
     */
    async refreshSchedule() {
        if (!navigator.onLine) {
            this.app.uiManager.showToast('Offline - cannot refresh schedule', 'warning');
            return;
        }
        
        try {
            const currentDate = this.state.currentDate;
            const newSchedule = await this.generateSchedule(currentDate);
            this.updateState({ currentSchedule: newSchedule });
            const scheduleCache = this.state.scheduleCache || new Map();
            scheduleCache.set(this.app.dateNavigationManager.getDateKey(currentDate), newSchedule);
            this.updateState({ scheduleCache });
            this.app.uiManager.updateUI();
            this.app.uiManager.showToast('Schedule refreshed', 'success');
        } catch (error) {
            this.app.uiManager.showToast('Failed to refresh schedule', 'error');
        }
    }
    
    /**
     * Check if schedule is recent
     */
    isScheduleRecent(schedule) {
        if (!schedule || !schedule.generatedAt) return false;
        
        const generated = new Date(schedule.generatedAt);
        const now = new Date();
        const diffMinutes = (now - generated) / (1000 * 60);
        
        // Consider schedule recent if less than refresh interval
        const settings = this.app.settingsManager.getSettings();
        return diffMinutes < (settings.refreshInterval || 30);
    }
    
    /**
     * Check if schedule is valid for the given date
     */
    isScheduleValidForDate(schedule, date) {
        if (!schedule?.generatedAt) return false;
        if (!schedule?.schedule || schedule.schedule.length === 0) return false;

        // Check if schedule was generated for this specific date
        if (schedule.date) {
            const scheduleDate = new Date(schedule.date).toDateString();
            return scheduleDate === date.toDateString();
        }

        // Fallback for older schedule formats that might use targetDate
        if (schedule.targetDate) {
            const scheduleDate = new Date(schedule.targetDate).toDateString();
            return scheduleDate === date.toDateString();
        }
        
        // If neither date property exists, it's invalid.
        console.warn("isScheduleValidForDate called on a schedule without a 'date' or 'targetDate' property. Treating as invalid.");
        return false;
    }
    
    /**
     * Calculate total hours from schedule
     */
    calculateTotalHours(schedule) {
        if (!schedule || !Array.isArray(schedule)) return 0;
        
        let totalMinutes = 0;
        schedule.forEach(item => {
            if (item.duration) {
                const match = item.duration.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
                if (match) {
                    const value = parseInt(match[1]);
                    const unit = match[2].toLowerCase();
                    if (unit.includes('hour')) {
                        totalMinutes += value * 60;
                    } else {
                        totalMinutes += value;
                    }
                }
            }
        });
        
        return Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal place
    }
    
    /**
     * Update schedule display
     */
    updateScheduleDisplay() {
        const currentSchedule = this.state.currentSchedule;
        if (!currentSchedule) {
            this.app.elements.emptyState.style.display = 'block';
            // Use DOM diff to clear efficiently
            if (window.domDiff) {
                window.domDiff.updateContainer(this.app.elements.scheduleList, [], () => null, () => '');
            }
            return;
        }
        
        const schedule = currentSchedule.schedule || [];
        
        if (schedule.length === 0) {
            const emptyState = this.app.elements.emptyState;
            const now = new Date();
            
            // Update empty state message based on time of day
            const h3 = emptyState.querySelector('h3');
            const p = emptyState.querySelector('p');
            
            if (h3 && p) {
                if (now.getHours() >= 20) { // After 8 PM
                    h3.textContent = "That's a wrap for today!";
                    p.textContent = "The AI has determined there are no more tasks to schedule for the evening.";
                } else {
                    h3.textContent = "All done for today!";
                    p.textContent = "No more tasks scheduled for the rest of the day.";
                }
            }
            
            emptyState.style.display = 'block';
            if (window.domDiff) {
                window.domDiff.updateContainer(this.app.elements.scheduleList, [], () => null, () => '');
            }
            return;
        }
        
        this.app.elements.emptyState.style.display = 'none';
        
        // Calculate total hours
        const totalHours = this.calculateTotalHours(schedule);
        const isOverloaded = totalHours > 8;
        
        // Update meta info with workload
        let metaText = '';
        if (currentSchedule.summary) {
            metaText = currentSchedule.summary;
        }
        
        // Add workload information
        const workloadText = `${totalHours} hours`;
        const overloadWarning = isOverloaded ? ' ⚠️' : '';
        const workloadHtml = `<div class="schedule-workload${isOverloaded ? ' overloaded' : ''}">${workloadText}${overloadWarning}</div>`;
        
        const fullMetaHtml = `${metaText ? `<div class="schedule-summary">${this.app.uiManager.sanitizeHtml(metaText)}</div>` : ''}${workloadHtml}`;
        
        if (this.app.elements.scheduleMeta) {
            this.app.elements.scheduleMeta.innerHTML = fullMetaHtml;
        }
        
        // Use DOM diff for efficient updates
        if (window.domDiff) {
            window.domDiff.updateContainer(
                this.app.elements.scheduleList,
                schedule,
                (task) => this.createTaskElement(task),
                (task) => task.text || ''
            );
        }
        
        this.emit('schedule-display-updated', { schedule: currentSchedule });
    }
    
    /**
     * Render a task item (deprecated, use createTaskElement)
     */
    renderTaskItem(task) {
        console.warn('renderTaskItem is deprecated, use createTaskElement instead');
        const element = this.createTaskElement(task);
        return element.outerHTML;
    }
    
    /**
     * Create task element for schedule display
     */
    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        if (task.completed) li.classList.add('completed');
        
        const taskName = task.text || 'Unnamed task';
        const isBreak = taskName.toLowerCase().includes('break') || 
                       taskName.toLowerCase().includes('lunch');
        
        if (isBreak) {
            li.classList.add('break-time');
        }
        
        // Main content
        const content = document.createElement('div');
        content.className = 'task-content';
        
        // Task name
        const nameEl = document.createElement('div');
        nameEl.className = 'task-name';
        nameEl.textContent = taskName;
        content.appendChild(nameEl);
        
        // Time and duration
        if (task.time || task.duration) {
            const metaEl = document.createElement('div');
            metaEl.className = 'task-meta';
            
            if (task.time) {
                const timeSpan = document.createElement('span');
                timeSpan.className = 'task-time';
                timeSpan.textContent = `⏰ ${task.time}`;
                metaEl.appendChild(timeSpan);
            }
            
            if (task.duration) {
                const durationSpan = document.createElement('span');
                durationSpan.className = 'task-duration';
                durationSpan.textContent = `⏱️ ${task.duration}`;
                metaEl.appendChild(durationSpan);
            }
            
            content.appendChild(metaEl);
        }
        
        li.appendChild(content);
        
        // Checkbox for non-break items
        if (!isBreak) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed || false;
            this.app.addEventListener(checkbox, 'change', (e) => {
                this.handleTaskCompletion(task, e.target.checked);
            });
            li.insertBefore(checkbox, li.firstChild);
        }
        
        return li;
    }
    
    /**
     * Handle task completion in schedule
     */
    handleTaskCompletion(task, completed) {
        // Update task completion state
        task.completed = completed;
        
        // Save updated schedule
        const currentSchedule = this.state.currentSchedule;
        if (currentSchedule) {
            const dateKey = this.app.dateNavigationManager.getDateKey(this.state.currentDate);
            this.scheduleDataService.saveSchedule(dateKey, currentSchedule).catch(error => {
                console.error('Error saving task completion:', error);
            });
        }
        
        // Emit completion event
        this.emit('schedule-task-completed', { task, completed });
    }
    
    /**
     * Get tasks for schedule generation
     */
    async getTasksForSchedule() {
        // Try to get tasks from TaskDataService first
        if (this.taskDataService.isAvailable()) {
            try {
                const result = await this.taskDataService.getAllTasks();
                return result.tasks || [];
            } catch (error) {
                console.error('Error loading tasks from TaskDataService:', error);
            }
        }
        
        // Fallback to TaskParser
        const parsedTasks = await this.app.taskParser.getCachedTasks();
        const tasks = [];
        
        Object.entries(parsedTasks || {}).forEach(([section, sectionTasks]) => {
            if (Array.isArray(sectionTasks)) {
                tasks.push(...sectionTasks);
            }
        });
        
        return tasks;
    }
    
    /**
     * Prepare multi-day context for schedule generation
     */
    async prepareScheduleContext(targetDate) {
        const context = {
            previousSchedules: [],
            upcomingDays: []
        };
        
        // Get previous 2 days of schedules for context
        for (let i = 1; i <= 2; i++) {
            const prevDate = new Date(targetDate);
            prevDate.setDate(prevDate.getDate() - i);
            const dateKey = this.app.dateNavigationManager.getDateKey(prevDate);
            
            try {
                const schedule = await this.scheduleDataService.loadSchedule(dateKey);
                if (schedule) {
                    context.previousSchedules.push({
                        date: prevDate.toISOString(),
                        tasks: schedule.schedule?.map(t => ({
                            text: t.text,
                            completed: t.completed || false
                        })) || []
                    });
                }
            } catch (error) {
                console.log(`No previous schedule for ${dateKey}`);
            }
        }
        
        // Add upcoming days context
        for (let i = 1; i <= 3; i++) {
            const nextDate = new Date(targetDate);
            nextDate.setDate(nextDate.getDate() + i);
            context.upcomingDays.push({
                date: nextDate.toISOString(),
                dayOfWeek: nextDate.toLocaleDateString('en-US', { weekday: 'long' })
            });
        }
        
        return context;
    }
    
    /**
     * Load schedule indicators for date range
     */
    async loadScheduleIndicators(startDate, endDate) {
        return await this.app.dateNavigationManager.loadScheduleIndicators(startDate, endDate);
    }
}