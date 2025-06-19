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
- **TaskDataService** (`js/task-data-service.js`) - Manages task CRUD operations in Firestore
- **ScheduleDataService** (`js/schedule-data-service.js`) - Handles schedule persistence and history
- **PatternAnalyzer** (`js/pattern-analyzer.js`) - Analyzes user behavior and productivity patterns
- **CalendarView** (`js/calendar-view.js`) - Month view calendar UI component
- **InsightsModal** (`js/insights-modal.js`) - Displays productivity insights and analytics
- **PerformanceMonitor** (`js/performance-monitor.js`) - Tracks operation performance metrics

### Data Flow Pipeline
1. TaskDataService loads tasks from Firestore (or TaskParser loads from `tasks.md` as fallback)
2. User navigates to a date → ScheduleDataService checks for existing schedule
3. If no schedule exists:
   - PatternAnalyzer provides user behavior insights
   - LLMService generates schedule with context (rollover tasks, patterns)
   - ScheduleDataService saves to Firestore + history collection
4. UI renders schedule with:
   - CalendarView for month overview
   - Date navigation controls
   - Task completion tracking
   - InsightsModal for productivity analytics

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
├── history/{date}             # Historical schedule records
├── tasks/{task-id}            # Individual task documents
├── task_states/current        # Task completion status  
├── settings/user_preferences  # App configuration
└── analytics/patterns         # User behavior patterns (local storage)
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

**Module Loading Order**: config.js → performance-monitor.js → validation-utils.js → event-manager.js → ui-components.js → storage.js → firestore.js → task-data-service.js → schedule-data-service.js → task-parser.js → llm-service.js → pattern-analyzer.js → insights-modal.js → calendar-view.js → app.js (as defined in index.html).

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

**Module Loading Order**: config.js → performance-monitor.js → validation-utils.js → event-manager.js → ui-components.js → storage.js → firestore.js → task-data-service.js → schedule-data-service.js → task-parser.js → llm-service.js → pattern-analyzer.js → insights-modal.js → calendar-view.js → app.js (as defined in index.html).

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

### Technical Debt: Property Name Inconsistency

**Issue**: The app uses different property names for task descriptions in different contexts:
- **TaskParser** (tasks from tasks.md): Uses `text` property
- **LLMService** (scheduled tasks): Uses `task` property

**Current Workaround**: The rollover task duplicate checking in app.js (lines 300-311) uses a helper function that checks both properties to handle this inconsistency.

**Future Refactoring Recommendation**:
1. Standardize on a single property name throughout the codebase (suggest using `text` for consistency with existing task data)
2. Update affected files:
   - `js/llm-service.js`: Change JSON schema from `task` to `text`
   - `js/app.js`: Update `renderTaskItem()` and other methods
   - Any other files that reference task descriptions
3. Run thorough testing to ensure no breaking changes
4. This refactoring would improve code consistency and prevent future property-related errors

**Note**: The current workaround is stable and follows the simplicity principle. Refactoring can be done when there's time for comprehensive testing.

### Recent Bug Fixes (2025-06-19)

1. **Fixed Infinite Recursion in PatternAnalyzer**:
   - Issue: `getInsights()` and `getRecommendations()` were calling each other
   - Fix: Removed `recommendations` from `getInsights()` and made `getRecommendations()` call specific insight methods directly

2. **Fixed Firestore Collection Path Error**:
   - Issue: Path `users/default-user/schedules/history` had 4 segments (invalid)
   - Fix: Changed to `users/default-user/history` (3 segments)
   - Affected: schedule-data-service.js history collection references

3. **Fixed PerformanceMonitor Method Error**:
   - Issue: Code was calling non-existent `track()` method
   - Fix: Changed to use the correct `recordMetric()` method
   - Note: Always check method existence before calling

4. **Prevented Schedule Generation for Past Dates**:
   - Issue: App was generating new schedules for past dates that had no schedule
   - Fix: Added date check to prevent generating schedules for dates before today
   - Behavior: Past dates without schedules now remain empty with info message
   - Rationale: Maintains historical accuracy - no retroactive schedule creation

### Phase 3 Implementation Summary

Phase 3 (Multi-Date System) is now largely complete with significant achievements:

#### Completed Components ✅
1. **Infrastructure**: Cache management, pagination, performance monitoring
2. **Date Navigation**: Full navigation with keyboard shortcuts and date picker
3. **Calendar View**: Month view with CSS Grid, mobile-responsive design  
4. **Pattern Analysis**: Complete analytics system with insights dashboard
5. **Rollover Tasks**: Automatic carrying forward of incomplete tasks
6. **Multi-Day Context**: Loading and caching of surrounding days' schedules
7. **Past Date Handling**: Smart logic to prevent retroactive schedule generation

#### Partially Complete 🚧
- **Cross-Date Intelligence**: Foundation built but LLM needs better context usage
- **Workload Balancing**: Data available but not yet integrated into prompts

The app has evolved from a simple daily schedule viewer to a comprehensive multi-date task management system with AI-powered scheduling and productivity analytics.

#### Phase 3B: Calendar UI & Visual Planning (COMPLETED ✅)

**Implemented Features**:

1. **CalendarView Component** (`js/calendar-view.js`):
   - Extends UIComponent base class
   - CSS Grid layout for month view
   - Dynamic month generation with proper week alignment
   - Click navigation to any date
   - Keyboard support (arrow keys, Enter, Escape)

2. **Visual Design**:
   - Clean month grid with day headers
   - Today highlighted with distinct styling
   - Selected date indication
   - Hover effects for better UX
   - Mobile-responsive design

3. **Integration**:
   - Calendar icon button in header
   - Slide-down animation
   - Click outside to close
   - Smooth date navigation

4. **Performance**:
   - Efficient DOM manipulation
   - No external dependencies
   - Pure CSS Grid + native date handling

The calendar provides quick visual navigation across dates and integrates seamlessly with the existing date navigation system.

#### Phase 3C: Cross-Date Intelligence (PARTIALLY COMPLETED 🚧)

**Objective**: Make AI consider multiple days when generating schedules.

**Completed Features**:

1. **Rollover Task Integration** ✅:
   - `scheduleDataService.checkForRollovers()` identifies incomplete tasks
   - Rollover tasks included in schedule generation
   - UI shows "↻" indicator for rolled-over tasks
   - Duplicate prevention when same task exists in current day

2. **Multi-Day Context Loading** ✅:
   - `loadMultiDayContext()` loads previous 2 + next 3 days
   - Context passed to LLM for better scheduling decisions
   - Performance optimized with parallel fetching

**Still To Implement**:

3. **Enhanced LLM Prompts** 🔄:
   - Need to pass multi-day context to LLM
   - Include workload summaries in prompts
   - Add completion history context

4. **Workload Balancing** 📋:
   - Calculate daily capacity from durations
   - Flag overloaded days (>8 hours)
   - Suggest task redistribution

The foundation is in place, but the LLM needs better context utilization for true cross-date intelligence.

#### Phase 3D: Pattern Analysis & Learning (COMPLETED ✅)

**Implemented Features**:

1. **PatternAnalyzer Service** (`js/pattern-analyzer.js`):
   - Analyzes completion patterns from historical data
   - Time-of-day productivity analysis
   - Day-of-week pattern recognition
   - Category success rate tracking
   - Duration estimation accuracy metrics

2. **Insights Generation**:
   - `getInsights()` returns human-readable insights
   - `getRecommendations()` provides actionable suggestions
   - Identifies best/worst productive times and days
   - Tracks task completion by priority and category

3. **InsightsModal UI** (`js/insights-modal.js`):
   - "📊" icon in header opens productivity dashboard
   - Displays:
     - Overview statistics (total tasks, completion rate)
     - Time-of-day performance graphs
     - Day-of-week trends
     - Category breakdowns
     - Priority analysis
     - Personalized recommendations

4. **Data Storage**:
   - Patterns stored in localStorage (`secretaryai_analytics`)
   - 30-day rolling window for analysis
   - Automatic weekly updates
   - No additional Firestore collections

5. **LLM Integration** (Partial):
   - Pattern data available for prompts
   - Basic insights passed to scheduling
   - Full integration still pending

The pattern analysis system is fully functional and provides valuable insights into user productivity patterns.

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

**Current State** (What's Already Built):
- ✅ Web-based task management with full CRUD operations
- ✅ Multi-date navigation with calendar view
- ✅ Schedule generation for any date (with smart past-date handling)
- ✅ Pattern analysis and productivity insights
- ✅ Task rollover from incomplete previous days
- ✅ Real-time sync across devices via Firestore

**Target State** (What's Left to Build):
- Enhanced AI context utilization for smarter scheduling
- Conversational AI interface
- Advanced workload balancing across multiple days
- Habit tracking and formation
- Location-based reminders

### Core Features Still To Build

#### 1. **Enhanced AI Integration**
- **Deeper Context Usage**: Make LLM fully utilize multi-day context, patterns, and insights
- **Workload Balancing**: AI suggests moving tasks between days based on capacity
- **Learning from Feedback**: Track which suggestions work and improve over time
- **Natural Language Commands**: "Reschedule my afternoon" or "Find time for exercise"

#### 2. **Advanced Planning Features**
- **Project Management**: Break large projects into scheduled tasks
- **Recurring Task Templates**: Smart handling of routine variations
- **Goal Tracking**: Connect daily tasks to larger objectives
- **Time Blocking**: Reserve focus time for deep work

#### 3. **Personal Secretary Features** (Advanced)
- **Conversational Interface**: Chat with AI about scheduling and planning
- **Proactive Suggestions**: "You usually do laundry on weekends, want me to schedule it?"
- **Weekly Reviews**: AI-generated summaries of productivity and suggestions
- **Smart Reminders**: Context-aware notifications based on patterns
- **Energy-Level Planning**: Schedule tasks based on typical energy patterns

### Technical Implementation Plan

The foundation is complete (data services, task management, date navigation). Here's what remains:

#### Next Phase: Enhanced AI Context
1. **Improve LLM Prompt Engineering**:
   - Pass full multi-day context to LLM
   - Include pattern analysis insights
   - Add workload summaries across days
   - Implement feedback loop for improvements

2. **Workload Intelligence**:
   - Calculate daily capacity from task durations
   - Identify overloaded days (>8 hours scheduled)
   - Suggest task redistribution
   - Learn optimal task timing from patterns

3. **Smart Scheduling Rules**:
   - Respect energy patterns (no deep work in low-energy times)
   - Consider task dependencies
   - Buffer time between appointments
   - Learn from completion patterns

#### Future Phase: Conversational AI Secretary
1. **Natural Language Interface**: 
   - Chat-like interaction for planning
   - Voice commands for task management
   - Context-aware responses based on history

2. **Proactive Assistant**:
   - Weekly planning sessions
   - Habit formation tracking
   - Deadline reminders with prep time
   - Energy-based task suggestions

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