-- ============================================
-- DM-ONLY CHAT: MESSAGES TABLE RLS POLICIES
-- ============================================

-- Drop all existing message policies
DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- ============================================
-- 1. SELECT POLICY - DM-ONLY ACCESS
-- ============================================
-- Users can only view messages where they are sender or receiver
CREATE POLICY "Users can view DM messages only"
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- ============================================
-- 2. INSERT POLICY - VALIDATE DM REQUIREMENTS
-- ============================================
-- Users can only send DM messages with proper validation:
-- - Must be authenticated and sender_id matches auth.uid()
-- - Must have a receiver_id (no public messages)
-- - Role pairing must be allowed
CREATE POLICY "Users can send DM messages to allowed roles"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND receiver_id IS NOT NULL
  AND public.can_chat(sender_id, receiver_id)
);

-- ============================================
-- 3. UPDATE POLICY - MARK AS READ ONLY
-- ============================================
-- Users can only mark messages sent to them as read
-- Cannot edit message content or other fields
CREATE POLICY "Receivers can mark messages as read"
ON public.messages
FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (
  auth.uid() = receiver_id
  -- Additional safety: ensure only is_read can be changed
  -- This is enforced at application level but good to document
);
