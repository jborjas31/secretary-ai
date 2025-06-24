# Documentation

Technical documentation, API references, and development resources for Secretary AI.

## Core Documentation

### Architecture & Development
- **[CLAUDE.md](../CLAUDE.md)** - Complete technical overview, roadmap, and implementation details
- **[TECHNICAL_DEBT.md](../TECHNICAL_DEBT.md)** - Comprehensive technical debt tracking and priorities
- **[optimizations/](optimizations/)** - Performance optimization documentation
  - [optimization-plan.md](optimizations/optimization-plan.md) - Complete optimization roadmap (All 5 critical issues resolved! ✅)
  - **Completed Optimizations:**
    - [dom-optimization.md](optimizations/completed/dom-optimization.md) - DOM manipulation improvements
    - [js-loading-optimization.md](optimizations/completed/js-loading-optimization.md) - JavaScript loading optimizations
    - [event-listener-fix-enhanced.md](optimizations/completed/event-listener-fix-enhanced.md) - Memory leak prevention
    - [task-filtering-optimization.md](optimizations/completed/task-filtering-optimization.md) - O(1) indexed task filtering

### API Integration
- **[openrouter/](openrouter/)** - Complete OpenRouter API documentation
  - [overview.md](openrouter/overview.md) - API introduction and capabilities
  - [quickstart.md](openrouter/quickstart.md) - Getting started guide
  - [models.md](openrouter/models.md) - Available AI models and pricing
  - [authentication.md](openrouter/authentication.md) - API key management
  - [parameters.md](openrouter/parameters.md) - Request configuration options
  - [tool_calling.md](openrouter/tool_calling.md) - Function calling and structured outputs
  - [streaming.md](openrouter/streaming.md) - Real-time response handling
  - [errors.md](openrouter/errors.md) - Error codes and troubleshooting
  - [limits.md](openrouter/limits.md) - Rate limiting and quotas
  - [privacy_logging.md](openrouter/privacy_logging.md) - Data handling policies

### Research & Analysis
- **[model_performance/](model_performance/)** - AI model performance research and benchmarks

## Quick Reference

| Need | Documentation |
|------|---------------|
| Project setup | [Main README](../README.md) |
| Architecture overview | [CLAUDE.md](../CLAUDE.md) |
| Technical debt | [TECHNICAL_DEBT.md](../TECHNICAL_DEBT.md) |
| API integration | [openrouter/quickstart.md](openrouter/quickstart.md) |
| Testing | [Test suite](../tests/) |
| Development | [CLAUDE.md](../CLAUDE.md#development-guide) |
| Model selection | [openrouter/models.md](openrouter/models.md) |
| Error handling | [openrouter/errors.md](openrouter/errors.md) |

## Getting Started

### For Developers
1. Read [CLAUDE.md](../CLAUDE.md) for architecture understanding
2. Check [openrouter/quickstart.md](openrouter/quickstart.md) for API setup
3. Run [test suite](../tests/) to validate environment
4. Review [Development Guide](../CLAUDE.md#development-guide) for development guidelines

### For API Integration
1. Get OpenRouter API key from [openrouter.ai](https://openrouter.ai/)
2. Follow [authentication guide](openrouter/authentication.md)
3. Choose models using [models reference](openrouter/models.md)
4. Implement using [tool calling examples](openrouter/tool_calling.md)

## Contributing

1. Fork repository
2. Update relevant documentation
3. Test any code examples
4. Submit pull request

For issues or suggestions: [GitHub Issues](../../issues)