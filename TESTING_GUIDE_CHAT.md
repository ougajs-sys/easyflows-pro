# DM-Only Chat Implementation - Testing Guide

## Overview
This implementation replaces the mixed chat system with a DM-only chat based on online presence tracking.

## Key Features Implemented

### 1. User Presence Tracking
- **Realtime Presence**: Uses Supabase Realtime Presence API for instant updates
- **Database Fallback**: `user_presence` table with heartbeat mechanism (30-second intervals)
- **Online Threshold**: Users are considered online if last seen within 60 seconds
- **Automatic Updates**: Presence is tracked automatically when user is on any page

### 2. DM-Only Messaging
- **No Public Channels**: Removed general/superviseurs/appelants/livreurs channels
- **Direct Messages Only**: All messages require a receiver_id
- **Deterministic Channel Names**: `direct-<uuid1>-<uuid2>` (UUIDs sorted alphabetically)
- **Role-Based Access**: Only allowed role pairs can message each other

### 3. Allowed Role Pairings (Bidirectional)
- appelant ↔ superviseur
- livreur ↔ superviseur
- administrateur ↔ superviseur

**Note**: superviseur is the hub - they can chat with everyone. Others can only chat with superviseurs.

### 4. UX Features
- Online indicator (green dot) next to contacts
- Unread message badges per contact
- Grouped contacts by role
- Real-time message delivery
- Mark-as-read functionality
- Empty state when no users online

## Testing Scenarios

### Scenario 1: Appelant ↔ Superviseur Chat
**Setup:**
1. Login as appelant (caller) user
2. Login as superviseur in another browser/incognito
3. Navigate to /chat on both

**Expected:**
- Appelant sees ONLY online superviseurs in contact list
- Superviseur sees the appelant in their contact list (under "Appelants")
- Both can select each other to start DM
- Messages appear in real-time on both sides
- Unread count increases when message received
- Mark as read when viewing conversation

**Test Messages:**
- Send text from appelant → superviseur
- Reply from superviseur → appelant
- Verify both messages appear correctly
- Check unread badges update properly

### Scenario 2: Livreur ↔ Superviseur Chat
**Setup:**
1. Login as livreur (delivery) user
2. Login as superviseur in another browser
3. Navigate to /chat on both

**Expected:**
- Livreur sees ONLY online superviseurs
- Superviseur sees the livreur in contact list (under "Livreurs")
- DM conversation works bidirectionally
- Real-time updates and unread counts work

### Scenario 3: Administrateur ↔ Superviseur Chat
**Setup:**
1. Login as administrateur user
2. Login as superviseur in another browser
3. Navigate to /chat on both

**Expected:**
- Administrateur sees ONLY online superviseurs
- Superviseur sees the admin in contact list (under "Admins")
- DM works correctly
- Real-time updates functional

### Scenario 4: Offline User Behavior
**Setup:**
1. Login as superviseur
2. Have another user (any role) logout or close browser
3. Wait 60+ seconds

**Expected:**
- After 60 seconds, the offline user disappears from contact list
- No way to send messages to offline users
- Contact list updates automatically

### Scenario 5: Mark as Read
**Setup:**
1. Have two users in conversation
2. Send messages from user A
3. User B opens conversation

**Expected:**
- Unread badge shows count before opening
- Badge clears when conversation opened
- Sender sees checkmark (✓) next to read messages

### Scenario 6: Multiple Superviseurs Online
**Setup:**
1. Login as appelant
2. Have 2+ superviseurs online

**Expected:**
- Appelant sees ALL online superviseurs in list
- Can select any superviseur to chat with
- Each conversation is separate
- Unread counts are per-conversation

### Scenario 7: Superviseur with Multiple Contacts
**Setup:**
1. Login as superviseur
2. Have appelant, livreur, and administrateur all online

**Expected:**
- Superviseur sees all three grouped by role
- Can chat with any of them
- Unread badges show correctly for each
- Conversations don't mix

### Scenario 8: Navigation from Dashboard
**Setup:**
1. Login as appelant
2. Go to Dashboard (/dashboard)
3. Click chat in sidebar

**Expected:**
- Redirects to /chat page
- Shows new DM-only interface
- Old CallerChat component not visible

### Scenario 9: Navigation from Delivery Page
**Setup:**
1. Login as livreur
2. Go to Delivery page
3. Click chat in sidebar

**Expected:**
- Redirects to /chat page
- Shows new DM-only interface
- Old DeliveryChat component not visible

## Database Validation

### Test RLS Policies

**Test 1: Cannot send without receiver_id**
```sql
-- Should FAIL
INSERT INTO messages (sender_id, receiver_id, channel, content)
VALUES (auth.uid(), NULL, 'some-channel', 'test');
```

**Test 2: Cannot send to disallowed role**
```sql
-- Should FAIL if appelant tries to message another appelant
-- (requires setting up test data with specific roles)
```

**Test 3: Can only mark own messages as read**
```sql
-- Should FAIL if trying to mark someone else's message as read
UPDATE messages SET is_read = true WHERE receiver_id != auth.uid();
```

**Test 4: Presence updates work**
```sql
-- Should work - user updating own presence
INSERT INTO user_presence (user_id, role, last_seen_at)
VALUES (auth.uid(), 'appelant', NOW())
ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW();
```

## Known Limitations & Future Enhancements

### Current Limitations
1. No typing indicators
2. No message edit/delete functionality
3. No file attachments
4. No message reactions
5. No conversation history pagination (limited to 100 recent messages)
6. No search functionality

### Recommended Enhancements
1. Add typing indicators using Supabase Realtime Broadcast
2. Implement message search
3. Add pagination for long conversations
4. Support file/image attachments
5. Add message delivery status (sent/delivered/read)
6. Implement push notifications for offline users

## Troubleshooting

### Users not appearing in contact list
1. Check if user has presence entry in database
2. Verify last_seen_at is within 60 seconds
3. Check role pairing is allowed
4. Verify user is authenticated

### Messages not appearing in real-time
1. Check Supabase Realtime is enabled for messages table
2. Verify REPLICA IDENTITY is set to FULL
3. Check browser console for subscription errors
4. Verify RLS policies allow user to see messages

### Cannot send messages
1. Check receiver_id is set
2. Verify role pairing is allowed
3. Check RLS policies on messages table
4. Verify user is authenticated

### Presence not updating
1. Check network connectivity
2. Verify heartbeat mutation is running (check console)
3. Check user_presence table for updates
4. Verify user is authenticated

## Performance Considerations

### Optimizations Implemented
- 30-second heartbeat interval (not too frequent)
- 5-second polling fallback (reasonable for chat)
- 30-second presence query refetch
- Indexed queries on user_presence table
- Efficient channel naming for quick lookups

### Monitoring
- Watch for excessive API calls (check Supabase dashboard)
- Monitor realtime connection stability
- Track message delivery latency
- Check database query performance

## Security Summary

### Security Features
✅ RLS enforces DM-only access
✅ Role pairing validation at database level
✅ Users can only see/message allowed counterparts
✅ Receivers can only mark their own messages as read
✅ No public message channels
✅ Deterministic channel naming prevents channel guessing

### CodeQL Results
✅ No security vulnerabilities detected

## Migration Notes

### Database Changes
1. New table: `user_presence`
2. New function: `can_chat(sender_id, receiver_id)`
3. Updated RLS policies on `messages` table
4. Existing message data preserved

### Backward Compatibility
- Old message data in channel-based format is preserved but not shown in new UI
- No data migration required
- Old chat components disabled but not deleted

### Rollback Plan
If issues occur:
1. Revert frontend changes (restore old InternalChat)
2. Restore old RLS policies
3. Keep user_presence table (no harm)
4. Keep can_chat function (no harm)

## Success Criteria

### Must Pass
- [x] Build completes without errors
- [x] TypeScript compilation succeeds
- [x] No CodeQL security alerts
- [ ] All 9 test scenarios pass
- [ ] RLS policies validated
- [ ] No unauthorized access possible

### Should Pass
- [ ] Messages delivered within 1 second
- [ ] Presence updates within 30 seconds
- [ ] No excessive API calls (< 10/min per user)
- [ ] UI responsive on mobile
- [ ] Unread badges accurate
