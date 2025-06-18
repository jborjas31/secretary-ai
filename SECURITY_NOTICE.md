# 🔒 IMPORTANT SECURITY NOTICE

## Critical Security Update (June 2025)

A security vulnerability was discovered and fixed in Secretary AI that could have exposed your OpenRouter API keys.

### What Happened

Previous versions of the app stored your OpenRouter API key in Firestore along with other settings. If your Firestore database had open security rules (the default for testing), this meant **anyone on the internet could read your API key**.

### What We Fixed

As of commit `d14fd08`, the app now:
- **Never** saves API keys to Firestore
- Stores API keys **only** in browser localStorage (device-specific)
- Automatically cleans up any existing API keys from Firestore
- Includes proper security warnings in documentation

### Action Required

1. **Check your OpenRouter account** at https://openrouter.ai/keys
   - If your key was deleted/revoked, it was likely compromised
   - Generate a new API key

2. **Secure your Firestore database**
   - Go to Firebase Console → Firestore → Rules
   - Replace the open rules with proper security rules (see CLAUDE.md)

3. **Update each device**
   - Pull the latest code
   - Clear browser data for the app
   - Re-enter your new API key on each device

### Prevention

- Each device now maintains its own API key (not synced)
- The app will never store sensitive data in Firestore
- Always use proper Firestore security rules in production

### Questions?

If you suspect your API key was compromised:
1. Revoke it immediately at OpenRouter
2. Check your usage/billing for unauthorized activity
3. Generate a new key after securing your setup

---

Thank you for using Secretary AI responsibly.