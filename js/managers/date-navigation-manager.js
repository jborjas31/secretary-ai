import { BaseManager } from '../base-manager.js';

/**
 * DateNavigationManager
 * Handles date navigation, calendar interactions, and date display
 */
export class DateNavigationManager extends BaseManager {
    constructor(app) {
        super(app);
        this.minNavigationDate = -30; // Days in the past
        this.maxNavigationDate = 30;  // Days in the future
    }
    
    /**
     * Initialize the date navigation manager
     */
    async initialize() {
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Update initial date display
        this.updateDateDisplay();
    }
    
    /**
     * Initialize event listeners for date navigation
     */
    initializeEventListeners() {
        // Navigation buttons
        this.app.addEventListener(this.elements.prevDateBtn, 'click', () => this.navigateDate(-1));
        this.app.addEventListener(this.elements.nextDateBtn, 'click', () => this.navigateDate(1));
        this.app.addEventListener(this.elements.todayBtn, 'click', () => this.navigateToToday());
        
        // Date picker
        this.app.addEventListener(this.elements.datePickerBtn, 'click', () => this.showDatePicker());
        
        // Calendar toggle
        if (this.app.components?.calendarView) {
            this.setupCalendarIntegration();
        }
        
        // Keyboard navigation
        this.setupKeyboardNavigation();
    }
    
    /**
     * Navigate to a different date
     */
    async navigateDate(direction) {
        this.emit('navigation-start');
        
        const newDate = new Date(this.state.currentDate);
        newDate.setDate(newDate.getDate() + direction);
        
        // Update state
        this.updateState({ currentDate: newDate });
        
        // Request schedule load
        this.emit('date-changed', { 
            date: newDate, 
            previousDate: this.state.currentDate 
        });
        
        // Update UI
        this.updateDateDisplay();
    }
    
    /**
     * Navigate to today
     */
    async navigateToToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (this.getDateKey(this.state.currentDate) !== this.getDateKey(today)) {
            this.updateState({ currentDate: today });
            this.emit('date-changed', { 
                date: today, 
                previousDate: this.state.currentDate 
            });
            this.updateDateDisplay();
        }
    }
    
    /**
     * Navigate to a specific date
     */
    async navigateToDate(date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        if (this.getDateKey(this.state.currentDate) !== this.getDateKey(targetDate)) {
            this.updateState({ currentDate: targetDate });
            this.emit('date-changed', { 
                date: targetDate, 
                previousDate: this.state.currentDate 
            });
            this.updateDateDisplay();
        }
    }
    
    /**
     * Show date picker UI
     */
    showDatePicker() {
        // Create hidden date input to trigger native picker
        const input = document.createElement('input');
        input.type = 'date';
        input.value = this.getDateKey(this.state.currentDate);
        
        // Set min/max dates
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + this.minNavigationDate);
        input.min = this.getDateKey(minDate);
        
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + this.maxNavigationDate);
        input.max = this.getDateKey(maxDate);
        
        const handleChange = async (e) => {
            const selectedDate = new Date(e.target.value + 'T00:00:00');
            await this.navigateToDate(selectedDate);
            input.remove();
        };
        
        input.addEventListener('change', handleChange);
        
        // Trigger the date picker
        input.style.position = 'absolute';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.click();
        
        // Remove if cancelled
        input.addEventListener('blur', () => {
            setTimeout(() => input.remove(), 100);
        });
    }
    
    /**
     * Update date display in UI
     */
    updateDateDisplay() {
        const currentDate = this.state.currentDate;
        const dateKey = this.getDateKey(currentDate);
        const today = this.getDateKey(new Date());
        
        // Update date display text
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = currentDate.toLocaleDateString('en-US', options);
        this.elements.currentDateDisplay.textContent = dateStr;
        
        // Update title based on date
        let titleText;
        if (dateKey === today) {
            titleText = 'Your Schedule for Today';
        } else if (this.isTomorrow(currentDate)) {
            titleText = 'Your Schedule for Tomorrow';
        } else if (this.isYesterday(currentDate)) {
            titleText = 'Your Schedule for Yesterday';
        } else {
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
            titleText = `Your Schedule for ${dayName}`;
        }
        this.elements.scheduleTitle.textContent = titleText;
        
        // Update button states
        this.updateNavigationButtons();
        
        // Update calendar if visible
        if (this.app.components?.calendarView?.isVisible()) {
            this.app.components.calendarView.setCurrentDate(currentDate);
        }
    }
    
    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const currentDate = this.state.currentDate;
        
        // Calculate min/max dates
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + this.minNavigationDate);
        
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + this.maxNavigationDate);
        
        // Update button states
        this.elements.prevDateBtn.disabled = currentDate <= minDate;
        this.elements.nextDateBtn.disabled = currentDate >= maxDate;
        
        // Update today button
        const isToday = this.getDateKey(currentDate) === this.getDateKey(new Date());
        this.elements.todayBtn.disabled = isToday;
    }
    
    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        this.app.addGlobalListener(document, 'keydown', (e) => {
            // Only handle in schedule view
            if (this.state.currentView !== 'schedule') return;
            
            // Don't handle if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateDate(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateDate(1);
                    break;
                case 't':
                case 'T':
                    e.preventDefault();
                    this.navigateToToday();
                    break;
            }
        });
    }
    
    /**
     * Setup calendar integration
     */
    setupCalendarIntegration() {
        // Calendar toggle button
        this.app.addEventListener(this.elements.calendarToggleBtn, 'click', () => {
            const calendarView = this.app.components.calendarView;
            if (calendarView.isVisible()) {
                calendarView.hide();
                this.elements.calendarToggleBtn.classList.remove('active');
            } else {
                calendarView.show();
                this.elements.calendarToggleBtn.classList.add('active');
                calendarView.setCurrentDate(this.state.currentDate);
            }
        });
        
        // Handle calendar date selection
        this.on('calendar-date-selected', async (date) => {
            await this.navigateToDate(date);
            this.elements.calendarToggleBtn.classList.remove('active');
        });
    }
    
    /**
     * Load schedule indicators for date range
     */
    async loadScheduleIndicators(startDate, endDate) {
        const endMeasure = window.performanceMonitor?.startMeasure('loadScheduleIndicators');
        const indicators = new Map();
        
        try {
            // Get all dates in range
            const dates = [];
            const current = new Date(startDate);
            while (current <= endDate) {
                dates.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
            
            // Load schedules for each date
            for (const date of dates) {
                const dateKey = this.getDateKey(date);
                let hasSchedule = false;
                let completionRate = 0;
                
                // Check cache first
                const scheduleCache = this.state.scheduleCache;
                if (scheduleCache?.has(dateKey)) {
                    const schedule = scheduleCache.get(dateKey);
                    hasSchedule = !!(schedule?.schedule?.length > 0);
                    completionRate = hasSchedule ? 0.7 : 0; // TODO: Calculate actual completion
                } else {
                    // Check if schedule exists in storage
                    try {
                        const exists = await this.scheduleDataService.hasSchedule(dateKey);
                        hasSchedule = exists;
                        completionRate = hasSchedule ? 0.5 : 0;
                    } catch (error) {
                        console.error(`Error checking schedule for ${dateKey}:`, error);
                    }
                }
                
                indicators.set(dateKey, { hasSchedule, completionRate });
            }
            
            endMeasure?.();
            return indicators;
        } catch (error) {
            console.error('Error loading schedule indicators:', error);
            endMeasure?.();
            return indicators;
        }
    }
    
    /**
     * Utility: Get date key (YYYY-MM-DD format)
     */
    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Utility: Check if date is tomorrow
     */
    isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.toDateString() === tomorrow.toDateString();
    }
    
    /**
     * Utility: Check if date is yesterday
     */
    isYesterday(date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return date.toDateString() === yesterday.toDateString();
    }
    
    /**
     * Check if schedule is valid for a specific date
     */
    isScheduleValidForDate(schedule, date) {
        if (!schedule?.generatedAt) return false;
        
        // Check if schedule was generated for this specific date
        if (schedule.targetDate) {
            const scheduleDate = new Date(schedule.targetDate).toDateString();
            return scheduleDate === date.toDateString();
        }
        
        // Fallback: check if schedule is recent enough
        return this.isScheduleRecent(schedule);
    }
    
    /**
     * Check if schedule is recent (within last hour)
     */
    isScheduleRecent(schedule) {
        if (!schedule?.generatedAt) return false;
        
        const generatedTime = new Date(schedule.generatedAt).getTime();
        const currentTime = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        return (currentTime - generatedTime) < oneHour;
    }
    
    /**
     * Get formatted date string for display
     */
    getFormattedDate(date, format = 'full') {
        const options = {
            full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            short: { month: 'short', day: 'numeric' },
            weekday: { weekday: 'long' }
        };
        
        return date.toLocaleDateString('en-US', options[format] || options.full);
    }
    
    /**
     * Load schedule for a specific date
     * Delegates to app's schedule loading logic for now
     */
    async loadScheduleForDate(date) {
        const dateKey = this.getDateKey(date);
        
        // Update current date in state
        this.updateState({ currentDate: date });
        
        // Emit event for schedule manager to handle
        this.emit('request-schedule-load', { date, dateKey });
        
        // Update date display
        this.updateDateDisplay();
    }
}