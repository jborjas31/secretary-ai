# Secretary AI

An AI-powered Progressive Web App that transforms your task list into intelligent daily schedules.

## Overview

Secretary AI reads your `tasks.md` file and generates smart, time-aware schedules using advanced AI models. It features offline-first design, cross-device sync, and a complete task management interface.

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

3. **Start using**
   - Create or update your `tasks.md` file
   - AI generates your personalized daily schedule
   - Switch to Task Management mode for full editing capabilities

## Features

- **AI-Powered Scheduling**: Uses Claude 3.5 Sonnet to create intelligent schedules
- **Progressive Web App**: Install on any device, works offline
- **Task Management**: Full CRUD operations with natural language date parsing
- **Cross-Device Sync**: Firestore integration for synchronized data
- **Real-Time Updates**: Dynamic schedule updates as you complete tasks

## Architecture

```
secretary_ai/
├── index.html              # Main application
├── tasks.md               # Your task data
├── manifest.json          # PWA configuration
├── sw.js                  # Service worker
├── css/                   # Styling
├── js/                    # Application logic
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

## Common Issues

- **"Failed to load tasks.md"**: Ensure file exists and serve via HTTP
- **"OpenRouter API Error"**: Validate API key and check rate limits
- **"Firestore Connection Failed"**: Verify Firebase configuration

## License

MIT License - See full license text in the original file.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear description

For detailed technical documentation, see [CLAUDE.md](CLAUDE.md).