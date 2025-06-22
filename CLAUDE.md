# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Navigation
- [Essential Guidelines](#essential-guidelines)
- [Current System](#current-system)
- [Implementation Status](#implementation-status)
- [Known Issues](#known-issues--technical-debt)
- [Development Guide](#development-guide)
- [Future Roadmap](#future-roadmap)

---

# ESSENTIAL GUIDELINES

## 🎯 Key Development Principles
- **Simplicity First**: Default to simple solutions, add complexity only when it provides real value
- **No Build Process**: Static PWA - no webpack/babel/transpilation
- **Offline First**: Everything works without internet connectivity
- **Single User**: No authentication complexity (uses fixed `default-user` ID)
- **Current Status**: Phase 3 (Multi-Date System) ✅ COMPLETE

## Design Philosophy

1. **Start Simple**: Use existing patterns, browser APIs, and straightforward solutions
2. **Add Complexity Only When**:
   - It significantly improves user experience
   - It solves real performance/reliability issues
   - It reduces substantial code duplication
   - The simple solution has clear limitations

3. **Decision Process**:
   - What's the simplest solution?
   - Does it have significant drawbacks?
   - Does complexity provide proportional value?
   - Document why if choosing complexity

---

# CURRENT SYSTEM

## Architecture Overview

**Offline-first PWA** with modular, service-oriented architecture:

### Core Architecture (After Code Splitting)

**Main Controller**:
- **AppController** (`app-controller.js`) - Main coordinator (954 lines, reduced from 2,779)

**Managers** (extracted from original app.js):
- **SettingsManager** (`managers/settings-manager.js`) - Settings and configuration
- **DateNavigationManager** (`managers/date-navigation-manager.js`) - Date navigation and calendar
- **UIManager** (`managers/ui-manager.js`) - UI updates and user feedback
- **ScheduleManager** (`managers/schedule-manager.js`) - Schedule generation and display
- **TaskManager** (`managers/task-manager.js`) - Task CRUD and filtering

**Core Services**:
- **TaskParser** (`task-parser.js`) - Converts tasks.md to structured data
- **LLMService** (`llm-service.js`) - OpenRouter API with fallback models
- **TaskDataService** (`task-data-service.js`) - Task CRUD with pagination
- **ScheduleDataService** (`schedule-data-service.js`) - Schedule persistence with pagination
- **StorageService** (`storage.js`) - Local/cloud sync coordination
- **FirestoreService** (`firestore.js`) - Cloud sync backend
- **PatternAnalyzer** (`pattern-analyzer.js`) - Productivity analytics
- **CalendarView** (`calendar-view.js`) - Month navigation UI
- **InsightsModal** (`insights-modal.js`) - Analytics dashboard
- **PerformanceMonitor** (`performance-monitor.js`) - Performance tracking
- **TaskIndexManager** (`task-index-manager.js`) - Indexed task filtering with O(1) lookups

### Data Flow
1. TaskDataService loads from Firestore (or TaskParser from tasks.md)
2. User navigates date → ScheduleDataService checks for schedule
3. If no schedule → LLMService generates with multi-day context
4. UI renders with calendar, insights, and task management

### Key Technical Details

**Firestore Structure**:
```
users/default-user/
├── schedules/{date}     # Daily schedules
├── history/{date}       # Historical records
├── tasks/{task-id}      # Individual tasks
├── task_states/current  # Completion status
└── settings/            # User preferences
```

**Configuration** (`config.js`):
- Auto-detects localhost vs GitHub Pages
- `FIREBASE_CONFIG` for cloud sync
- `APP_CONFIG.openRouter` for AI models
- Feature flags for debugging

**Module Loading Order** (from app-init.js):
validation-utils → event-registry → llm-service → firestore → task-data-service → schedule-data-service → task-index-manager → app-state → base-manager → managers (settings, date-navigation, ui, schedule, task) → app-controller → (secondary modules loaded later: ui-components, pattern-analyzer)

**Critical Dependencies**:
- All tasks managed exclusively through web UI (Firestore)
- Service worker (`sw.js`) enables offline functionality
- No build process - direct static file serving

---

# IMPLEMENTATION STATUS

## ✅ Completed Features

### Phase 2: Task Management
- Full CRUD operations via web interface
- Natural language date parsing
- Real-time Firestore sync
- Mobile-responsive design

### Phase 3: Multi-Date System
- Date navigation with keyboard shortcuts
- Calendar view (CSS Grid)
- Pattern analysis & insights dashboard
- Task rollover for incomplete items
- Multi-day context for AI scheduling
- Workload balancing (8-hour capacity)
- Past date protection (no retroactive schedules)

### Performance Optimizations (All Complete ✅)
- **DOM Diffing**: 30-60% faster rendering
- **Lazy Loading**: Initial load reduced 86% (45KB vs 331KB)
- **Firestore Pagination**: Queries limited to 50 items with cursor pagination
- **Event Listener Cleanup**: Zero memory leaks from orphaned listeners
- **Task Filtering**: O(1) indexed lookups, 10,000+ tasks filter in <10ms

---

# KNOWN ISSUES & TECHNICAL DEBT

## Current Issues

### 1. Task Duplication Prevention (Low Priority)
- **Status**: Functional but could be enhanced
- **Current Implementation**:
  - Migration lock prevents concurrent migrations
  - Duplicate checking on task creation
  - Manual cleanup available in settings
  - Console commands: `app.manualDeduplication()`
- **Potential Enhancement**: Automatic deduplication during sync

## Recently Completed Fixes

### 1. Property Name Inconsistency ✅ (Fixed 2025-06-22)
- **Issue**: TaskParser used `text` while LLMService used `task` for descriptions
- **Fix**: Standardized all task descriptions to use `text` property
- **Impact**: Removed 6 workaround checks across the codebase

### 2. Bug Fixes ✅
- Fixed PatternAnalyzer infinite recursion
- Fixed Firestore path segments (3 max limit)
- Fixed PerformanceMonitor method name
- Added past date schedule prevention

### 3. Performance Optimizations ✅
- **Task Filtering with Indexes** (2025-06-21)
  - Created TaskIndexManager for O(1) lookups
  - Added search debouncing (300ms)
  - Result caching for unchanged filters
  - Scales to 10,000+ tasks efficiently

---

# DEVELOPMENT GUIDE

## Commands
```bash
npm run start      # Python dev server
npm run serve      # Node.js dev server (no cache)
npm run validate   # Check JS syntax
npm run test       # Basic PWA test
```

## Common Tasks

**Add Task Category**: 
- Modify TaskParser section patterns
- Add corresponding CSS classes

**Update AI Models**: 
- Edit `APP_CONFIG.openRouter.models` in config.js

**Modify Sync**: 
- Update StorageService for sync strategies

**UI Changes**: 
- Main rendering in `updateScheduleDisplay()` and `updateTaskManagementDisplay()`

**Filter Changes**:
- Must call `handleFilterChange()` to reset pagination

## Deployment

### GitHub Pages
Auto-detects paths, no config needed - just enable in repository settings.

### Firebase Setup & Security

**⚠️ CRITICAL SECURITY WARNING**: The default Firebase rules are COMPLETELY OPEN for testing. You MUST secure your database before production deployment.

1. **Update Configuration**
   - Edit `FIREBASE_CONFIG` in config.js with your project details

2. **Secure Your Database** (Required for Production)
   - Go to Firebase Console → Firestore Database → Rules
   - Replace the test rules with proper authentication:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         // TODO: Implement proper authentication
         // For now, the rules are OPEN for testing:
         allow read, write: if true; // ⚠️ CHANGE THIS BEFORE PRODUCTION!
         
         // Example secure rules (requires auth implementation):
         // allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **API Keys Management**
   - Stored in localStorage only (never synced to cloud)
   - Each device needs its own OpenRouter API key
   - Regenerate at https://openrouter.ai/keys if compromised

### Production Deployment Checklist
- [ ] Firebase security rules updated
- [ ] API keys configured per device
- [ ] Test offline functionality
- [ ] Verify GitHub Pages base URL detection
- [ ] Check PWA installation works

---

# FUTURE ROADMAP

## Phase 4: Pagination Optimizations (Optional)

### 1. Intelligent Prefetching
- Use IntersectionObserver at 80% scroll
- Background fetch next page
- Separate prefetch cache

### 2. Performance Metrics
- Track: `pagination-load-time`, `pagination-render-time`
- Integrate with PerformanceMonitor
- Create metrics dashboard

### 3. Infinite Scroll Option
- User preference toggle
- Virtual scrolling for 1000+ items
- Fallback to button if issues

### 4. Dynamic Page Size
- Adjust 20-200 based on performance
- Consider device, network, memory
- User override in settings

## Next Major Features

### Enhanced AI Integration
- Deeper multi-day context usage
- AI-suggested task redistribution
- Learning from user feedback
- Natural language commands

### Advanced Planning
- Project task breakdown
- Recurring task templates
- Goal tracking
- Time blocking

### Personal Secretary Features
- Conversational interface
- Proactive suggestions
- Weekly reviews
- Context-aware reminders

## Success Metrics
- Task operations < 30 seconds
- Schedule load < 3 seconds
- Sync < 5 seconds
- 50% reduction in planning time

---

## Important Reminders
- Stability matters - this is a daily-use app
- Every line should provide user value
- Enhance rather than rebuild
- Document complexity choices
- Test on real devices, not just responsive mode