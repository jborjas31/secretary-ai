# CLAUDE.md

Guidance for Claude Code when working with this personal productivity app.

## 🚀 Quick Start for Claude

**What this is**: A personal task management and scheduling app for a single user who is learning to program.

**Key commands you'll need**:
```bash
npm run validate   # Check JS syntax before committing
npm run serve     # Start dev server
app.scheduleManager.generateSchedule()  # Generate schedule in console
app.manualDeduplication()  # Remove duplicate tasks
```

**Before ANY changes**: Read the relevant section in BEHAVIOR_SPEC.md

---

## 📋 CONTEXT & PURPOSE

### This is a Personal Learning Project
- Built for one user's personal productivity needs
- User is a non-programmer learning to code
- Keep explanations clear and educational
- No multi-user features needed - uses fixed `default-user` ID

### What You're Working With
- **Offline-first PWA** - Works without internet
- **No build process** - Plain JavaScript, no webpack/babel
- **Simple architecture** - Prioritize clarity over cleverness
- **Phase 3 Complete** - Multi-date system is working

---

## 🎯 CORE PRINCIPLES

### DO:
✅ Keep solutions simple and understandable  
✅ Explain changes clearly for learning  
✅ Test on real devices, not just responsive mode  
✅ Enhance existing features rather than rebuild  
✅ Check BEHAVIOR_SPEC.md before making changes  
✅ Maintain stability - this is a daily-use app  
✅ Consider system-wide impact before changes  
✅ Document architectural decisions  

### DON'T:
❌ Add complexity without clear user value  
❌ Create documentation unless explicitly asked  
❌ Commit code without running `npm run validate`  
❌ Change architecture without strong justification  
❌ Assume libraries exist - check package.json first  
❌ Make changes that cascade through multiple components  
❌ Break existing event flows or patterns  

---

## 🏗️ CURRENT ARCHITECTURE

### Core Structure
```
js/
├── app-controller.js          # Main coordinator
├── managers/                  # Feature managers
│   ├── settings-manager.js    # User preferences
│   ├── date-navigation-manager.js  # Calendar/dates
│   ├── ui-manager.js          # UI updates
│   ├── schedule-manager.js    # Schedule generation
│   └── task-manager.js        # Task CRUD
└── services/
    ├── llm-service.js         # AI scheduling
    ├── task-data-service.js   # Task storage
    ├── schedule-data-service.js # Schedule storage
    └── firestore.js           # Cloud sync
```

### How It Works
1. **Tasks** stored in Firestore (no more tasks.md file)
2. **Schedules** generated daily using AI with multi-day context
3. **UI** updates through managers coordinating services
4. **Sync** happens automatically with offline support

### Key Technical Details
- **Firestore paths**: `users/default-user/[tasks|schedules|settings]`
- **Module loading**: Defined in app-init.js (order matters!)
- **Performance**: Lazy loading, DOM diffing, indexed search
- **Capacity**: 8-hour workday, tasks roll over if incomplete

---

## 🔍 ARCHITECTURAL CONSIDERATIONS

### Before Making ANY Change
Always perform a **System-Wide Impact Analysis**:

1. **Ask These Questions First**:
   - Will this change affect other components?
   - Which managers/services depend on this functionality?
   - Does this maintain our simplicity principle?
   - Will this break existing event flows?
   - Is there a simpler solution that fits the existing architecture?

2. **Component Dependency Map**:
   ```
   Component Changed → Affected Components
   ├── AppState → ALL Managers (via events)
   ├── TaskDataService → TaskManager, TaskIndexManager, ScheduleManager
   ├── LLMService → ScheduleManager, SettingsManager
   ├── FirestoreService → TaskDataService, ScheduleDataService, StorageService
   └── Any Manager → UI updates, event flows
   ```

3. **Architecture Integrity Checklist**:
   - [ ] Preserves modular service architecture
   - [ ] Maintains loose coupling between managers
   - [ ] Follows existing event-driven patterns
   - [ ] Doesn't introduce unnecessary complexity
   - [ ] Compatible with offline-first design
   - [ ] Respects the no-build-process constraint

4. **Change Impact Levels**:
   - **LOW**: Isolated to single file, no API changes
   - **MEDIUM**: Affects 2-3 components, minor API changes
   - **HIGH**: Cascades through system, changes event flows
   - **CRITICAL**: Alters core architecture patterns

⚠️ **If impact is MEDIUM or higher, document the change thoroughly!**

---

## 🛠️ WORKING WITH THIS CODEBASE

### Before Making Changes Checklist
1. ⚠️ **ALWAYS** check BEHAVIOR_SPEC.md for expected behavior
2. 🔍 **Review Architectural Considerations** section above
3. Perform system-wide impact analysis
4. Look for existing patterns in similar files
5. Run `npm run validate` before committing
6. Test offline functionality if touching sync code
7. Document changes if impact is MEDIUM or higher

### Common Development Tasks

**Add a task category**:
```javascript
// 1. Update task-parser.js section patterns
// 2. Add CSS class in main.css
// 3. Update BEHAVIOR_SPEC.md
```

**Change AI models**:
```javascript
// Edit config.js:
APP_CONFIG.openRouter.models = [...]
```

**Debug sync issues**:
```javascript
// Console commands:
app.taskDataService.getAllTasks()
app.storageService.performSync()
```

**Test schedule generation**:
```javascript
// Force new schedule:
app.scheduleManager.generateSchedule(true)
```

### File Modification Guidelines
- **UI changes**: Look in `updateScheduleDisplay()` and `updateTaskManagementDisplay()`
- **Filter/search**: Must call `handleFilterChange()` to reset pagination
- **Task operations**: Always go through TaskDataService
- **Date changes**: Use DateNavigationManager methods

---

## ⚠️ ACTIVE ISSUES

### Task Duplication (Low Priority)
- **Current state**: Functional with manual cleanup available
- **Workaround**: Run `app.manualDeduplication()` if needed
- **Future**: May add automatic deduplication

### Firebase Security (HIGH PRIORITY for production)
- **Current**: Rules are OPEN for testing
- **Action needed**: Update Firestore rules before any public deployment
- **Location**: Firebase Console → Firestore → Rules

---

## 🚀 DEPLOYMENT & SECURITY

### ⚠️ CRITICAL: Secure Firebase Before Production
```javascript
// Current rules (TESTING ONLY):
allow read, write: if true;  // CHANGE THIS!

// Production rules (example):
allow read, write: if request.auth != null && request.auth.uid == userId;
```

### Deployment Steps
1. **GitHub Pages**: Just enable in repository settings
2. **Firebase**: Update `FIREBASE_CONFIG` in config.js
3. **API Keys**: Each device needs its own OpenRouter key
4. **Test**: Verify offline mode and PWA installation

---

## 🔮 PLANNED FEATURES

### Next Up
1. **Natural language commands** - "Schedule all urgent tasks for tomorrow"
2. **Weekly reviews** - Automated productivity insights
3. **Project templates** - Break down large projects automatically

### Success Metrics
- Schedule generation < 3 seconds
- Task operations < 30 seconds
- 50% reduction in daily planning time

---

## 📝 NOTES

- **Documentation**: Update BEHAVIOR_SPEC.md for behavior changes, README.md for user-facing changes
- **Performance**: Already optimized for 10,000+ tasks with O(1) filtering
- **Mobile**: Fully responsive but always test on actual devices
- **Offline**: Everything except AI scheduling works offline

Remember: This is a personal productivity tool in active daily use. Stability and simplicity matter more than features.