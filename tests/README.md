# Test Suite

Testing tools and validation for Secretary AI functionality.

## Test Files

### test-api.html
**Purpose**: OpenRouter API integration testing
- Environment detection and path resolution
- API key validation and authentication
- Model connectivity and fallback chains
- Error handling and rate limiting
- Network failure simulation

**Usage**: 
1. Start server: `npm run start`
2. Open `localhost:8000/tests/test-api.html`
3. Enter OpenRouter API key (optional for environment tests)
4. Run individual tests or full suite

### test-calendar.html
**Purpose**: Calendar component testing
- Month view rendering and navigation
- Date selection and highlighting
- Schedule indicator display
- Mobile responsiveness
- Touch gesture support

**Usage**:
1. Start server: `npm run start`
2. Open `localhost:8000/tests/test-calendar.html`
3. Test calendar interactions and visual indicators

### test-dom-diff.html
**Purpose**: DOM diffing utility testing
- Element caching and reuse
- Differential updates performance
- Memory management
- Event listener preservation
- Batch operation efficiency

**Usage**:
1. Start server: `npm run start`
2. Open `localhost:8000/tests/test-dom-diff.html`
3. Run performance benchmarks and verify DOM updates

### test-lazy-loading.html
**Purpose**: Module lazy loading testing
- Dynamic import functionality
- Loading state indicators
- Module caching behavior
- Error handling for failed loads
- Performance impact measurement

**Usage**:
1. Start server: `npm run start`
2. Open `localhost:8000/tests/test-lazy-loading.html`
3. Test module loading sequences and timing

## Quick Start

```bash
# Setup
npm install
npm run validate

# Start server
npm run start

# Access tests
# http://localhost:8000/tests/test-api.html
```

## Test Coverage

| Component | API Tests | Integration Tests |
|-----------|-----------|-------------------|
| API Integration | ✅ | ✅ |
| Task Management | ✅ | ✅ |
| Data Services | ✅ | ✅ |
| Calendar View | ✅ | ✅ |
| Insights Modal | ✅ | ✅ |
| Date Navigation | ✅ | ✅ |
| Error Handling | ✅ | ✅ |

## Development Workflow

### Pre-Development
1. Run `npm run validate` - Check syntax
2. Test `test-api.html` - Verify API setup
3. Test main app for full functionality

### During Development
1. Use main app with task management view for testing
2. Test calendar by clicking 📅 button
3. Test insights by clicking 📊 button  
4. Test error handling by going offline/invalid API key
5. Use `test-api.html` for API debugging
6. Use `test-calendar.html` for calendar component testing
7. Check browser console for debugging

### Pre-Commit
1. Run `npm run test` - PWA functionality
2. Test `test-api.html` manually
3. Test calendar view shows correctly
4. Test insights modal loads data
5. Test date navigation works both ways
6. Verify no console errors in main app

## Troubleshooting

### Tests Won't Load
- Ensure server is running (`npm run start`)
- Use HTTP URLs, not `file://`
- Check browser console for errors
- Try different browser

### API Tests Failing
- Verify OpenRouter API key is valid
- Check internet connectivity
- Verify API credits remain
- Try fallback models


## Performance Benchmarks

- Page load: < 2 seconds
- Component render: < 100ms
- Calendar render: < 100ms
- Insights analysis: < 200ms
- API response: < 5 seconds (30s timeout)
- Search performance: < 50ms
- Date navigation: < 500ms

## Contributing

1. Identify testing gaps
2. Review [Architectural Considerations](../CLAUDE.md#-architectural-considerations) before creating tests
3. Create new test files following naming patterns
4. Ensure tests don't cascade side effects through the system
5. Document tests clearly
6. Update this README
7. Ensure cross-browser compatibility

For issues: [GitHub Issues](../../issues)