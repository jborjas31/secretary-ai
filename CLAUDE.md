# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Configuration System

**Environment Detection**: The app auto-detects localhost vs GitHub Pages and adjusts paths accordingly.

**Key Configuration (`js/config.js`)**:
- `FIREBASE_CONFIG` - Firestore credentials for cross-device sync
- `APP_CONFIG.openRouter` - Model selection and fallback chains
- Environment flags control mock data, debug logging, and feature enablement

**Dynamic Path Resolution**: Use `Config.getResourceUrl(path)` for GitHub Pages compatibility instead of relative paths.

## OpenRouter Integration

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

## Firestore Sync Architecture

**Single-User Design**: Uses fixed user ID (`default-user`) - no authentication required.

**Data Structure**:
```
users/default-user/
├── schedules/{date}           # Daily schedule data
├── task_states/current        # Task completion status  
└── settings/user_preferences  # App configuration
```

**Sync Strategy**: Immediate local save + background cloud sync with "cloud wins" conflict resolution.

## Service Worker Caching

**Multi-layered Strategy**:
- Cache-first for static assets (HTML, CSS, JS)
- Network-first for API calls with offline fallbacks
- Background sync triggers data sync when connection restored

**Important**: Service worker uses relative paths (`./sw.js`) for GitHub Pages compatibility.

## Development Patterns

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

**Firebase Setup**: Update `FIREBASE_CONFIG` in config.js with your project credentials. Single-user setup uses open security rules.

**API Key Management**: OpenRouter keys stored in browser localStorage - never commit to repository.

## File Dependencies

**Critical Path**: `tasks.md` must exist in root directory for task parsing to work.

**Module Loading Order**: config.js → storage.js → firestore.js → task-parser.js → llm-service.js → app.js (as defined in index.html).

**Service Worker**: Caches all JS modules and tasks.md for offline functionality.

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