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

# Serve the files locally (Python 3)
python3 -m http.server 8000

# Or using Node.js
npx http-server -p 8000

# Visit http://localhost:8000
```

### 2. Configure OpenRouter API

1. Get an API key from [OpenRouter](https://openrouter.ai/)
2. Open the app and click the Settings (⚙️) button
3. Enter your OpenRouter API key
4. Choose your refresh interval
5. Save settings

### 3. Set Up Firebase (Optional for Sync)

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Set up security rules (for single-user, simple setup):

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

4. Get your Firebase config from Project Settings
5. Update `js/config.js` with your Firebase configuration:

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
2. **AI Scheduling**: Sends relevant tasks to OpenRouter's Claude API for intelligent scheduling
3. **Dynamic Updates**: Shows only upcoming tasks, refreshes as time passes
4. **Offline Support**: Caches schedules locally, works without internet
5. **Cross-Device Sync**: Syncs data via Firestore when online

## File Structure

```
secretary_ai/
├── index.html          # Main app interface
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline support
├── tasks.md           # Your task file (existing)
├── css/
│   └── style.css      # App styling
└── js/
    ├── app.js         # Main application controller
    ├── config.js      # Configuration settings
    ├── task-parser.js # Parse tasks.md into structured data
    ├── llm-service.js # OpenRouter API integration
    ├── firestore.js   # Firebase/Firestore service
    └── storage.js     # Local/cloud storage coordination
```

## Configuration Options

Edit `js/config.js` to customize:

- **Firebase**: Add your Firebase project configuration
- **OpenRouter Model**: Change the AI model (default: Claude 3.5 Sonnet)
- **Refresh Interval**: How often to regenerate schedules
- **UI Settings**: Animation timing, colors, etc.

## Development Mode

The app automatically detects development mode and:
- Shows debug logs in console
- Uses mock data if APIs aren't configured
- Provides helpful error messages

## Troubleshooting

### Common Issues

1. **"Failed to load tasks.md"**
   - Ensure tasks.md is in the root directory
   - Check file permissions
   - Serve files via HTTP (not file://)

2. **"OpenRouter API error"**
   - Verify API key is correct
   - Check your OpenRouter credits
   - Try a different model

3. **Firestore connection failed**
   - Verify Firebase configuration
   - Check security rules
   - Ensure internet connection

### Debug Mode

Open browser dev tools and check console for detailed logs. Development mode shows verbose information about:
- Task parsing results
- API requests/responses
- Storage operations
- Service worker events

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