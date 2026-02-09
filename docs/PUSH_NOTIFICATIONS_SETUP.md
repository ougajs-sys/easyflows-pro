# Push Notifications Setup Guide

This guide explains how to configure Firebase Cloud Messaging (FCM) for push notifications in EasyFlows Pro.

## Prerequisites

1. A Firebase project
2. Supabase project with Edge Functions enabled
3. Node.js and npm installed

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Register Your Web App

1. In Firebase Console, click the gear icon and select "Project settings"
2. Under "Your apps", click the web icon (</>) to register a web app
3. Register your app with a nickname (e.g., "EasyFlows Pro")
4. Copy the Firebase configuration values

### 3. Generate VAPID Key

1. In Firebase Console, go to "Project settings" > "Cloud Messaging" tab
2. Under "Web Push certificates", click "Generate key pair"
3. Copy the generated key pair (VAPID key)

### 4. Get Service Account JSON

1. In Firebase Console, go to "Project settings" > "Service accounts" tab
2. Click "Generate new private key"
3. Save the JSON file securely (you'll need its contents for Supabase)

## Environment Variables Setup

### Frontend (.env)

Add the following to your `.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

### Service Worker Configuration

Update `/public/firebase-messaging-sw.js` with your Firebase configuration:

```javascript
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});
```

**Note:** The service worker configuration must be hardcoded as it runs independently of your app. You can automate this during build if needed.

### Supabase Edge Function Secrets

Set these secrets in your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

supabase secrets set FCM_PROJECT_ID='your_firebase_project_id'
```

Or via Supabase Dashboard:
1. Go to Edge Functions > Settings
2. Add the secrets:
   - `FCM_SERVICE_ACCOUNT_JSON`: Paste the entire service account JSON as a string
   - `FCM_PROJECT_ID`: Your Firebase project ID

### Database Configuration

Set the Supabase URL in your database for triggers:

```sql
-- Set the Supabase URL for HTTP requests in triggers
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://your-project-ref.supabase.co';
```

Or update it in each database function that uses `current_setting('app.settings.supabase_url', true)`.

## Database Migrations

Run the migrations to create the necessary tables and triggers:

```bash
# If using Supabase CLI
supabase db push

# Or apply manually via Supabase Dashboard > SQL Editor
```

Migrations included:
1. `20260209000000_push_notifications_tables.sql` - Creates tables for tokens and logs
2. `20260209000001_push_notifications_triggers.sql` - Creates triggers for push notifications

## Testing Push Notifications

### 1. Enable Notifications in Browser

1. Log in to the app
2. Go to Profile page
3. Toggle "Activer les notifications push"
4. Grant permission when browser prompts

### 2. Test Scenarios

**New Order:**
- Create a new order as a caller
- Admin and supervisor should receive push notification

**Order Assignment:**
- Assign an order to a caller (update `assigned_to`)
- Caller should receive push notification

**Delivery Assignment:**
- Assign an order to a delivery person (update `delivery_person_id`)
- Delivery person should receive push notification

**Chat Message:**
- Send a 1-to-1 message to another user
- Receiver should receive push notification

### 3. Check Logs

Monitor push logs in Supabase:

```sql
SELECT * FROM push_log ORDER BY sent_at DESC LIMIT 10;
```

Check Edge Function logs in Supabase Dashboard:
- Go to Edge Functions > `send-push-notification` > Logs

## Troubleshooting

### Notifications Not Received

1. **Check browser permission:**
   - Ensure notifications are allowed in browser settings
   - Check the toggle in Profile shows enabled

2. **Check token registration:**
   ```sql
   SELECT * FROM user_push_tokens WHERE user_id = 'your-user-id';
   ```

3. **Check Edge Function logs:**
   - Look for errors in Supabase Edge Function logs
   - Verify FCM credentials are set correctly

4. **Check database triggers:**
   ```sql
   -- Verify triggers exist
   SELECT * FROM pg_trigger WHERE tgname LIKE 'trigger_notify_%';
   ```

5. **Test Edge Function directly:**
   ```bash
   curl -X POST https://your-project-ref.supabase.co/functions/v1/send-push-notification \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "user-uuid",
       "title": "Test",
       "body": "Test notification",
       "data": {"type": "test"}
     }'
   ```

### Service Worker Issues

1. **Check if registered:**
   - Open DevTools > Application > Service Workers
   - Verify `firebase-messaging-sw.js` is registered

2. **Clear and re-register:**
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(regs => 
     regs.forEach(reg => reg.unregister())
   );
   // Then refresh page
   ```

### Firebase Configuration Issues

1. **Verify API key:** Check Firebase Console > Project Settings
2. **Check VAPID key:** Ensure it matches the key in Firebase Console
3. **Validate Service Account:** Ensure JSON is complete and valid

## Security Notes

- **Never commit real credentials** to version control
- Service account JSON contains private keys - keep it secure
- VAPID key is public but should still be in environment variables
- All push tokens are encrypted in transit
- User can disable push notifications at any time

## Production Deployment

### Netlify/Vercel

Add all `VITE_` environment variables in your deployment platform:
1. Go to Site Settings > Environment Variables
2. Add all Firebase and Supabase variables
3. Redeploy

### Update Service Worker

Since service worker needs hardcoded config, consider:
1. Build-time injection using environment variables
2. Or create a configuration endpoint that serves the config

### Enable pg_net in Production

Ensure `pg_net` extension is enabled in production Supabase:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
