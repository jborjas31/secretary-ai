# Secretary AI Behavior Specification

*Last Updated: 2025-06-24*

This document details the expected behavior of Secretary AI's major features, including debug points and test scenarios to help identify and resolve issues.

**⚠️ Important**: When fixing issues found through this spec, always consult the [Architectural Considerations](CLAUDE.md#-architectural-considerations) in CLAUDE.md to ensure changes don't cascade through the system.

## Table of Contents
- [Core User Flows](#core-user-flows)
- [Data Flow Overview](#data-flow-overview)
- [State Management](#state-management)
- [Error Scenarios & Recovery](#error-scenarios--recovery)
- [Integration Test Scenarios](#integration-test-scenarios)
- [Quick Debug Reference](#quick-debug-reference)

---

## Core User Flows

### 1. Task Creation Flow

#### Expected Behavior
User creates a new task with natural language input that gets parsed, validated, saved to Firestore, and displayed in the UI.

#### Step-by-Step Process
1. **User Action**: Click floating "+" button
2. **UI Response**: Task form modal appears
3. **User Input**: Enter task description (e.g., "Meeting tomorrow at 2pm high priority")
4. **Validation**: 
   - Parse natural date → converts "tomorrow at 2pm" to ISO date
   - Validate priority → ensures valid priority level
   - Check for duplicates → prevents exact duplicates
5. **Save**: Create task in Firestore with unique ID
6. **Update**: 
   - Add to task indexes for fast filtering
   - Update UI without full refresh
   - Show success toast

#### Debug Points
- **Form Display**: `js/managers/task-manager.js:showTaskForm()` (line ~850)
- **Validation**: `js/validation-utils.js:validateTask()` (line ~10)
- **Date Parsing**: `js/validation-utils.js:parseNaturalDate()` (line ~40)
- **Task Creation**: `js/task-data-service.js:createTask()` (line ~150)
- **Index Update**: `js/task-index-manager.js:addTaskToIndexes()` (line ~120)
- **UI Update**: `js/managers/task-manager.js:updateTaskManagementDisplay()` (line ~450)

#### Common Issues
- **Date parsing fails**: Check console for parse errors, verify natural date format
- **Duplicate detection too aggressive**: Check `isDuplicateTask()` logic
- **Task doesn't appear**: Check Firestore permissions, network status
- **Form validation errors**: Verify required fields are populated

#### Test Scenario
```javascript
// Console test for task creation
await app.taskManager.createTask({
  text: "Test meeting tomorrow at 2pm",
  priority: "high",
  section: "upcoming"
});
// Should see: New task in UI, success toast, Firestore write
```

---

### 2. Schedule Generation Flow

#### Expected Behavior
Navigate to a date without an existing schedule triggers AI generation using multi-day context and workload balancing.

#### Step-by-Step Process
1. **Navigation**: User navigates to new date (arrows, calendar, or picker)
2. **Cache Check**: System checks for existing schedule in cache
3. **Firestore Check**: If not cached, check Firestore for saved schedule
4. **Generation Trigger**: If no schedule exists:
   - Show loading overlay
   - Gather all user tasks
   - Prepare 3-day context window
   - Call LLM API with structured prompt
5. **Processing**: 
   - Parse LLM response
   - Calculate total hours (max 8)
   - Save to Firestore
   - Update cache
6. **Display**: Render schedule with time blocks

#### Debug Points
- **Navigation**: `js/managers/date-navigation-manager.js:navigateToDate()` (line ~120)
- **Schedule Load**: `js/managers/schedule-manager.js:loadScheduleForDate()` (line ~200)
- **Context Prep**: `js/managers/schedule-manager.js:prepareScheduleContext()` (line ~350)
- **LLM Call**: `js/llm-service.js:generateDailySchedule()` (line ~180)
- **Response Parse**: `js/managers/schedule-manager.js:parseScheduleResponse()` (line ~400)
- **Display Update**: `js/managers/schedule-manager.js:updateScheduleDisplay()` (line ~500)

#### Common Issues
- **LLM timeout**: Default 30s timeout, check network tab
- **Invalid response format**: LLM returns unexpected JSON structure
- **Context too large**: Too many tasks exceed token limit
- **Past date generation**: System should block schedules for past dates
- **8-hour limit exceeded**: Check `calculateTotalHours()` logic

#### Test Scenario
```javascript
// Console test for schedule generation
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
await app.dateNavigationManager.navigateToDate(tomorrow);
// Should see: Loading overlay, then generated schedule
// Check: Network tab for OpenRouter API call
```

---

### 3. Task Management (Edit/Delete) Flow

#### Expected Behavior
Edit or delete tasks with immediate UI updates and Firestore sync, preserving other UI state.

#### Step-by-Step Process

**Edit Flow**:
1. **Click task**: Task row click handler activates
2. **Load data**: Current task data populates form
3. **Make changes**: User updates fields
4. **Validation**: Same as creation flow
5. **Update**: 
   - Update Firestore document
   - Update task indexes
   - Surgical DOM update (preserves event listeners)
6. **Confirm**: Success toast

**Delete Flow**:
1. **Click delete**: Trash icon handler activates
2. **Confirm**: Browser confirmation dialog
3. **Delete**: 
   - Remove from Firestore
   - Remove from indexes
   - Surgical DOM removal
4. **Update**: Pagination adjusts if needed

#### Debug Points
- **Edit Handler**: `js/managers/task-manager.js:handleTaskEdit()` (line ~900)
- **Update Task**: `js/task-data-service.js:updateTask()` (line ~200)
- **Delete Handler**: `js/managers/task-manager.js:handleTaskDelete()` (line ~950)
- **DOM Update**: `js/managers/task-manager.js:updateTaskRow()` (line ~1000)
- **Index Updates**: `js/task-index-manager.js:updateTaskInIndexes()` (line ~150)

#### Common Issues
- **Event listeners lost**: Surgical update failed, fell back to full refresh
- **Task disappears on edit**: ID mismatch or validation failure
- **Delete doesn't work**: Firestore permissions or offline state
- **UI state lost**: Filter/search state not preserved

#### Test Scenario
```javascript
// Edit test
const taskElement = document.querySelector('[data-task-id]');
taskElement.querySelector('.task-text').click();
// Should see: Edit form with current data

// Delete test  
taskElement.querySelector('.task-delete').click();
// Should see: Confirmation dialog, then task removal
```

---

### 4. Date Navigation & Calendar Flow

#### Expected Behavior
Navigate between dates using keyboard, calendar view, or date picker with smooth transitions and state preservation.

#### Step-by-Step Process
1. **Navigation Input**:
   - Keyboard: Arrow keys (←/→) or 'T' for today
   - Calendar: Click on date cell
   - Picker: Native date input
2. **Date Validation**: 
   - Check within allowed range (365 days past/future)
   - Prevent invalid dates
3. **State Update**: 
   - Update `currentDate` in AppState
   - Emit `date-changed` event
4. **View Update**:
   - Update date display
   - Load schedule/tasks for new date
   - Update calendar if visible
5. **History**: Update URL hash for bookmarking

#### Debug Points
- **Key Handler**: `js/managers/date-navigation-manager.js:handleKeyDown()` (line ~50)
- **Date Change**: `js/managers/date-navigation-manager.js:navigateToDate()` (line ~120)
- **Calendar Click**: `js/calendar-view.js:handleDateClick()` (line ~250)
- **State Update**: `js/app-state.js:update()` (line ~50)
- **Event Emit**: Uses `window.globalEventManager.emit()`

#### Common Issues
- **Calendar not updating**: Check if calendar view is initialized
- **Keyboard shortcuts not working**: Check focus and event listeners
- **Invalid date navigation**: Boundary validation failing
- **State desync**: Date display doesn't match loaded content

#### Test Scenario
```javascript
// Keyboard navigation test
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
// Should see: Next day loaded

// Calendar navigation test
app.calendarView.element.querySelector('[data-date="2024-12-25"]').click();
// Should see: Navigate to Christmas
```

---

### 5. Settings & Configuration Flow

#### Expected Behavior
Manage API keys (local only), select AI models, configure intervals, with immediate service updates.

#### Step-by-Step Process
1. **Open Settings**: Click gear icon or use keyboard shortcut
2. **Load Current**: Display current settings from localStorage
3. **Make Changes**:
   - API key input (masked)
   - Model selection dropdown
   - Interval sliders
4. **Validation**: 
   - API key format check
   - Model availability check
5. **Save**: 
   - Store in localStorage only (never synced)
   - Update service configurations
   - Show success feedback
6. **Apply**: Services immediately use new settings

#### Debug Points
- **Open Modal**: `js/managers/settings-manager.js:openSettings()` (line ~100)
- **Load Settings**: `js/managers/settings-manager.js:loadSettings()` (line ~50)
- **Save Handler**: `js/managers/settings-manager.js:saveSettings()` (line ~150)
- **LLM Config**: `js/managers/settings-manager.js:configureLLMService()` (line ~200)
- **Model List**: `js/config.js:APP_CONFIG.openRouter.models` (line ~30)

#### Common Issues
- **API key not working**: Check format, OpenRouter validity
- **Model not available**: Model might be deprecated or require different key
- **Settings not persisting**: localStorage might be blocked
- **Changes not applying**: Service configuration not updating

#### Test Scenario
```javascript
// Change model test
app.settingsManager.openSettings();
document.querySelector('#model-select').value = 'anthropic/claude-3.5-sonnet';
document.querySelector('#save-settings').click();
// Should see: Model badge update, success toast
```

---

## Data Flow Overview

### Task Creation to Display
```
User Input → Validation → Firestore Write → Index Update → Event Emit → UI Refresh
     ↓            ↓              ↓                ↓              ↓            ↓
  Form Data   Date Parse   createTask()    addToIndexes()  task-created  DOM Update
```

### Schedule Generation Pipeline
```
Date Change → Cache Check → Firestore Check → Generate? → LLM Call → Parse → Save → Display
      ↓            ↓              ↓              ↓           ↓         ↓       ↓        ↓
 navigateDate  scheduleCache  loadSchedule   Not Found  makeRequest  JSON  saveSchedule  Render
```

### Sync Flow
```
Local Change → Firestore Write → Real-time Listener → Other Devices Update
      ↓               ↓                   ↓                     ↓
  Task CRUD    Optimistic Update    onSnapshot()         Merge Changes
```

---

## State Management

### Central State (AppState)
```javascript
{
  currentDate: '2024-12-24',        // Active date (ISO string)
  currentView: 'schedule',          // 'schedule' or 'tasks'
  currentSchedule: { /* ... */ },   // Active schedule object
  scheduleCache: Map(),             // Date → Schedule cache
  isLoading: false,                 // Global loading state
  tasks: [],                        // Current task list
  isOffline: false,                 // Connection status
  settings: { /* ... */ }           // User preferences
}
```

### State Update Pattern
```javascript
// Update state and notify listeners
AppState.update({ currentDate: newDate });
// Triggers registered callbacks
// Updates UI components
// Maintains consistency
```

### Event-Driven Updates
- All state changes emit events
- Managers subscribe to relevant events
- No direct manager-to-manager calls
- Ensures loose coupling

---

## Error Scenarios & Recovery

### 1. LLM Service Failures

#### Symptom
"Failed to generate schedule" error message

#### Debug Steps
1. **Check Console**: Look for API errors
2. **Network Tab**: Verify request/response
3. **API Key**: Ensure valid in settings
4. **Model**: Try different model

#### Recovery
- Automatic retry with exponential backoff
- Falls back to alternate models
- Manual retry button appears

#### Code Points
- Error handling: `js/llm-service.js:handleAPIError()` (line ~300)
- Retry logic: `js/llm-service.js:retryWithBackoff()` (line ~350)

---

### 2. Firestore Sync Issues

#### Symptom
"Working offline" indicator, changes not syncing

#### Debug Steps
1. **Check Status**: `app.firestoreService.isAvailable()`
2. **Console Errors**: Firebase auth/permission errors
3. **Network**: Verify internet connection
4. **Quota**: Check Firestore quotas

#### Recovery
- Automatic reconnection attempts
- Offline queue for changes
- Manual sync button in settings

#### Code Points
- Connection monitor: `js/firestore.js:monitorConnection()` (line ~100)
- Offline queue: `js/firestore.js:queueOfflineOperation()` (line ~400)

---

### 3. Task Duplication

#### Symptom
Multiple identical tasks appearing

#### Debug Steps
1. **Check Indexes**: `app.taskIndexManager.debugIndexes()`
2. **Firestore Console**: Look for duplicate documents
3. **Migration Lock**: Check if stuck

#### Recovery
```javascript
// Manual deduplication
await app.manualDeduplication();
```

#### Code Points
- Duplicate check: `js/task-data-service.js:isDuplicateTask()` (line ~180)
- Cleanup: `js/app-controller.js:manualDeduplication()` (line ~800)

---

### 4. UI State Loss

#### Symptom
Filters reset, pagination lost, scroll position reset

#### Debug Steps
1. **Check Events**: Unwanted `state-reset` events
2. **DOM Diffing**: Failed surgical updates
3. **Error Boundary**: Caught exceptions

#### Recovery
- State persistence in SessionStorage
- Restore from last known good state
- Graceful degradation to full refresh

#### Code Points
- State preservation: `js/managers/task-manager.js:preserveUIState()` (line ~600)
- DOM diff: `js/managers/schedule-manager.js:diffAndUpdateDOM()` (line ~700)

---

## Integration Test Scenarios

### Test 1: Full Task Lifecycle
```javascript
// Create task
const task = await app.taskManager.createTask({
  text: "Integration test task",
  dueDate: "2024-12-25",
  priority: "high"
});

// Verify creation
assert(document.querySelector(`[data-task-id="${task.id}"]`));

// Edit task
await app.taskManager.updateTask(task.id, { priority: "medium" });

// Verify update
assert(document.querySelector(`[data-task-id="${task.id}"] .priority-medium`));

// Delete task
await app.taskManager.deleteTask(task.id);

// Verify deletion
assert(!document.querySelector(`[data-task-id="${task.id}"]`));
```

### Test 2: Schedule Generation with Context
```javascript
// Create tasks across multiple days
const tasks = [
  { text: "Past task", dueDate: "2024-12-22" },
  { text: "Today task", dueDate: "2024-12-24" },
  { text: "Future task", dueDate: "2024-12-26" }
];

for (const task of tasks) {
  await app.taskManager.createTask(task);
}

// Navigate to future date
await app.dateNavigationManager.navigateToDate("2024-12-26");

// Verify schedule includes context
const schedule = app.getState('currentSchedule');
assert(schedule.context.includes("Past task"));
assert(schedule.tasks.some(t => t.text === "Future task"));
```

### Test 3: Offline Resilience
```javascript
// Simulate offline
app.firestoreService.simulateOffline();

// Create task while offline
const offlineTask = await app.taskManager.createTask({
  text: "Offline task"
});

// Verify local storage
assert(localStorage.getItem('offline-queue'));

// Restore connection
app.firestoreService.simulateOnline();

// Verify sync
setTimeout(() => {
  assert(app.taskDataService.getTaskById(offlineTask.id));
}, 2000);
```

### Test 4: Performance Under Load
```javascript
// Create many tasks
console.time('bulk-create');
const promises = [];
for (let i = 0; i < 100; i++) {
  promises.push(app.taskManager.createTask({
    text: `Bulk task ${i}`,
    priority: ['high', 'medium', 'low'][i % 3]
  }));
}
await Promise.all(promises);
console.timeEnd('bulk-create');

// Test filtering performance
console.time('filter');
await app.taskManager.applyTaskFilters({ search: 'bulk' });
console.timeEnd('filter');

// Should complete in < 100ms
assert(app.taskManager.filteredTasks.length === 100);
```

---

## Quick Debug Reference

### Console Commands
```javascript
// State inspection
app.getState('currentDate')           // Current date
app.getState('currentSchedule')        // Active schedule
app.taskManager.currentTasks           // All loaded tasks
app.taskManager.filteredTasks          // Visible tasks

// Service status
app.firestoreService.isAvailable()    // Cloud sync status
app.llmService.isConfigured()          // API key status
app.taskDataService.getAllTasks()      // Fetch all tasks

// Debugging
app.manualDeduplication()              // Remove duplicates
app.performanceMonitor.logReport()     // Performance metrics
app.taskIndexManager.debugIndexes()    // Index state

// Testing
app.taskManager.createTask({...})      // Create test task
app.dateNavigationManager.navigateToDate('2024-12-25')  // Jump to date
app.scheduleManager.generateSchedule(true)  // Force regenerate
```

### Common Error Messages
- `"API key not configured"` → Settings → Add OpenRouter key
- `"Failed to generate schedule"` → Check console, try different model
- `"Working offline"` → Check internet, Firebase status
- `"Invalid date"` → Date outside allowed range
- `"Duplicate task"` → Task with same text exists

### Performance Checks
- Task list render: < 50ms for 50 tasks
- Schedule generation: < 5s including API call
- Filter operations: < 10ms for 1000 tasks
- Page navigation: < 100ms

---

This specification is designed to be a living document. Update it as new features are added or behaviors change.

**Remember**: Accurate documentation saves debugging time. When in doubt, update the docs!