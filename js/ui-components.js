/**
 * UI Components for Task Management
 * Provides reusable components for Phase 2 task management features
 */

import { EventListenerRegistry } from './event-registry.js';

class UIComponent {
    constructor() {
        this.element = null;
        this.listenerRegistry = new EventListenerRegistry();
    }

    /**
     * Base render method to be overridden by subclasses
     */
    render() {
        throw new Error('render() method must be implemented by subclass');
    }

    /**
     * Update component with new data
     */
    update(data) {
        // Default implementation - subclasses can override
        this.data = data;
        if (this.element) {
            const newElement = this.render();
            this.element.replaceWith(newElement);
            this.element = newElement;
        }
    }

    /**
     * Register event listener with automatic tracking
     * Subclasses should use this instead of direct addEventListener
     */
    registerEvent(selector, event, handler, options = false) {
        // Handle both element and selector
        const element = typeof selector === 'string' 
            ? this.element.querySelector(selector) 
            : selector;
            
        if (element) {
            return this.listenerRegistry.add(element, event, handler, options);
        }
        
        console.warn(`Element not found for selector: ${selector}`);
        return null;
    }

    /**
     * Register delegated event on the component root
     */
    registerDelegatedEvent(event, selector, handler) {
        const delegatedHandler = (e) => {
            if (e.target.matches(selector)) {
                handler.call(this, e);
            }
        };
        
        return this.listenerRegistry.add(this.element, event, delegatedHandler, true);
    }

    /**
     * Add event listener with automatic cleanup (legacy method for compatibility)
     */
    on(event, selector, handler) {
        if (!this.element) return;
        this.registerDelegatedEvent(event, selector, handler);
    }

    /**
     * Clean up all component resources
     */
    destroy() {
        // Clear all tracked listeners
        this.listenerRegistry.clear();
        
        // Remove element from DOM
        if (this.element) {
            this.element.remove();
        }
    }

    /**
     * Create element from HTML string
     */
    createElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstElementChild;
    }
}

/**
 * Task Form Component for creating/editing tasks
 */
class TaskFormComponent extends UIComponent {
    constructor(options = {}) {
        super();
        this.options = {
            mode: 'create', // 'create' or 'edit'
            task: null,
            onSubmit: () => {},
            onCancel: () => {},
            ...options
        };
    }

    render() {
        const task = this.options.task || {};
        const isEdit = this.options.mode === 'edit';
        
        const html = `
            <div class="task-form-container">
                <form class="task-form" id="taskForm">
                    <div class="task-form-header">
                        <h3>${isEdit ? 'Edit Task' : 'New Task'}</h3>
                        <button type="button" class="task-form-close" aria-label="Close">&times;</button>
                    </div>
                    
                    <div class="task-form-body">
                        <div class="form-group">
                            <label for="taskText">Task Description</label>
                            <textarea 
                                id="taskText" 
                                name="text" 
                                class="form-control" 
                                rows="3" 
                                placeholder="What needs to be done?"
                                required>${task.text || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taskSection">Category</label>
                                <select id="taskSection" name="section" class="form-control">
                                    <option value="todayTasks" ${task.section === 'todayTasks' ? 'selected' : ''}>Today</option>
                                    <option value="upcomingTasks" ${task.section === 'upcomingTasks' ? 'selected' : ''}>Upcoming</option>
                                    <option value="dailyTasks" ${task.section === 'dailyTasks' ? 'selected' : ''}>Daily Routine</option>
                                    <option value="weeklyTasks" ${task.section === 'weeklyTasks' ? 'selected' : ''}>Weekly</option>
                                    <option value="monthlyTasks" ${task.section === 'monthlyTasks' ? 'selected' : ''}>Monthly</option>
                                    <option value="yearlyTasks" ${task.section === 'yearlyTasks' ? 'selected' : ''}>Yearly</option>
                                    <option value="undatedTasks" ${task.section === 'undatedTasks' ? 'selected' : ''}>Undated</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="taskPriority">Priority</label>
                                <select id="taskPriority" name="priority" class="form-control">
                                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group" id="dateGroup" style="${this.shouldShowDate(task.section) ? '' : 'display: none'}">
                            <label for="taskDate">Date</label>
                            <input 
                                type="text" 
                                id="taskDate" 
                                name="date" 
                                class="form-control" 
                                placeholder="e.g., tomorrow, next Friday, June 15"
                                value="${task.date || ''}">
                            <small class="form-help">You can use natural language like "tomorrow" or specific dates</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="taskDuration">Estimated Duration (minutes)</label>
                            <input 
                                type="number" 
                                id="taskDuration" 
                                name="estimatedDuration" 
                                class="form-control" 
                                min="5" 
                                step="5"
                                placeholder="30"
                                value="${task.estimatedDuration || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label>Sub-tasks</label>
                            <div id="subTasksList" class="sub-tasks-list">
                                ${this.renderSubTasks(task.subTasks || [])}
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm" id="addSubTask">+ Add Sub-task</button>
                        </div>
                    </div>
                    
                    <div class="task-form-footer">
                        <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Task</button>
                    </div>
                </form>
            </div>
        `;
        
        this.element = this.createElement(html);
        this.attachEventListeners();
        return this.element;
    }

    renderSubTasks(subTasks) {
        return subTasks.map((subTask, index) => `
            <div class="sub-task-item" data-index="${index}">
                <input type="text" class="form-control sub-task-input" value="${subTask}" placeholder="Sub-task description">
                <button type="button" class="btn-remove-subtask" aria-label="Remove sub-task">&times;</button>
            </div>
        `).join('');
    }

    shouldShowDate(section) {
        return ['todayTasks', 'upcomingTasks'].includes(section);
    }

    attachEventListeners() {
        const form = this.element.querySelector('#taskForm');
        const cancelBtn = this.element.querySelector('#cancelBtn');
        const closeBtn = this.element.querySelector('.task-form-close');
        const sectionSelect = this.element.querySelector('#taskSection');
        const addSubTaskBtn = this.element.querySelector('#addSubTask');
        const subTasksList = this.element.querySelector('#subTasksList');
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = this.getFormData();
            this.options.onSubmit(formData);
        });
        
        // Cancel/close handlers
        cancelBtn.addEventListener('click', () => this.options.onCancel());
        closeBtn.addEventListener('click', () => this.options.onCancel());
        
        // Section change - show/hide date field
        sectionSelect.addEventListener('change', (e) => {
            const dateGroup = this.element.querySelector('#dateGroup');
            dateGroup.style.display = this.shouldShowDate(e.target.value) ? '' : 'none';
        });
        
        // Add sub-task
        addSubTaskBtn.addEventListener('click', () => {
            const newSubTask = document.createElement('div');
            newSubTask.className = 'sub-task-item';
            newSubTask.innerHTML = `
                <input type="text" class="form-control sub-task-input" placeholder="Sub-task description">
                <button type="button" class="btn-remove-subtask" aria-label="Remove sub-task">&times;</button>
            `;
            subTasksList.appendChild(newSubTask);
        });
        
        // Remove sub-task (event delegation)
        subTasksList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-subtask')) {
                e.target.closest('.sub-task-item').remove();
            }
        });
    }

    getFormData() {
        const form = this.element.querySelector('#taskForm');
        const formData = new FormData(form);
        
        // Collect sub-tasks
        const subTasks = [];
        this.element.querySelectorAll('.sub-task-input').forEach(input => {
            if (input.value.trim()) {
                subTasks.push(input.value.trim());
            }
        });
        
        return {
            text: formData.get('text'),
            section: formData.get('section'),
            priority: formData.get('priority'),
            date: formData.get('date') || null,
            estimatedDuration: parseInt(formData.get('estimatedDuration')) || null,
            subTasks: subTasks,
            ...(this.options.task?.id && { id: this.options.task.id })
        };
    }
}

/**
 * Task List Component for displaying tasks
 */
class TaskListComponent extends UIComponent {
    constructor(options = {}) {
        super();
        this.options = {
            tasks: [],
            onTaskClick: () => {},
            onTaskEdit: () => {},
            onTaskDelete: () => {},
            onTaskComplete: () => {},
            showActions: true,
            ...options
        };
    }

    render() {
        const html = `
            <div class="task-list-component">
                ${this.options.tasks.length === 0 ? this.renderEmptyState() : this.renderTasks()}
            </div>
        `;
        
        this.element = this.createElement(html);
        this.attachEventListeners();
        return this.element;
    }

    renderEmptyState() {
        return `
            <div class="task-list-empty">
                <p>No tasks in this category</p>
            </div>
        `;
    }

    renderTasks() {
        return this.options.tasks.map(task => this.renderTaskItem(task)).join('');
    }

    renderTaskItem(task) {
        const priorityIcon = {
            high: '🔴',
            medium: '🟠',
            low: '🟡'
        }[task.priority] || '';
        
        return `
            <div class="task-item-editable" data-task-id="${task.id}">
                <div class="task-checkbox-wrapper">
                    <input type="checkbox" 
                           class="task-checkbox" 
                           id="task-${task.id}" 
                           ${task.completed ? 'checked' : ''}>
                </div>
                <div class="task-content" data-task-id="${task.id}">
                    <div class="task-title">
                        ${priorityIcon} ${this.sanitizeHtml(task.text)}
                    </div>
                    ${task.subTasks && task.subTasks.length > 0 ? `
                        <div class="task-subtasks">
                            ${task.subTasks.map(st => `<div class="subtask">• ${this.sanitizeHtml(st)}</div>`).join('')}
                        </div>
                    ` : ''}
                    ${task.date ? `<div class="task-date">📅 ${task.date}</div>` : ''}
                </div>
                ${this.options.showActions ? `
                    <div class="task-actions">
                        <button class="task-action-btn task-edit" aria-label="Edit task">✏️</button>
                        <button class="task-action-btn task-delete" aria-label="Delete task">🗑️</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    attachEventListeners() {
        // Task completion
        this.on('change', '.task-checkbox', (e) => {
            const taskId = e.target.closest('.task-item-editable').dataset.taskId;
            this.options.onTaskComplete(taskId, e.target.checked);
        });
        
        // Task click
        this.on('click', '.task-content', (e) => {
            const taskId = e.target.closest('.task-content').dataset.taskId;
            this.options.onTaskClick(taskId);
        });
        
        // Edit button
        this.on('click', '.task-edit', (e) => {
            e.stopPropagation();
            const taskId = e.target.closest('.task-item-editable').dataset.taskId;
            this.options.onTaskEdit(taskId);
        });
        
        // Delete button
        this.on('click', '.task-delete', (e) => {
            e.stopPropagation();
            const taskId = e.target.closest('.task-item-editable').dataset.taskId;
            if (confirm('Are you sure you want to delete this task?')) {
                this.options.onTaskDelete(taskId);
            }
        });
    }

    sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Search Bar Component
 */
class SearchBarComponent extends UIComponent {
    constructor(options = {}) {
        super();
        this.options = {
            placeholder: 'Search tasks...',
            onSearch: () => {},
            debounceDelay: 300,
            ...options
        };
        this.debounceTimer = null;
    }

    render() {
        const html = `
            <div class="search-bar-component">
                <input type="text" 
                       class="search-input" 
                       placeholder="${this.options.placeholder}"
                       aria-label="Search tasks">
                <button class="search-clear" style="display: none" aria-label="Clear search">&times;</button>
            </div>
        `;
        
        this.element = this.createElement(html);
        this.attachEventListeners();
        return this.element;
    }

    attachEventListeners() {
        const input = this.element.querySelector('.search-input');
        const clearBtn = this.element.querySelector('.search-clear');
        
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            clearBtn.style.display = value ? 'block' : 'none';
            
            // Debounce search
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.options.onSearch(value);
            }, this.options.debounceDelay);
        });
        
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            this.options.onSearch('');
        });
    }
}

/**
 * Floating Action Button Component
 */
class FloatingActionButton extends UIComponent {
    constructor(options = {}) {
        super();
        this.options = {
            icon: '+',
            label: 'Add Task',
            onClick: () => {},
            ...options
        };
    }

    render() {
        const html = `
            <button class="floating-action-btn" aria-label="${this.options.label}">
                <span class="fab-icon">${this.options.icon}</span>
            </button>
        `;
        
        this.element = this.createElement(html);
        this.element.addEventListener('click', this.options.onClick);
        return this.element;
    }
}

// Export components
// Make UIComponent available globally for other components that extend it
window.UIComponent = UIComponent;

// Also expose all components as a collection
window.UIComponents = {
    UIComponent,
    TaskFormComponent,
    TaskListComponent,
    SearchBarComponent,
    FloatingActionButton
};