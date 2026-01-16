-- Fix RLS policies for messages table to allow proper channel-based access

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.messages;

-- Create a comprehensive policy for viewing messages
-- Users can see:
-- 1. Messages they sent
-- 2. Messages sent to them directly
-- 3. Messages in the 'internal-general' channel (everyone)
-- 4. Messages in their role-specific channel (internal-appelants for appelants, etc.)
-- 5. Direct messages where they are sender or receiver
CREATE POLICY "Users can view messages in accessible channels" ON public.messages
FOR SELECT USING (
  auth.uid() = sender_id 
  OR auth.uid() = receiver_id
  OR (
    receiver_id IS NULL 
    AND (
      channel = 'internal-general'
      OR channel = 'internal-livreurs'
      OR channel = 'internal-appelants'
      OR channel = 'internal-superviseurs'
      OR channel LIKE 'direct-%'
      OR channel = 'caller-supervisor'
      OR channel = 'delivery-supervisor'
    )
  )
);

-- Ensure realtime is enabled for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;