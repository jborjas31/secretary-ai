# Secretary AI - Dynamic Daily Task Scheduler

A Progressive Web App that reads your tasks.md file and generates intelligent, chronological daily schedules using AI.

## Features

- **AI-Powered Scheduling**: Uses OpenRouter API to create intelligent daily schedules
- **Offline-First**: Works without internet, syncs when online
- **Cross-Device Sync**: Firestore integration for accessing your schedule anywhere
- **Real-Time Updates**: Schedule updates throughout the day
- **PWA**: Install on mobile/desktop, works like a native app
- **Task Management**: Reads from your existing tasks.md file

## Quick Start

### 1. Local Development

```bash
# Clone or download the repository
cd secretary_ai

# Install dependencies (optional, for http-server)
npm install

# Start development server (Python 3)
npm run start
# or
npm run dev

# Alternative: Node.js server with no cache
npm run serve

# Manual server options:
# Python 3
python3 -m http.server 8000

# Node.js
npx http-server -p 8000

# Visit http://localhost:8000
```

### 2. Configure OpenRouter API

1. Get an API key from [OpenRouter](https://openrouter.ai/)
2. Open the app and click the Settings (⚙️) button
3. Enter your OpenRouter API key
4. Choose your refresh interval
5. Save settings

### 3. Firebase Sync (Pre-configured)

**Firebase is already configured** for cross-device sync. The app uses a single-user setup with open security rules.

**To use your own Firebase project:**

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database with these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/(default)/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Get your Firebase config from Project Settings
4. Update `js/config.js` with your Firebase configuration:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 4. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push your code:

```bash
git init
git add .
git commit -m "Initial commit - Secretary AI PWA"
git branch -M main
git remote add origin https://github.com/yourusername/secretary-ai.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

4. Your app will be available at: `https://yourusername.github.io/secretary-ai/`

## How It Works

1. **Task Parsing**: Reads your `tasks.md` file and converts it to structured data
2. **AI Scheduling**: Uses OpenRouter API with model fallback system:
   - Primary: `anthropic/claude-3.5-sonnet` (best reasoning)
   - Fallback: `openai/gpt-4o-mini` (cost-effective)
   - Free tier: `meta-llama/llama-3.1-8b-instruct:free`
3. **Dynamic Updates**: Shows only upcoming tasks, refreshes as time passes
4. **Offline Support**: Service worker caches schedules locally, works without internet
5. **Cross-Device Sync**: Syncs data via Firestore when online

## File Structure

```
secretary_ai/
├── index.html          # Main app interface
├── test-api.html       # OpenRouter API testing and debugging tool
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline support
├── tasks.md           # Your task file (existing)
├── package.json       # npm scripts and dependencies
├── _config.yml        # GitHub Pages Jekyll configuration
├── CLAUDE.md          # Development instructions for Claude Code
├── css/
│   └── style.css      # App styling
├── js/
│   ├── app.js         # Main application controller
│   ├── config.js      # Configuration settings
│   ├── task-parser.js # Parse tasks.md into structured data
│   ├── llm-service.js # OpenRouter API integration with fallbacks
│   ├── firestore.js   # Firebase/Firestore service
│   └── storage.js     # Local/cloud storage coordination
└── openrouter/        # Comprehensive OpenRouter API documentation
    ├── overview.md
    ├── quickstart.md
    ├── models.md
    └── [12+ documentation files]
```

## Configuration Options

Edit `js/config.js` to customize:

- **Firebase**: Already configured, or add your own project configuration
- **OpenRouter Models**: Primary model (`anthropic/claude-3.5-sonnet`) and fallback chain
- **Refresh Interval**: How often to regenerate schedules (default: 30 minutes)
- **UI Settings**: Animation timing, colors, toast duration
- **Environment Detection**: Automatic localhost vs GitHub Pages path resolution
- **Debug Settings**: Logging levels, mock data, Firestore enablement

## Development Tools

### npm Scripts
```bash
npm run start      # Start Python development server
npm run dev        # Alias for start
npm run serve      # Start Node.js server with no cache
npm run test       # Test PWA functionality and validate JS
npm run validate   # Validate all JavaScript syntax
npm run deploy     # Show deployment instructions
```

### API Testing
Use `test-api.html` for comprehensive API testing:
- Environment detection and path resolution
- OpenRouter API key validation
- Simple model calls and schedule generation
- Debug information and error details

### Development Mode
The app automatically detects development mode and:
- Shows verbose debug logs in console
- Enables all features including Firestore
- Provides detailed environment information
- Uses sophisticated GitHub Pages path detection

## Troubleshooting

### Common Issues

1. **"Failed to load tasks.md"**
   - Ensure tasks.md is in the root directory
   - Check file permissions
   - Serve files via HTTP (not file://)
   - Use `test-api.html` to check environment and path resolution

2. **"OpenRouter API error"**
   - Use `test-api.html` to validate your API key
   - Check your OpenRouter credits and usage
   - App automatically tries fallback models (GPT-4o Mini → Free Llama)
   - Check console for detailed error messages and retry attempts

3. **Firestore connection failed**
   - Verify Firebase configuration
   - Check security rules
   - Ensure internet connection

### Debug Mode

Open browser dev tools and check console for detailed logs. Development mode shows verbose information about:
- Task parsing results and structured data
- API requests/responses with model fallback attempts
- Storage operations (local IndexedDB + Firestore sync)
- Service worker caching and offline events
- Environment detection and path resolution
- Firebase configuration and connection status

**Use test-api.html** for interactive API testing and environment debugging.

## Security Notes

- API keys are stored locally in browser storage
- Firebase rules are open for single-user setup
- For production use, consider implementing authentication
- Never commit API keys to version control

## Future Enhancements

The architecture supports easy addition of:
- Task completion tracking
- Past/future schedule viewing
- Task editing within the app
- Push notifications
- Multiple task files
- Team/family sharing

## License

MIT License - feel free to modify and use for your own projects.