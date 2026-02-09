# Push Notifications Implementation Summary

## Overview

This implementation adds comprehensive push notification support to EasyFlows Pro using Firebase Cloud Messaging (FCM) HTTP v1 API and Supabase Edge Functions. The system provides enriched, real-time notifications for orders, assignments, and messages.

## Architecture

```
┌─────────────────┐
│   User Action   │
│ (New Order,     │
│  Assignment,    │
│  Message)       │
└────────┬────────┘
         │
         v
┌─────────────────────────────────┐
│  PostgreSQL Database Trigger    │
│  - notify_new_order()           │
│  - notify_order_assigned_to_    │
│    caller()                     │
│  - notify_order_assigned_to_    │
│    delivery()                   │
│  - notify_chat_message()        │
└────────┬────────────────────────┘
         │ (pg_net HTTP POST)
         v
┌─────────────────────────────────┐
│  Supabase Edge Function         │
│  send-push-notification         │
│  - Get user's FCM tokens        │
│  - Generate OAuth access token  │
│  - Send via FCM HTTP v1 API     │
│  - Log to push_log table        │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  Firebase Cloud Messaging       │
│  - Delivers to user's device(s) │
│  - Handles offline queuing      │
│  - Manages token lifecycle      │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  User's Device                  │
│  - Service Worker receives      │
│    background messages          │
│  - App receives foreground      │
│    messages via onMessage       │
│  - Shows notification UI        │
└─────────────────────────────────┘
```

## Implementation Details

### 1. Database Schema

#### `user_push_tokens` Table
Stores FCM tokens for each user with enable/disable functionality.

```sql
CREATE TABLE public.user_push_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);
```

#### `push_log` Table
Logs all push notification attempts with delivery status.

```sql
CREATE TABLE public.push_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status TEXT DEFAULT 'pending',
  error_message TEXT
);
```

### 2. Database Triggers

Four triggers handle different notification scenarios:

#### New Order Trigger
**Trigger:** `trigger_notify_new_order`
**Target Users:** All admins and supervisors
**Enriched Data:**
- Order number
- Client name
- Product name
- Total amount
- Delivery address

```sql
Title: "🆕 Nouvelle commande"
Body: "Commande {order_number} - {client_name} ({product_name}) - {amount} DH"
```

#### Caller Assignment Trigger
**Trigger:** `trigger_notify_order_assigned_to_caller`
**Target Users:** Caller specified in `assigned_to` column
**Enriched Data:** Same as new order

```sql
Title: "📋 Commande assignée"
Body: "Commande {order_number} - {client_name} ({product_name}) - {amount} DH"
```

#### Delivery Assignment Trigger
**Trigger:** `trigger_notify_order_assigned_to_delivery`
**Target Users:** Delivery person (resolved via `delivery_persons.user_id`)
**Enriched Data:** Same as new order

```sql
Title: "🚚 Nouvelle livraison"
Body: "Commande {order_number} - {client_name} ({product_name}) - {amount} DH à livrer"
```

#### Chat Message Trigger
**Trigger:** `trigger_notify_chat_message`
**Target Users:** Message receiver (via `receiver_id`)
**Only for:** 1-to-1 messages (receiver_id is not null)
**Enriched Data:**
- Sender name
- Message content (truncated to 100 chars)
- Channel info
- Related order_id (if any)

```sql
Title: "💬 Message de {sender_name}"
Body: "{message_content}"
```

### 3. Supabase Edge Function

**Location:** `supabase/functions/send-push-notification/index.ts`

**Features:**
- Firebase Cloud Messaging HTTP v1 API integration
- Service Account OAuth 2.0 authentication
- JWT signing using Web Crypto API
- Multiple token support per user
- Automatic retry and error logging
- Push notification logging to database

**Environment Variables Required:**
- `FCM_SERVICE_ACCOUNT_JSON`: Firebase service account credentials
- `FCM_PROJECT_ID`: Firebase project ID
- `SUPABASE_URL`: Supabase project URL (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (auto-set)

**Security:**
- JWT verification disabled (internal database calls)
- Service account credentials stored as secrets
- No credentials in code

### 4. Frontend Implementation

#### Firebase Configuration (`src/lib/firebase.ts`)
- Firebase app initialization
- Messaging setup with VAPID key
- Permission request handling
- Token retrieval
- Foreground message listening

#### Push Notifications Hook (`src/hooks/usePushNotifications.ts`)
- Request notification permission
- Get and save FCM token
- Enable/disable notifications
- Listen for foreground messages
- Show toast notifications

**Key Functions:**
```typescript
- enablePushNotifications(): Request permission and register token
- disablePushNotifications(): Disable without unregistering
- togglePushNotifications(): Toggle current state
```

#### Service Worker (`public/firebase-messaging-sw.js`)
- Handles background push notifications
- Shows system notifications
- Handles notification clicks
- Routes to appropriate pages based on notification type

#### UI Component (Profile Page)
- Toggle switch for enable/disable
- Permission status display
- Visual feedback for enabled/denied states
- Integrated into existing profile page

### 5. Configuration Requirements

#### Frontend Environment Variables (.env)
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

#### Database Configuration
```sql
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://your-project-ref.supabase.co';
```

#### Supabase Secrets
```bash
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
supabase secrets set FCM_PROJECT_ID='your-firebase-project-id'
```

#### Service Worker Configuration
The service worker must be manually configured with Firebase credentials in `public/firebase-messaging-sw.js` or use the provided injection script.

## Testing Scenarios

### 1. New Order Notification
1. Create a new order as any caller
2. Expected: Admin and supervisor users receive push notification
3. Notification includes: order number, client name, product, amount

### 2. Caller Assignment
1. Update an order's `assigned_to` field to a caller's user_id
2. Expected: Assigned caller receives push notification
3. Notification includes: enriched order details

### 3. Delivery Assignment
1. Update an order's `delivery_person_id` field
2. Expected: Delivery person (via their user_id) receives push notification
3. Notification includes: delivery details

### 4. Chat Message
1. Send a 1-to-1 message (receiver_id is set)
2. Expected: Receiver gets push notification with sender name
3. Notification shows: truncated message content

### 5. Enable/Disable
1. Go to Profile page
2. Toggle push notifications switch
3. Expected: Tokens updated in database, notifications start/stop

## Security Considerations

✅ **What's Secure:**
- Service account JSON stored as Supabase secret (never in code)
- All push tokens encrypted in transit
- Users can disable notifications anytime
- RLS policies on user_push_tokens table
- JWT verification on Edge Function disabled (internal use only)

⚠️ **Notes:**
- Firebase config in service worker is public (by design)
- Firebase security relies on Firebase Security Rules, not hiding config
- VAPID key is public (web push standard)

## Monitoring and Debugging

### Check Push Logs
```sql
SELECT * FROM push_log 
WHERE user_id = 'your-user-id' 
ORDER BY sent_at DESC 
LIMIT 10;
```

### Check User Tokens
```sql
SELECT * FROM user_push_tokens 
WHERE user_id = 'your-user-id';
```

### Edge Function Logs
View in Supabase Dashboard:
- Functions → send-push-notification → Logs

### Database Trigger Logs
Check PostgreSQL logs for trigger execution and errors

### Browser Console
- Check for Firebase initialization errors
- Monitor foreground message reception
- Verify service worker registration

## Known Limitations

1. **Service Worker Configuration:** Requires manual setup or build-time injection
2. **Database Setting:** Supabase URL must be set in database settings for triggers
3. **1-to-1 Messages Only:** Group chat notifications not implemented (as per requirements)
4. **Browser Support:** Push notifications require modern browser with service worker support
5. **HTTPS Required:** Push notifications only work on HTTPS (or localhost)

## Files Added/Modified

### New Files
- `supabase/migrations/20260209000000_push_notifications_tables.sql`
- `supabase/migrations/20260209000001_push_notifications_triggers.sql`
- `supabase/functions/send-push-notification/index.ts`
- `src/lib/firebase.ts`
- `src/hooks/usePushNotifications.ts`
- `public/firebase-messaging-sw.js`
- `docs/PUSH_NOTIFICATIONS_SETUP.md`
- `docs/FIREBASE_SERVICE_WORKER_CONFIG.md`
- `scripts/inject-firebase-config.js`

### Modified Files
- `package.json` (added firebase dependency)
- `src/components/profile/UserProfile.tsx` (added push toggle)
- `.env.example` (added Firebase variables)
- `supabase/config.toml` (added Edge Function config)
- `README.md` (added feature documentation)
- `.gitignore` (added service account exclusion)

## Success Criteria ✅

- [x] Database tables created for tokens and logs
- [x] pg_net extension enabled for HTTP calls
- [x] Four database triggers implemented with enriched context
- [x] Edge Function using FCM HTTP v1 with OAuth
- [x] No secrets in code (all via env vars)
- [x] Frontend Firebase integration complete
- [x] Push registration hook implemented
- [x] Service worker for background notifications
- [x] UI toggle in Profile page
- [x] Comprehensive documentation provided
- [x] Build successful without errors
- [x] Repository conventions followed

## Next Steps (User Action Required)

1. **Set up Firebase Project:**
   - Create Firebase project
   - Enable Cloud Messaging
   - Generate VAPID key
   - Download service account JSON

2. **Configure Frontend:**
   - Copy `.env.example` to `.env`
   - Fill in Firebase configuration values
   - Update service worker with Firebase config

3. **Configure Backend:**
   - Set Supabase Edge Function secrets
   - Set database URL configuration
   - Deploy Edge Function

4. **Test:**
   - Enable notifications in Profile
   - Test each notification scenario
   - Verify logs and delivery

See `docs/PUSH_NOTIFICATIONS_SETUP.md` for detailed setup instructions.
