/**
 * Calendar View Component for Secretary AI
 * Provides month view with schedule indicators and date navigation
 */

class CalendarView extends UIComponent {
    constructor(options = {}) {
        super();
        this.options = {
            onDateSelect: () => {},
            onClose: () => {},
            currentDate: new Date(),
            ...options
        };
        
        this.viewDate = new Date(this.options.currentDate);
        this.viewDate.setDate(1); // Set to first day of month
        this.scheduleIndicators = new Map(); // Date -> indicator data
        this.isVisible = false;
    }

    render() {
        const html = `
            <div class="calendar-view ${this.isVisible ? 'visible' : ''}" id="calendarView">
                <div class="calendar-header">
                    <button class="calendar-nav-btn" id="calPrevMonth" title="Previous month">◀</button>
                    <h3 class="calendar-month-year">${this.getMonthYearDisplay()}</h3>
                    <button class="calendar-nav-btn" id="calNextMonth" title="Next month">▶</button>
                    <button class="calendar-close-btn" id="calClose" title="Close calendar">&times;</button>
                </div>
                <div class="calendar-weekdays">
                    ${this.renderWeekdays()}
                </div>
                <div class="calendar-grid" id="calendarGrid">
                    ${this.renderCalendarDays()}
                </div>
            </div>
        `;

        this.element = this.createElement(html);
        this.attachEventListeners();
        return this.element;
    }

    renderWeekdays() {
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return weekdays.map(day => `<div class="calendar-weekday">${day}</div>`).join('');
    }

    renderCalendarDays() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Get today's date for comparison
        const today = new Date();
        const todayStr = this.getDateKey(today);
        const currentViewStr = this.getDateKey(this.options.currentDate);
        
        let days = [];
        
        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push('<div class="calendar-day empty"></div>');
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.getDateKey(date);
            const isToday = dateKey === todayStr;
            const isCurrentView = dateKey === currentViewStr;
            const isPast = date < today && !isToday;
            
            // Check if date is within allowed range (±30 days from today)
            const daysDiff = Math.abs((date - today) / (1000 * 60 * 60 * 24));
            const isDisabled = daysDiff > 30;
            
            let classes = ['calendar-day'];
            if (isToday) classes.push('today');
            if (isCurrentView) classes.push('current-view');
            if (isPast) classes.push('past');
            if (isDisabled) classes.push('disabled');
            
            // Get schedule indicator for this date
            const indicator = this.scheduleIndicators.get(dateKey);
            let indicatorHtml = '';
            
            if (indicator) {
                const indicatorClass = this.getIndicatorClass(indicator);
                indicatorHtml = `<span class="schedule-indicator ${indicatorClass}"></span>`;
            }
            
            days.push(`
                <div class="${classes.join(' ')}" data-date="${dateKey}" ${isDisabled ? 'data-disabled="true"' : ''}>
                    <span class="day-number">${day}</span>
                    ${indicatorHtml}
                </div>
            `);
        }
        
        return days.join('');
    }

    getIndicatorClass(indicator) {
        // Determine indicator color based on schedule data
        if (!indicator.hasSchedule) return '';
        
        if (indicator.completionRate >= 0.8) return 'indicator-green';
        if (indicator.completionRate >= 0.5) return 'indicator-yellow';
        return 'indicator-red';
    }

    attachEventListeners() {
        // Month navigation
        this.element.querySelector('#calPrevMonth').addEventListener('click', () => this.navigateMonth(-1));
        this.element.querySelector('#calNextMonth').addEventListener('click', () => this.navigateMonth(1));
        
        // Close button
        this.element.querySelector('#calClose').addEventListener('click', () => {
            this.hide();
            this.options.onClose();
        });
        
        // Date selection
        this.element.querySelector('#calendarGrid').addEventListener('click', (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (dayElement && !dayElement.classList.contains('empty') && !dayElement.dataset.disabled) {
                const dateStr = dayElement.dataset.date;
                this.selectDate(dateStr);
            }
        });
        
        // Touch support for mobile
        this.setupTouchSupport();
    }

    setupTouchSupport() {
        let touchStartX = 0;
        let touchEndX = 0;
        
        this.element.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        this.element.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
        
        this.handleSwipe = () => {
            const swipeDistance = touchEndX - touchStartX;
            const minSwipeDistance = 50;
            
            if (Math.abs(swipeDistance) > minSwipeDistance) {
                if (swipeDistance > 0) {
                    this.navigateMonth(-1); // Swipe right - previous month
                } else {
                    this.navigateMonth(1); // Swipe left - next month
                }
            }
        };
    }

    navigateMonth(direction) {
        this.viewDate.setMonth(this.viewDate.getMonth() + direction);
        this.update();
        this.loadScheduleIndicators();
    }

    selectDate(dateStr) {
        const selectedDate = new Date(dateStr + 'T00:00:00');
        this.options.currentDate = selectedDate;
        this.options.onDateSelect(selectedDate);
        this.hide();
    }

    show() {
        this.isVisible = true;
        if (this.element) {
            this.element.classList.add('visible');
            this.loadScheduleIndicators();
        }
    }

    hide() {
        this.isVisible = false;
        if (this.element) {
            this.element.classList.remove('visible');
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    update() {
        if (this.element) {
            // Update month/year display
            const monthYearElement = this.element.querySelector('.calendar-month-year');
            if (monthYearElement) {
                monthYearElement.textContent = this.getMonthYearDisplay();
            }
            
            // Update calendar grid
            const gridElement = this.element.querySelector('#calendarGrid');
            if (gridElement) {
                gridElement.innerHTML = this.renderCalendarDays();
            }
        }
    }

    async loadScheduleIndicators() {
        // Get date range for current month view
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        try {
            // This will be implemented in app.js to fetch from scheduleDataService
            if (this.options.onLoadIndicators) {
                const indicators = await this.options.onLoadIndicators(startDate, endDate);
                this.scheduleIndicators = new Map(indicators);
                this.update();
            }
        } catch (error) {
            console.error('Error loading schedule indicators:', error);
        }
    }

    getMonthYearDisplay() {
        const options = { year: 'numeric', month: 'long' };
        return this.viewDate.toLocaleDateString('en-US', options);
    }

    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    setCurrentDate(date) {
        this.options.currentDate = new Date(date);
        this.viewDate = new Date(date);
        this.viewDate.setDate(1);
        this.update();
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarView;
}