# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Navigation
- [Core Guidelines](#design-philosophy-simplicity-first)
- [Architecture & Technical Details](#architecture-overview)
- [Development Workflow](#development-commands)
- [Current Implementation Status](#current-implementation-status)
- [Future Roadmap](#roadmap-personal-secretary-ai-enhancement)

### 🎯 Key Points for Development
- **Simplicity First**: Default to simple solutions (see Design Philosophy below)
- **No Build Process**: This is a static PWA - no webpack/babel/transpilation
- **Offline First**: Everything works without internet connectivity
- **Single User**: No authentication complexity needed
- **Current Phase**: Multi-Date System (Phase 3A) ✅ Date Navigation Complete

---

# PART 1: CORE GUIDELINES

## Design Philosophy: Simplicity First

**Guiding Principle**: Default to simple solutions, but don't be afraid of complexity when it adds real value.

### Why Simplicity Matters

Secretary AI is a personal productivity tool designed to help users manage tasks efficiently. Complex solutions often:
- Increase maintenance burden
- Make the app harder to understand and modify
- Add potential points of failure
- Slow down development of actual features

### Simplicity Guidelines

**Start Simple**:
- Begin with the most straightforward solution that solves the problem
- Use existing patterns and modules in the codebase
- Leverage browser APIs before adding external dependencies
- Write code that's easy to understand and modify

**Consider Complexity When**:
- It significantly improves user experience
- It solves a real performance or reliability issue
- It reduces code duplication across multiple features
- The simple solution has clear, documented limitations

### Practical Examples

**Good Default Approach**:
```javascript
// Simple, direct solution for most cases
function formatTaskDate(date) {
  return new Date(date).toLocaleDateString();
}
```

**When Complexity Adds Value**:
```javascript
// More complex but valuable for user experience
function parseNaturalLanguageDate(input) {
  // Complex parsing logic is justified here because it
  // significantly improves how users interact with the app
  // (allows "tomorrow", "next Friday", etc.)
}
```

### Decision Process

When implementing features:

1. **Start with**: "What's the simplest way to solve this?"
2. **Then ask**: "Does this simple solution have significant drawbacks?"
3. **If yes**: "Does added complexity provide proportional value?"
4. **Document**: If you choose complexity, explain why in comments

### Architecture Considerations

**Current Strengths** (maintain these):
- No build process keeps deployment simple
- Modular structure allows easy feature additions
- Service worker provides offline functionality without complexity
- Single-user design eliminates authentication overhead

**When to Propose Changes**:
- If you identify a pattern that would significantly reduce code duplication
- If performance profiling shows a real bottleneck
- If user feedback indicates a feature needs enhancement
- Always explain the trade-offs and benefits

### Communication with Users

When proposing solutions:
- Default to simple implementations
- If complexity is beneficial, explain why: "I could implement this simply as X, but doing Y would provide [specific benefits]"
- Let users decide if the added complexity is worth it
- Be transparent about maintenance implications

### Remember

- This is a working app that helps users daily - stability matters
- Every line of code should provide value to the end user
- It's easier to add complexity later than to remove it
- The existing architecture has proven successful - enhance rather than rebuild

The goal is thoughtful development that balances simplicity with user value, not rigid adherence to either extreme.

---

# PART 2: CURRENT SYSTEM

## Architecture Overview

Secretary AI is an **offline-first PWA** with a modular, service-oriented architecture:

### Core Module Interaction
- **SecretaryApp** (`js/app.js`) - Main controller coordinating all services
- **TaskParser** (`js/task-parser.js`) - Converts `tasks.md` to structured task objects
- **LLMService** (`js/llm-service.js`) - OpenRouter API integration with fallback scheduling
- **StorageService** (`js/storage.js`) - Coordinates local IndexedDB and cloud sync
- **FirestoreService** (`js/firestore.js`) - Cloud sync with offline-first strategy

### Data Flow Pipeline
1. TaskParser loads/parses `tasks.md` → structured tasks
2. LLMService processes tasks → AI-generated daily schedule via OpenRouter
3. StorageService saves locally + syncs to Firestore
4. UI renders with real-time filtering (shows only upcoming tasks)

## Technical Implementation

### Configuration System

**Environment Detection**: The app auto-detects localhost vs GitHub Pages and adjusts paths accordingly.

**Key Configuration (`js/config.js`)**:
- `FIREBASE_CONFIG` - Firestore credentials for cross-device sync
- `APP_CONFIG.openRouter` - Model selection and fallback chains
- Environment flags control mock data, debug logging, and feature enablement

**Dynamic Path Resolution**: Use `Config.getResourceUrl(path)` for GitHub Pages compatibility instead of relative paths.

### OpenRouter Integration

**Model Strategy**: Primary model with fallback array for reliability:
```javascript
// Default: Claude 3.5 Sonnet → GPT-4o Mini → Free models
```

**Key Features**:
- Structured JSON output via OpenRouter's JSON schema enforcement
- Cost estimation and usage tracking
- Retry logic with exponential backoff
- Authentication testing via `/auth/key` endpoint

**Schedule Generation**: Creates time-aware prompts with current context, handles task prioritization, and implements fallback scheduling when LLM fails.

### Firestore Sync Architecture

**Single-User Design**: Uses fixed user ID (`default-user`) - no authentication required.

**Data Structure**:
```
users/default-user/
├── schedules/{date}           # Daily schedule data
├── task_states/current        # Task completion status  
└── settings/user_preferences  # App configuration
```

**Sync Strategy**: Immediate local save + background cloud sync with "cloud wins" conflict resolution.

### Service Worker Caching

**Multi-layered Strategy**:
- Cache-first for static assets (HTML, CSS, JS)
- Network-first for API calls with offline fallbacks
- Background sync triggers data sync when connection restored

**Important**: Service worker uses relative paths (`./sw.js`) for GitHub Pages compatibility.

### File Dependencies

**Critical Path**: `tasks.md` must exist in root directory for task parsing to work.

**Module Loading Order**: config.js → validation-utils.js → event-manager.js → ui-components.js → storage.js → firestore.js → task-data-service.js → schedule-data-service.js → task-parser.js → llm-service.js → app.js (as defined in index.html).

**Service Worker**: Caches all JS modules and tasks.md for offline functionality.

**No Build Process**: Direct static file serving - just start a local server and develop.

**Environment Handling**: 
- Development mode (localhost) shows debug logs and can use mock data
- Production mode auto-detects GitHub Pages paths
- Feature flags in config control Firestore, logging, etc.

**Testing**: Use `test-api.html` for debugging OpenRouter API integration and environment detection.

## Common Development Tasks

**Adding New Task Categories**: Modify TaskParser's section detection patterns and add corresponding CSS classes.

**Updating AI Models**: Edit `APP_CONFIG.openRouter.models` array in config.js - first model is primary, others are fallbacks.

**Modifying Sync Logic**: StorageService coordinates local/cloud - modify here for different sync strategies.

**UI Updates**: Main UI rendering in SecretaryApp's `updateScheduleDisplay()` and `renderTaskItem()` methods.

## Deployment Notes

**GitHub Pages**: App auto-detects subdirectory deployment and adjusts all paths accordingly. No configuration needed.

**Firebase Setup**: Update `FIREBASE_CONFIG` in config.js with your project credentials. 
⚠️ **SECURITY WARNING**: By default, this app assumes open security rules for simplicity. You MUST secure your Firestore database with proper rules before production use. See the security section below.

**API Key Management**: OpenRouter keys are stored ONLY in browser localStorage - never synced to cloud. This prevents API key theft if your Firestore is compromised.

## File Dependencies

**Critical Path**: `tasks.md` must exist in root directory for task parsing to work.

**Module Loading Order**: config.js → validation-utils.js → event-manager.js → ui-components.js → storage.js → firestore.js → task-data-service.js → schedule-data-service.js → task-parser.js → llm-service.js → app.js (as defined in index.html).

**Service Worker**: Caches all JS modules and tasks.md for offline functionality.

## Current Implementation Status

### Phase 2: Task Management Interface (COMPLETED ✅)

The app now includes a complete task management system with the following features:

#### Core Features Implemented
1. **View Toggle System**: Switch between Schedule and Task Management views
2. **Task CRUD Operations**: Create, read, update, delete tasks via web interface
3. **Rich Task Editor**: Natural language dates, priority levels, sub-tasks, categories
4. **Organization Tools**: Collapsible sections, search, filters, bulk operations
5. **Real-time Sync**: Event-driven updates with Firestore integration
6. **Mobile Optimized**: Touch-friendly interface with responsive design

#### Technical Components Added
- **UI Components** (`js/ui-components.js`): Reusable component architecture
- **Event System** (`js/event-manager.js`): Pub/sub pattern for real-time updates
- **Validation** (`js/validation-utils.js`): Natural language parsing, input sanitization
- **Task Management CSS** (`css/task-management.css`): Complete responsive styling
- **Data Services**: TaskDataService and ScheduleDataService for persistence

#### Success Metrics Achieved
- Task management operations < 30 seconds
- Natural language date parsing
- Real-time UI updates
- Full mobile responsiveness
- Complete CRUD functionality

With Phase 2 complete, the foundation is ready for Phase 3 (Multi-Date System).

### Phase 3A: Date Navigation (COMPLETED ✅)

The app now includes core date navigation functionality:

#### Features Implemented
1. **Date Navigation Controls**: Previous/Next day buttons with intuitive UI
2. **Date Picker Integration**: Native browser date selection within ±30 days
3. **Dynamic Schedule Generation**: Schedules generated for any selected date
4. **Smart Title Updates**: Context-aware headers (Today/Tomorrow/Yesterday)
5. **Keyboard Shortcuts**: Arrow keys for navigation, 'T' to return to today
6. **Performance Optimization**: Schedule caching for visited dates

#### Technical Implementation
- Added `currentViewDate` state management in SecretaryApp
- Modified LLM prompts to be date-specific
- Enhanced TaskParser to filter tasks by target date
- Integrated with existing ScheduleDataService for persistence
- Mobile-responsive design with adjusted controls

With Phase 3A complete, the foundation for multi-date scheduling is in place.

### Task Duplication Fix (COMPLETED ✅)

Implemented comprehensive fixes to prevent task duplication issues:

#### Fixes Applied
1. **Migration Lock System**: Added localStorage-based locking to prevent concurrent migrations
2. **Smart Re-migration**: Only triggers when task count differs by >10% or >5 tasks
3. **Duplicate Prevention**: `createTask` now checks for existing similar tasks before creating
4. **Update Protection**: `updateTask` prevents renaming tasks to match existing ones
5. **Rollover Deduplication**: Filters out rollover tasks that already exist
6. **Manual Cleanup**: Added "Remove Duplicate Tasks" button in settings (no 24-hour restriction)

#### User Actions
- If experiencing duplicates, use the "Remove Duplicate Tasks" button in Settings
- The system automatically keeps the best version (completed > detailed > oldest)
- Console commands available: `app.manualDeduplication()` and `app.forceTaskMigration()`

These fixes follow the simplicity principle - preventing duplicates at creation time rather than complex background processes.

### Phase 3 Remaining Implementation Plan

#### Infrastructure Preparations (COMPLETED ✅)
1. **Cache Management**: LRU eviction with 30-day limit per cache
2. **Pagination**: `getScheduleHistory()` supports limit/offset
3. **Performance Monitoring**: Tracks all major operations with P95 metrics
4. **Task Rollover**: Methods to identify and carry forward incomplete tasks

#### Phase 3B: Calendar UI & Visual Planning (Next Priority)

**Objective**: Add month view calendar for visual schedule overview and quick navigation.

**Implementation Details**:

1. **Create CalendarView Component** (`js/calendar-view.js`):
```javascript
class CalendarView extends UIComponent {
    // Extend existing UIComponent base
    // Use CSS Grid for month layout
    // generateMonthGrid(year, month)
    // markScheduledDates(scheduledDates)
    // handleDateClick(date)
}
```

2. **Visual Indicators**:
   - Dot indicators for days with schedules
   - Color coding: green (high completion), yellow (partial), red (low/none)
   - Highlight current view date
   - Show today with distinct styling

3. **Integration**:
   - Add calendar icon button next to view toggle
   - Slide-down animation for calendar reveal
   - Click date → navigate and close calendar
   - Swipe support on mobile

4. **Data Requirements**:
   - Fetch schedule indicators for visible month
   - Use `getScheduleHistory()` with appropriate date range
   - Cache month indicators for performance

**Simplicity Focus**: No external calendar libraries. Pure CSS Grid + native date handling.

#### Phase 3C: Cross-Date Intelligence (Week 2)

**Objective**: Make AI consider multiple days when generating schedules.

**Implementation Details**:

1. **Enhanced LLM Context**:
```javascript
// In llm-service.js, modify generateDailySchedule()
async generateDailySchedule(tasks, targetDate, context = {}) {
    const enhancedPrompt = this.createEnhancedPrompt({
        tasks,
        targetDate,
        previousIncomplete: context.rolloverTasks || [],
        upcomingDays: context.upcomingSchedules || [],
        completionHistory: context.recentPatterns || {},
        workloadBalance: context.workloadSummary || {}
    });
}
```

2. **Rollover Integration**:
   - Before generating schedule, check `scheduleDataService.checkForRollovers()`
   - Include incomplete tasks with special marking
   - Add UI indicator: "↻ Rolled from yesterday"

3. **Workload Balancing**:
   - Calculate daily capacity (sum of task durations)
   - Flag overloaded days in prompt
   - Simple heuristic: >8 hours = overloaded
   - Suggest redistribution: "Consider moving non-urgent tasks"

4. **Multi-Day Context Window**:
   - Load previous 2 days + next 3 days of schedules
   - Pass summary to LLM: task counts, total hours, completion rates
   - Let AI naturally balance based on context

**Simplicity Focus**: Enhance existing prompt rather than complex new algorithms.

#### Phase 3D: Pattern Analysis & Learning (Week 3)

**Objective**: Learn from user behavior to improve future scheduling.

**Implementation Details**:

1. **Create PatternAnalyzer Service** (`js/pattern-analyzer.js`):
```javascript
class PatternAnalyzer {
    analyzeCompletionPatterns(historicalData) {
        // Time-of-day analysis
        // Day-of-week patterns  
        // Category success rates
        // Task duration accuracy
    }
    
    getInsights() {
        // Return human-readable insights
        // "You complete 85% of morning tasks"
        // "Fridays have lowest completion rate"
    }
}
```

2. **Insights Storage**:
   - Store in localStorage as `secretaryai_patterns`
   - Update weekly with rolling 30-day window
   - No new Firestore collections needed

3. **Productivity Dashboard**:
   - Add insights icon "📊" to header
   - Modal showing:
     - Weekly completion trends
     - Best/worst performance days
     - Category success rates
     - Time estimation accuracy

4. **Feed to LLM**:
```javascript
// Include in prompt
userPatterns: {
    bestProductiveHours: "9am-12pm",
    lowEnergyPeriods: "2pm-4pm", 
    categoryPreferences: {
        "exercise": "morning",
        "deepWork": "late morning"
    }
}
```

**Simplicity Focus**: Basic statistical analysis, no ML models. Let LLM interpret patterns.

#### Mobile-First Considerations (All Phases)

1. **Touch Optimizations**:
   - Larger tap targets (min 44px)
   - Swipe gestures for date navigation
   - Pull-to-refresh on schedule view

2. **Responsive Breakpoints**:
   - Calendar: 7-day rows on mobile, full month on desktop
   - Insights: Cards stack vertically on mobile
   - Maintain existing responsive patterns

#### Performance Targets

- Calendar render: <100ms
- Pattern analysis: <200ms (run in background)
- Multi-day context load: <500ms (parallel fetches)
- All operations tracked by PerformanceMonitor

#### Testing Approach

1. **Calendar**: Test with multiple months of data
2. **Rollover**: Test with incomplete tasks across date boundaries
3. **Patterns**: Test with minimal data (graceful degradation)
4. **Mobile**: Test on actual devices, not just responsive mode

---

# PART 3: DEVELOPMENT GUIDE

## Development Commands

```bash
# Local development server (Python)
npm run start

# Alternative dev server with no cache (Node.js)
npm run serve

# Validate JavaScript syntax
npm run validate

# Basic PWA functionality test
npm run test
```

## Development Patterns

**Simplicity First**: See "Design Philosophy" section above. This is the #1 priority.

**No Build Process**: Direct static file serving - just start a local server and develop.

**Environment Handling**: 
- Development mode (localhost) shows debug logs and can use mock data
- Production mode auto-detects GitHub Pages paths
- Feature flags in config control Firestore, logging, etc.

**Testing**: Use `test-api.html` for debugging OpenRouter API integration and environment detection.

## Common Development Tasks

**Adding New Task Categories**: Modify TaskParser's section detection patterns and add corresponding CSS classes.

**Updating AI Models**: Edit `APP_CONFIG.openRouter.models` array in config.js - first model is primary, others are fallbacks.

**Modifying Sync Logic**: StorageService coordinates local/cloud - modify here for different sync strategies.

**UI Updates**: Main UI rendering in SecretaryApp's `updateScheduleDisplay()` and `renderTaskItem()` methods.

## Deployment Notes

**GitHub Pages**: App auto-detects subdirectory deployment and adjusts all paths accordingly. No configuration needed.

**Firebase Setup**: Update `FIREBASE_CONFIG` in config.js with your project credentials. 
⚠️ **SECURITY WARNING**: By default, this app assumes open security rules for simplicity. You MUST secure your Firestore database with proper rules before production use. See the security section below.

**API Key Management**: OpenRouter keys are stored ONLY in browser localStorage - never synced to cloud. This prevents API key theft if your Firestore is compromised.

## 🔒 Security Configuration

### Firestore Security Rules

⚠️ **CRITICAL**: The default setup uses open security rules for testing. In production, you MUST secure your Firestore database to prevent unauthorized access.

**Recommended Firestore Rules** (paste in Firebase Console):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow authenticated users to read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // For single-user setup without auth, restrict by IP or remove after setup
    match /users/default-user/{document=**} {
      // TEMPORARY: Replace with proper authentication
      allow read, write: if true; // CHANGE THIS!
    }
  }
}
```

### API Key Security

1. **Never store API keys in Firestore** - The app now prevents this automatically
2. **API keys are stored only in browser localStorage** - Not synced to cloud
3. **Each device needs its own API key entry** - This is by design for security
4. **If your API key was compromised**:
   - Generate a new key at https://openrouter.ai/keys
   - Clear your browser's localStorage
   - Re-enter the new key in settings

---

# PART 4: FUTURE ROADMAP

## Roadmap: Personal Secretary AI Enhancement

**Vision**: Transform Secretary AI from a schedule viewer into a comprehensive personal AI assistant that manages tasks, creates intelligent schedules, and helps plan across multiple days.

### Current State vs Target State

**Current**: Read tasks.md → Generate today's schedule → Display upcoming tasks
**Target**: Full task management + Multi-date planning + AI personal secretary features

### Core Features to Build

#### 1. **Web-Based Task Management** (Foundation)
- **CRUD Operations**: Add, edit, delete tasks directly in the web app (no more editing tasks.md in code)
- **Task Categories**: Today, Upcoming (with dates), Daily routines, Weekly, Monthly, Yearly, Undated
- **Smart Input**: Quick-add text box + detailed forms for complex tasks
- **Priority Management**: High/Medium/Low with visual indicators
- **Sub-tasks & Reminders**: Full support for nested task details
- **Drag-and-Drop**: Move tasks between categories and reorder priorities

#### 2. **Multi-Date Schedule System** (Core Feature)
- **Date Navigation**: Previous/Next day buttons, date picker for any date
- **Past Schedule View**: "What was I supposed to do on June 10th?"
- **Future Planning**: "Plan my schedule for next Tuesday"
- **Schedule History**: Track what was completed vs what was planned
- **Calendar Integration**: Month/week view for long-term planning
- **Cross-Date Intelligence**: AI considers multi-day context when scheduling

#### 3. **Enhanced AI Scheduling** (Expand Current)
- **Date-Specific Scheduling**: Generate schedules for any past/future date
- **Context Awareness**: AI considers existing schedules, past completion patterns
- **Multi-Day Planning**: "Plan my next 3 days based on my workload"
- **Schedule Optimization**: AI suggests better task timing and dependencies
- **Adaptive Learning**: AI learns from completion patterns and preferences

#### 4. **Personal Secretary Features** (Advanced)
- **Daily Planning Sessions**: "What should I focus on today given my energy levels?"
- **Progress Tracking**: Mark tasks complete, track habit consistency
- **Proactive Suggestions**: "You usually do laundry on weekends, want me to schedule it?"
- **Weekly Reviews**: "How did this week go? What patterns do you see?"
- **Smart Reminders**: Context-aware notifications based on location, time, energy

### Technical Implementation Plan

#### Phase 1: Data Layer Foundation
1. **TaskDataService**: New service to manage structured task data in Firestore
   - JSON schema matching current TaskParser structure (seamless transition)
   - CRUD operations with real-time sync
   - Section management and task relationships

2. **ScheduleDataService**: Store generated schedules by date
   - Historical schedule storage: `schedules/{YYYY-MM-DD}`
   - Completion tracking and progress metrics
   - Cross-date schedule coordination

3. **Data Migration**: Convert existing tasks.md to structured JSON
   - Parse current tasks.md using existing TaskParser
   - Migrate to Firestore as initial structured dataset
   - Maintain tasks.md export functionality for backup

#### Phase 2: Task Management Interface
1. **Task Editor UI**: Rich forms for task management
   - Inline editing with markdown support
   - Category dropdown with smart defaults
   - Date picker with natural language input ("next Friday")
   - Priority and reminder management

2. **Task Organization Views**:
   - Collapsible sections for each category
   - Search and filter functionality
   - Bulk operations (select multiple tasks)
   - Task templates for common routines

3. **Quick Actions**: Streamlined task creation
   - Floating action button for quick add
   - Voice-to-text task input
   - Smart category detection from task text

#### Phase 3: Multi-Date System
1. **Date Navigation UI**: 
   - Calendar widget with schedule indicators
   - Quick navigation (today, tomorrow, next week)
   - Schedule density visualization

2. **Historical Data**:
   - Past schedule storage and retrieval
   - Completion rate tracking
   - Pattern analysis for AI learning

3. **Future Planning**:
   - Schedule generation for any future date
   - Workload balancing across multiple days
   - Deadline-aware task distribution

#### Phase 4: AI Secretary Enhancement
1. **Conversational Interface**: 
   - Chat-like interaction with AI secretary
   - Natural language task creation and modification
   - Planning consultation ("What should I do first?")

2. **Intelligent Insights**:
   - Productivity pattern recognition
   - Optimal scheduling suggestions
   - Habit formation recommendations

3. **Proactive Management**:
   - Automated routine scheduling
   - Deadline and appointment preparation
   - Energy-level based task ordering

### Data Architecture Changes

#### New Firestore Structure
```
users/default-user/
├── tasks/
│   ├── {task-id}              # Individual task documents
│   └── categories/            # Category configurations
├── schedules/
│   ├── {YYYY-MM-DD}          # Daily generated schedules
│   └── history/              # Completion tracking
├── settings/
│   ├── user_preferences      # Current settings
│   └── ai_learning           # AI behavior customization
└── analytics/
    ├── productivity_metrics  # Performance tracking
    └── pattern_analysis      # Behavioral insights
```

#### Task Data Structure
```javascript
{
  id: "task-12345",
  text: "Pick up package from Correos",
  section: "upcomingTasks",
  priority: "high",
  date: "2024-06-16",
  completed: false,
  subTasks: ["Take passport"],
  reminders: [{type: "location", text: "Near post office"}],
  createdAt: "2024-06-15T10:30:00Z",
  modifiedAt: "2024-06-15T10:30:00Z",
  completedAt: null,
  estimatedDuration: 30,
  actualDuration: null
}
```

### Backward Compatibility Strategy

1. **TaskParser Evolution**: 
   - Primary mode: Work with structured JSON from Firestore
   - Legacy mode: Continue parsing tasks.md for import
   - Export mode: Generate tasks.md from structured data

2. **Gradual Migration**:
   - Phase 1: Dual system (read tasks.md, save to Firestore)
   - Phase 2: Firestore primary (tasks.md as backup)
   - Phase 3: Full web-based management (tasks.md export only)

3. **LLMService Compatibility**:
   - No changes needed - same JSON structure expected
   - Potentially faster since no markdown parsing required
   - Enhanced context from historical data

### Success Metrics

#### User Experience
- **Task Management**: Time to add/edit tasks < 30 seconds
- **Schedule Access**: View any date's schedule < 3 seconds
- **Cross-Device**: Changes sync < 5 seconds
- **Offline Support**: Full functionality without internet

#### AI Secretary Performance  
- **Schedule Quality**: User satisfaction with AI suggestions
- **Predictive Accuracy**: AI learns user patterns effectively
- **Proactive Value**: AI identifies optimization opportunities
- **Planning Efficiency**: Reduces daily planning time by 50%

### Implementation Priority

**Must Have (MVP)**: Web task editing, basic CRUD, sync with existing AI
**Should Have**: Multi-date view, historical schedules, improved AI context
**Could Have**: Advanced analytics, conversational interface, habit tracking
**Won't Have (V1)**: Team sharing, complex project management, external integrations

This roadmap transforms Secretary AI from "AI schedule viewer" to "AI personal secretary" - a comprehensive system for task management and intelligent daily planning that grows with the user's needs.