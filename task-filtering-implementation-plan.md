# Task Filtering Implementation Plan for Secretary AI

## Problem Summary
The Secretary AI system is sending all 100 tasks to the LLM (DeepSeek R1), causing the model to generate responses that exceed the 2000 token limit. The JSON response gets truncated at line 298, resulting in parse errors.

## Root Cause
- System loads and sends ALL tasks from the database to the LLM
- DeepSeek R1 generates verbose descriptions for each task
- Response exceeds 2000 token limit and gets cut off mid-JSON

## Task Structure
```javascript
{
  text: string,              // Task description
  section: string,           // 'todayTasks', 'upcomingTasks', 'dailyTasks', etc.
  priority: string,          // 'low', 'medium', 'high'
  date: Date,                // Due date (for dated tasks)
  estimatedDuration: number, // Minutes
  subTasks: string[]         // Sub-tasks array
}
```

## Long-term Solution: Smart Task Filtering

### 1. Add Filter Method to schedule-manager.js

Add this new method after `getTasksForSchedule()` (around line 470):

```javascript
/**
 * Filter tasks relevant for schedule generation
 * @param {Array} allTasks - All tasks from database
 * @param {Date} targetDate - Date to generate schedule for
 * @returns {Array} Filtered tasks for LLM
 */
filterTasksForSchedule(allTasks, targetDate) {
    const dateKey = this.app.dateNavigationManager.getDateKey(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Categories to always include
    const includeSections = ['todayTasks', 'dailyTasks'];
    
    // Add weekly tasks if it's the right day
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek === 1) includeSections.push('weeklyTasks'); // Monday
    
    // Add monthly tasks if it's the 1st
    if (targetDate.getDate() === 1) includeSections.push('monthlyTasks');
    
    const filteredTasks = allTasks.filter(task => {
        // Always include high priority tasks
        if (task.priority === 'high') return true;
        
        // Include tasks from relevant sections
        if (includeSections.includes(task.section)) return true;
        
        // Include upcoming tasks due on or before target date
        if (task.section === 'upcomingTasks' && task.date) {
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate <= targetDate;
        }
        
        // Exclude other tasks
        return false;
    });
    
    // Sort by priority and limit to reasonable number
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedTasks = filteredTasks.sort((a, b) => {
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
    
    // Limit to 30 most important tasks
    const limitedTasks = sortedTasks.slice(0, 30);
    
    console.log(`Filtered ${allTasks.length} tasks down to ${limitedTasks.length} for schedule generation`);
    return limitedTasks;
}
```

### 2. Update generateSchedule Method

In `schedule-manager.js`, modify the `generateSchedule` method (around line 44-64):

```javascript
// Get all tasks
const allTasks = await this.getTasksForSchedule();
if (!allTasks || allTasks.length === 0) {
    this.app.uiManager.showToast('No tasks found. Add some tasks first!', 'warning');
    endMeasure?.();
    return null;
}

// Filter tasks for schedule generation
const filteredTasks = this.filterTasksForSchedule(allTasks, targetDate);

// ... existing code ...

// Update the LLM call to use filtered tasks
schedule = await window.performanceMonitor?.measureAsync('llm.generateSchedule',
    async () => await this.llmService.generateDailySchedule(filteredTasks, targetDate, context)
);
```

### 3. Update Schedule Metadata

Update the metadata section (around line 85) to track both full snapshot and filtered count:

```javascript
// Add metadata
const scheduleData = {
    ...schedule,
    generatedAt: new Date().toISOString(),
    targetDate: targetDate.toISOString(),
    tasksSnapshot: allTasks.map(t => ({  // Keep full snapshot for reference
        id: t.id,
        text: t.text,
        priority: t.priority
    })),
    tasksUsedForGeneration: filteredTasks.length  // Track how many were sent to LLM
};
```

## Benefits

1. **Reduces tokens by ~70%**: Only sends 30 most relevant tasks instead of 100
2. **Prevents truncation**: Stays well within token limits
3. **Improves speed**: Less data to process = faster generation
4. **Better relevance**: Focuses on tasks that matter for the target date
5. **Maintains full context**: Keeps complete task snapshot for reference

## Alternative Approaches

### Dynamic Token Estimation
```javascript
// Estimate tokens based on task content
const estimateTokens = (tasks) => {
    // Rough estimate: ~50 tokens per task
    return tasks.reduce((total, task) => {
        const baseTokens = 50;
        const textTokens = Math.ceil(task.text.length / 4);
        const subTaskTokens = (task.subTasks?.length || 0) * 20;
        return total + baseTokens + textTokens + subTaskTokens;
    }, 0);
};

// Dynamically limit tasks based on token estimate
const maxTokensForTasks = 1500; // Leave room for system prompt
let selectedTasks = [];
let currentTokens = 0;

for (const task of sortedTasks) {
    const taskTokens = estimateTokens([task]);
    if (currentTokens + taskTokens <= maxTokensForTasks) {
        selectedTasks.push(task);
        currentTokens += taskTokens;
    } else {
        break;
    }
}
```

### User Preferences
Add settings to allow users to configure:
- Maximum tasks to include in schedule
- Priority threshold for inclusion
- Specific sections to always/never include

## Testing Plan

1. Test with varying numbers of tasks (50, 100, 200)
2. Verify all models work without truncation
3. Check that important tasks aren't missed
4. Measure performance improvements
5. Validate schedule quality remains high

## Future Enhancements

1. **Smart Grouping**: Group related tasks together
2. **Dependency Detection**: Include tasks that depend on each other
3. **Historical Learning**: Learn which tasks user typically schedules
4. **Rollover Intelligence**: Prioritize incomplete tasks from previous days
5. **Context Awareness**: Consider user's typical daily patterns

## Implementation Priority

1. **Phase 1** (Immediate): Implement basic filtering method
2. **Phase 2** (Next Sprint): Add dynamic token estimation
3. **Phase 3** (Future): Add user preferences and smart grouping