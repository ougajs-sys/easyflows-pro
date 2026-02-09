# Firebase Service Worker Configuration

The Firebase service worker (`public/firebase-messaging-sw.js`) needs to be configured with your Firebase project credentials. Since service workers run independently of your app, they cannot access environment variables at runtime.

## Option 1: Manual Configuration (Quick Setup)

Replace the placeholder values in `/public/firebase-messaging-sw.js`:

```javascript
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",                    // From Firebase Console
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});
```

Get these values from:
1. Firebase Console → Project Settings → General
2. Under "Your apps" → Web app configuration

## Option 2: Build-Time Injection (Automated)

Create a build script that replaces placeholders with environment variables:

1. Add placeholders to `public/firebase-messaging-sw.js`:

```javascript
firebase.initializeApp({
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
});
```

2. Create `scripts/inject-firebase-config.js`:

```javascript
import fs from 'fs';
import path from 'path';

const serviceWorkerPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
let content = fs.readFileSync(serviceWorkerPath, 'utf8');

const replacements = {
  '__FIREBASE_API_KEY__': process.env.VITE_FIREBASE_API_KEY,
  '__FIREBASE_AUTH_DOMAIN__': process.env.VITE_FIREBASE_AUTH_DOMAIN,
  '__FIREBASE_PROJECT_ID__': process.env.VITE_FIREBASE_PROJECT_ID,
  '__FIREBASE_STORAGE_BUCKET__': process.env.VITE_FIREBASE_STORAGE_BUCKET,
  '__FIREBASE_MESSAGING_SENDER_ID__': process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  '__FIREBASE_APP_ID__': process.env.VITE_FIREBASE_APP_ID,
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.replace(new RegExp(key, 'g'), value || '');
}

fs.writeFileSync(serviceWorkerPath, content);
console.log('✓ Firebase service worker configured');
```

3. Update `package.json`:

```json
{
  "scripts": {
    "prebuild": "node scripts/inject-firebase-config.js",
    "build": "vite build"
  }
}
```

## Database Configuration for Triggers

The database triggers need to know the Supabase URL to call the Edge Function. Set this in your database:

```sql
-- Run this in Supabase SQL Editor
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://your-project-ref.supabase.co';
```

Replace `your-project-ref` with your actual Supabase project reference.

To verify the setting:

```sql
SELECT current_setting('app.settings.supabase_url', true);
```

## Security Notes

- The Firebase config in the service worker is public (client-side)
- These are not secret keys - they identify your Firebase project
- Security is enforced by Firebase Security Rules, not by hiding these values
- The Firebase service account JSON (used server-side) must remain secret

## Troubleshooting

### Service Worker Not Updating

Clear service worker cache:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => 
  regs.forEach(reg => reg.unregister())
);
// Then refresh the page
```

### "Firebase not initialized" Error

Check that:
1. Service worker file exists at `/public/firebase-messaging-sw.js`
2. Firebase config values are correct
3. Service worker is properly registered (check DevTools → Application → Service Workers)

### Database Trigger Not Calling Edge Function

Check:
1. Database setting: `SELECT current_setting('app.settings.supabase_url', true);`
2. pg_net extension enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
3. Edge Function logs for any errors
