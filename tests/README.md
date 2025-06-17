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

## Development Workflow

### Pre-Development
1. Run `npm run validate` - Check syntax
2. Test `test-api.html` - Verify API setup
3. Test main app for full functionality

### During Development
1. Use main app with task management view for testing
2. Use `test-api.html` for API debugging
3. Check browser console for debugging

### Pre-Commit
1. Run `npm run test` - PWA functionality
2. Test `test-api.html` manually
3. Verify no console errors in main app

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
- API response: < 5 seconds  
- Search performance: < 50ms

## Contributing

1. Identify testing gaps
2. Create new test files following naming patterns
3. Document tests clearly
4. Update this README
5. Ensure cross-browser compatibility

For issues: [GitHub Issues](../../issues)