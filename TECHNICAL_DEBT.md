# Technical Debt Registry

*Last Updated: 2025-06-24*

This document tracks technical debt in the Secretary AI codebase. Items are prioritized to help guide future improvements while maintaining the app's core principles of simplicity and stability.

## Priority Levels
- 🔴 **Critical**: Security vulnerabilities or major architectural issues
- 🟠 **High**: Significant impact on maintainability or user experience
- 🟡 **Medium**: Improvements that would enhance code quality
- 🟢 **Low**: Nice-to-have improvements

---

## 🔴 Critical - Security Debt

### 1. Firebase Security Rules Wide Open
**Location**: Firebase Console, referenced in CLAUDE.md  
**Current State**: `allow read, write: if true;`  
**Impact**: Anyone can read/write all user data  
**Effort**: Medium (requires auth implementation)  
**Solution**: 
- Implement Firebase Authentication
- Update rules to check user ID
- Add rate limiting rules
**Blockers**: Single-user design decision

### 2. No Authentication System
**Location**: System-wide  
**Current State**: Fixed `default-user` ID  
**Impact**: No user isolation, no access control  
**Effort**: High  
**Solution**: 
- Add Firebase Auth
- Implement login/logout flow
- Migrate from fixed user ID
**Note**: May not be needed for personal use app

---

## 🟠 High - Configuration Debt

### 1. Hardcoded Values Throughout Codebase
**Locations**:
- `firestore.js:10` - userId = 'default-user'
- `firestore.js:12` - retryAttempts = 3
- `task-manager.js:26` - pageSize = 50
- `date-navigation-manager.js:10-11` - Date range limits (-30/+30)
- `schedule-data-service.js` - Query limit = 50

**Impact**: Hard to customize, scattered configuration  
**Effort**: Low  
**Solution**: 
- Move all to `config.js`
- Create `APP_CONFIG.defaults` section
- Document all configurable values

### 2. Environment-Specific Configuration
**Location**: `config.js`  
**Current State**: Some env detection, but incomplete  
**Impact**: Deployment friction  
**Effort**: Low  
**Solution**: 
- Centralize all env-specific settings
- Add development/production flags
- Environment variable support

---

## 🟡 Medium - Architecture Debt

### 1. No Centralized Error Handling
**Location**: Throughout managers and services  
**Current State**: Inconsistent try-catch patterns  
**Impact**: Errors handled differently, hard to track  
**Effort**: Medium  
**Solution**: 
- Create ErrorHandler service
- Standardize error types
- Add error reporting/logging
- Implement error boundaries pattern

### 2. Event System Type Safety
**Location**: `event-manager.js`  
**Current State**: String-based events, no type checking  
**Impact**: Typos cause silent failures  
**Effort**: Low  
**Solution**: 
- Use constants for all event names (partially done)
- Add event payload validation
- Consider TypeScript in future

### 3. localStorage Usage Scattered
**Location**: Multiple files access localStorage directly  
**Current State**: No abstraction layer  
**Impact**: Hard to migrate storage, no validation  
**Effort**: Medium  
**Solution**: 
- Create LocalStorageService
- Centralize all localStorage access
- Add data validation/migration

### 4. Commented Out Code
**Examples**:
- `date-navigation-manager.js:32` - todayBtn reference
- Various "This button does not exist" comments

**Impact**: Confusion, incomplete features  
**Effort**: Low  
**Solution**: 
- Remove or implement missing features
- Add TODO comments if planned

---

## 🟢 Low - Code Quality Debt

### 1. Task Duplication Prevention
**Location**: `task-data-service.js`  
**Current State**: Manual cleanup only  
**Impact**: Occasional duplicate tasks  
**Effort**: Medium  
**Solution**: 
- Add automatic deduplication
- Improve duplicate detection logic
- Background cleanup job

### 2. Large Manager Classes
**Location**: `task-manager.js` (900+ lines)  
**Current State**: Some managers doing too much  
**Impact**: Hard to maintain and test  
**Effort**: Medium  
**Solution**: 
- Further split responsibilities
- Extract task list rendering
- Separate search/filter logic

### 3. Missing Tests
**Location**: Project-wide  
**Current State**: Manual testing only  
**Impact**: Regression risk  
**Effort**: High  
**Solution**: 
- Add unit tests for services
- Integration tests for workflows
- E2E tests for critical paths

### 4. Inconsistent Async Patterns
**Location**: Various  
**Current State**: Mix of async/await and promises  
**Impact**: Harder to read and maintain  
**Effort**: Low  
**Solution**: 
- Standardize on async/await
- Add consistent error handling

---

## 🟢 Low - Performance Debt

### 1. Calendar View Full Rebuilds
**Location**: `calendar-view.js`  
**Current State**: Rebuilds entire month on any change  
**Impact**: Unnecessary DOM operations  
**Effort**: Low  
**Solution**: 
- Implement surgical updates
- Cache rendered cells
- Only update changed dates

### 2. No Virtual Scrolling
**Location**: Task list rendering  
**Current State**: Renders all tasks in DOM  
**Impact**: Performance with 1000+ tasks  
**Effort**: High  
**Solution**: 
- Implement virtual scrolling
- Or use intersection observer
- Progressive rendering

### 3. Unbounded Cache Growth
**Location**: Various caches (schedule, task)  
**Current State**: No cache eviction  
**Impact**: Memory usage grows over time  
**Effort**: Low  
**Solution**: 
- Add LRU cache implementation
- Set max cache sizes
- Time-based expiration

---

## 🟢 Low - User Experience Debt

### 1. No Undo/Redo
**Current State**: Permanent operations only  
**Impact**: User mistakes are costly  
**Effort**: High  
**Solution**: 
- Implement command pattern
- Add undo stack
- Keyboard shortcuts (Ctrl+Z)

### 2. Limited Keyboard Navigation
**Current State**: Basic arrow keys only  
**Impact**: Power users want more  
**Effort**: Medium  
**Solution**: 
- Add vim-like navigation
- Quick task creation (n key)
- Search shortcut (/)

### 3. No Bulk Operations
**Current State**: One task at a time  
**Impact**: Tedious for many tasks  
**Effort**: Medium  
**Solution**: 
- Multi-select with checkboxes
- Bulk delete/complete/move
- Select all functionality

---

## 🟢 Low - Documentation Debt

### 1. Incomplete JSDoc Comments
**Location**: Various files  
**Current State**: Inconsistent documentation  
**Impact**: Harder to understand code  
**Effort**: Low  
**Solution**: 
- Add JSDoc to all public methods
- Document complex algorithms
- Add examples

### 2. No Architecture Diagrams
**Current State**: Text descriptions only  
**Impact**: Hard to visualize system  
**Effort**: Low  
**Solution**: 
- Create flow diagrams
- Component interaction diagrams
- State management diagram

---

## Debt Metrics

### By Priority
- Critical: 2 items
- High: 2 items  
- Medium: 4 items
- Low: 11 items

### By Category
- Security: 2 items
- Configuration: 2 items
- Architecture: 4 items
- Code Quality: 4 items
- Performance: 3 items
- UX: 3 items
- Documentation: 2 items

### Estimated Total Effort
- Low effort items: 8
- Medium effort items: 8
- High effort items: 3

---

## Recommended Fix Order (Architectural Impact Considered)

This section organizes fixes by architectural impact and dependencies to minimize cascading effects and maintain system stability.

### 🏃 Phase 1: Zero-Risk Configuration (No cascading effects)
**Do these first - they're isolated and safe**

1. **Move hardcoded values to config.js** (High/Low effort)
   - No behavior changes, just organization
   - Makes future changes easier
   - Test: Verify all features still work

2. **Remove commented out code** (Medium/Low effort)
   - Cleans up confusion
   - No functional impact
   - Test: Run validation

3. **Add JSDoc comments** (Low/Low effort)
   - Documentation only
   - Helps understanding
   - No runtime impact

4. **Environment configuration** (High/Low effort)
   - Better deployment experience
   - No functional changes
   - Test: Deploy to both environments

### 🔧 Phase 2: Isolated Improvements (Single component impact)

5. **Event system constants completion** (Medium/Low effort)
   - Already partially done
   - Prevents typo bugs
   - Dependency: None
   - Test: All event flows still work

6. **Calendar view surgical updates** (Low/Low effort)
   - Performance improvement
   - Isolated to CalendarView component
   - Dependency: None
   - Test: Calendar interactions

7. **Fix inconsistent async patterns** (Low/Low effort)
   - Code quality improvement
   - File-by-file updates safe
   - Dependency: None
   - Test: Error handling still works

### 🏗️ Phase 3: Controlled Architecture Changes (Limited cascading)

8. **Add cache size limits** (Low/Low effort)
   - Prevents memory issues
   - Dependency: Understand current cache usage
   - Risk: Might need cache warming strategy
   - Test: Performance with cache eviction

9. **Create LocalStorageService** (Medium/Medium effort)
   - **⚠️ Careful**: Touches multiple components
   - Dependency: Audit all localStorage usage first
   - Migration strategy: Gradual, with fallbacks
   - Test: Settings persistence, offline mode

10. **Standardize error handling** (Medium/Medium effort)
    - **⚠️ Careful**: Could mask existing error patterns
    - Start with new code only
    - Gradual migration of existing code
    - Test: Error scenarios still surface properly

### 🎯 Phase 4: Complex But Valuable (Higher risk, higher reward)

11. **Automatic task deduplication** (Low/Medium effort)
    - User value: Less manual cleanup
    - Dependency: Good duplicate detection logic
    - Risk: Might delete wanted "duplicates"
    - Test: Edge cases thoroughly

12. **Split large manager classes** (Low/Medium effort)
    - **⚠️ Careful**: Many touch points
    - Do one manager at a time
    - Keep interfaces stable
    - Test: All workflows per manager

### 🤔 Phase 5: Consider Carefully (May not align with simplicity)

13. **Firebase security rules** (Critical/Medium effort)
    - **Only if**: Moving beyond personal use
    - Requires auth system decision
    - Major architectural change

14. **Add tests** (Low/High effort)
    - Focus on critical paths only
    - Don't aim for 100% coverage
    - Integration tests over unit tests

15. **Virtual scrolling** (Low/High effort)
    - Only if users report performance issues
    - Adds significant complexity
    - Current solution handles 10,000+ tasks

### ❌ Not Worth Fixing (Violates simplicity principle)

- **TypeScript migration**: Adds build process complexity
- **Full authentication system**: Over-engineered for single user
- **Undo/redo**: Complex state management for rare use
- **Comprehensive test suite**: Maintenance burden exceeds benefit

### Implementation Strategy

For each fix:
1. **Review** architectural impact using CLAUDE.md guidelines
2. **Plan** changes to avoid cascading effects
3. **Implement** in small, testable chunks
4. **Test** both the change and its side effects
5. **Document** any new patterns introduced

### Risk Mitigation

- Always have a rollback plan
- Test in development environment first
- Make changes behind feature flags when possible
- Monitor error rates after deployment
- Keep fixes small and focused

---

**Remember**: Not all technical debt needs to be fixed. Some debt is acceptable if it keeps the codebase simple and doesn't impact users. Always weigh the cost of fixing against the benefit gained.