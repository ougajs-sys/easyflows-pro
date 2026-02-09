# PWA Push Notifications System - EasyFlows Pro

## Overview

This document describes the PWA push notification system implemented for EasyFlows Pro using Firebase Cloud Messaging (FCM) HTTP v1 API.

## Features

- **Push notifications enabled by default** with opt-out option in user profile
- **Role-based notifications**:
  - New orders → Admins & Supervisors
  - Caller assignment → Assigned caller
  - Delivery person assignment → Assigned delivery person
  - 1-to-1 chat messages → Receiver
- **FCM HTTP v1 API** with Service Account authentication
- **Automatic token management** with invalid token cleanup
- **Comprehensive logging** in `push_log` table

## Architecture

### Frontend Components

1. **Service Worker** (`src/service-worker.ts`)
   - Handles push events from FCM
   - Manages notification display
   - Handles notification clicks

2. **Hooks**
   - `usePushNotifications`: Main hook for managing push notifications
   - `useInitializePushNotifications`: Auto-initializes push on app load

3. **UI Components**
   - `PushNotificationSettings`: Settings UI in user profile

### Backend Components

1. **Database Tables**
   - `user_push_tokens`: Stores FCM tokens per user
   - `push_log`: Logs all push notification attempts

2. **SQL Triggers**
   - `trigger_push_new_order`: New order notifications
   - `trigger_push_assigned_caller`: Caller assignment notifications
   - `trigger_push_assigned_delivery`: Delivery person assignment notifications
   - `trigger_push_new_message`: Chat message notifications

3. **Edge Function**
   - `send-push-notification`: Sends notifications via FCM HTTP v1 API

## Setup Instructions

### 1. Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Cloud Messaging
3. Generate a new service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

4. Get your Web Push certificate (VAPID key):
   - Go to Project Settings → Cloud Messaging
   - Under "Web Push certificates", click "Generate key pair"
   - Copy the key

### 2. Environment Variables

Add these variables to your `.env` file:

```bash
# Firebase Cloud Messaging
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### 3. Supabase Edge Function Secrets

Set these secrets in your Supabase project for the `send-push-notification` function:

```bash
# Using Supabase CLI
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
supabase secrets set FCM_PROJECT_ID='your_project_id'
```

Or via the Supabase Dashboard:
1. Go to Edge Functions
2. Select `send-push-notification`
3. Add secrets:
   - `FCM_SERVICE_ACCOUNT_JSON`: Paste the entire service account JSON
   - `FCM_PROJECT_ID`: Your Firebase project ID

### 4. Database Setup

The migration file `20260209175145_pwa_push_notifications.sql` will:
- Enable `pg_net` extension
- Create `user_push_tokens` and `push_log` tables
- Create SQL triggers for automatic notifications
- Set up RLS policies

Apply the migration:
```bash
supabase db push
```

### 5. Deploy Edge Function

Deploy the `send-push-notification` function:

```bash
supabase functions deploy send-push-notification
```

## Usage

### User Registration for Push Notifications

Push notifications are automatically requested when a user logs in for the first time. Users can also:

1. Go to their Profile page
2. Find the "Notifications Push" card
3. Toggle the switch to enable/disable notifications

### Sending Custom Notifications

You can send custom notifications using the `send_push_notification` SQL function:

```sql
SELECT public.send_push_notification(
  p_user_ids := ARRAY['user-uuid-1', 'user-uuid-2'],
  p_title := 'Notification Title',
  p_body := 'Notification body text',
  p_data := '{"key": "value"}'::jsonb,
  p_type := 'custom'
);
```

### Notification Types

The system supports these notification types:
- `new_order`: New order created
- `assigned_caller`: Order assigned to caller
- `assigned_delivery`: Order assigned to delivery person
- `new_message`: New chat message received
- `custom`: Custom notifications

## Security Considerations

1. **Never commit secrets**: FCM service account credentials must be stored in Supabase secrets, not in code
2. **Token validation**: Invalid tokens are automatically removed from the database
3. **RLS policies**: User push tokens can only be managed by the token owner
4. **HTTPS required**: Push notifications only work over HTTPS

## Troubleshooting

### Notifications not working

1. Check browser console for errors
2. Verify Firebase credentials are correct
3. Check Supabase Edge Function logs
4. Verify push notification permission is granted in browser
5. Check that service worker is registered

### Invalid token errors

Invalid tokens are automatically removed from the database. If a user's token becomes invalid, they will need to re-register by toggling notifications off and on in their profile.

### Testing

To test push notifications:

1. Enable notifications in your profile
2. Open browser developer tools → Application → Service Workers
3. Check that the service worker is running
4. Trigger an event (create order, send message, etc.)
5. Check the notification appears

## Browser Compatibility

Push notifications are supported in:
- Chrome 50+
- Firefox 44+
- Edge 17+
- Safari 16+ (macOS 13+, iOS 16.4+)

## Performance

- Tokens are cached in memory during the session
- Notifications are sent asynchronously via pg_net
- Invalid tokens are cleaned up automatically
- Logs are indexed for fast querying

## Maintenance

### Monitoring

Check the `push_log` table regularly:

```sql
-- Check recent notifications
SELECT * FROM push_log 
ORDER BY created_at DESC 
LIMIT 100;

-- Check failed notifications
SELECT * FROM push_log 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Check notification types distribution
SELECT type, COUNT(*) 
FROM push_log 
GROUP BY type;
```

### Cleanup

Set up a periodic job to clean old logs:

```sql
-- Delete logs older than 30 days
DELETE FROM push_log 
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Future Enhancements

Possible improvements:
- Notification preferences per type
- Quiet hours configuration
- Notification history in UI
- Rich notifications with images
- Action buttons in notifications
- Group notifications support
