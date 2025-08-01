# Quick Manual Setup for GitHub Pages

## Step 1: Find Your Firebase Config Values

Your Firebase configuration is already set up in this app. You need to find the actual values for these environment variables:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN  
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

**Where to find them:**
1. Go to Firebase Console (console.firebase.google.com)
2. Select your MacLap project
3. Click the gear icon (⚙️) → Project settings
4. Scroll down to "Your apps" section
5. Click the "</>" (web app) icon
6. Copy the config values from the `firebaseConfig` object

## Step 2: Two Required Manual Changes

### 2.1 Update package.json
Add this line to the "scripts" section in your `package.json`:
```json
"build:github": "vite build",
```

Add it right after the existing `"build": "vite build && esbuild..."` line.

### 2.2 GitHub Repository Setup
1. Create GitHub account at github.com
2. Create new public repository named "maclap-app"
3. Upload all your project files to GitHub

## Step 3: GitHub Pages Configuration

### 3.1 Enable GitHub Pages
- Repository Settings → Pages → Source: "GitHub Actions"

### 3.2 Add Secrets
Repository Settings → Secrets and variables → Actions → New repository secret

Add each Firebase config value as a secret:
- Secret name: `VITE_FIREBASE_API_KEY`
- Secret value: Your actual API key from Firebase

Repeat for all 6 Firebase variables.

## Step 4: Deploy

Once you push your code with the updated package.json, GitHub will automatically:
1. Build your app
2. Deploy to GitHub Pages
3. Give you a free URL: `https://yourusername.github.io/maclap-app/`

## Expected Result

Your app will work exactly like it does on Replit:
- All transactions, notes, dashboard features
- Fingerprint authentication
- Offline functionality  
- Real-time Firebase sync
- Mobile PWA features

**Total time: 15-20 minutes for complete free hosting setup**