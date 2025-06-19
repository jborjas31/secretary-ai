# Secretary AI

An AI-powered Progressive Web App that transforms your task list into intelligent daily schedules.

## Overview

Secretary AI reads your `tasks.md` file and generates smart, time-aware schedules using advanced AI models. It features offline-first design, cross-device sync, a complete task management interface, calendar navigation, and productivity insights.

## Quick Start

1. **Clone and start**
   ```bash
   git clone <repository-url>
   cd secretary_ai
   npm run start
   ```

2. **Configure AI**
   - Get your [OpenRouter API key](https://openrouter.ai/)
   - Click Settings in the app and enter your API key
   - Default model is DeepSeek R1 (or use the free tier!)

3. **Start using**
   - Create or update your `tasks.md` file
   - AI generates your personalized daily schedule
   - Switch to Task Management mode for full editing capabilities

## Features

- **AI-Powered Scheduling**: Uses DeepSeek R1 (with free option!) to create intelligent schedules
- **Progressive Web App**: Install on any device, works offline
- **Task Management**: Full CRUD operations with natural language date parsing
- **Date Navigation**: View and plan schedules for any date
- **Calendar View**: Visual month overview with schedule indicators
- **Productivity Insights**: Track patterns and completion rates
- **Cross-Device Sync**: Firestore integration for synchronized data
- **Real-Time Updates**: Dynamic schedule updates as you complete tasks
- **Smart Error Handling**: Clear offline messages, automatic retries, and fallback scheduling

## Architecture

```
secretary_ai/
├── index.html              # Main application
├── tasks.md               # Your task data
├── manifest.json          # PWA configuration
├── sw.js                  # Service worker
├── css/                   # Styling
│   ├── style.css          # Core styles
│   ├── task-management.css # Task UI styles
│   ├── calendar.css       # Calendar view
│   └── insights.css       # Insights modal
├── js/                    # Application logic
│   ├── app.js             # Main controller
│   ├── llm-service.js     # AI integration
│   ├── task-parser.js     # Task processing
│   ├── calendar-view.js   # Calendar component
│   ├── insights-modal.js  # Analytics UI
│   └── [11 more modules]  # Services & utilities
└── tests/                 # Testing tools
```

## Development Commands

```bash
npm run start      # Start Python development server
npm run serve      # Start Node.js server (no cache)
npm run test       # Test PWA functionality
npm run validate   # Validate JavaScript syntax
```

## Configuration

### Firebase Setup (Optional)
Update `js/config.js` with your Firebase configuration for cloud sync:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    // ... other config
};
```

### GitHub Pages Deployment
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. Access at `https://username.github.io/repository-name/`

## Recent Updates

- **Calendar Navigation**: Click 📅 to view month calendar and jump to any date
- **Productivity Insights**: Click 📊 to see completion patterns and analytics  
- **Better Error Messages**: Clear feedback for offline mode, API issues, and timeouts
- **Task Deduplication**: Automatic prevention and manual cleanup of duplicate tasks
- **Multi-Model Support**: DeepSeek R1 default with automatic fallbacks
- **Performance Monitoring**: Built-in performance tracking for all operations

## Common Issues

- **"Failed to load tasks.md"**: Ensure file exists and serve via HTTP
- **"Invalid API key"**: Check your OpenRouter API key in Settings
- **"API credits exhausted"**: Add credits or switch to free model
- **"You're offline"**: Connect to internet for new schedules (cached schedules still work)
- **"Request timed out"**: Try again, the AI service may be busy

## License

MIT License - See full license text in the original file.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear description

For detailed technical documentation, see [CLAUDE.md](CLAUDE.md).