-- ============================================
-- DM-ONLY CHAT: PRESENCE TRACKING & VALIDATION
-- ============================================

-- ============================================
-- 1. USER PRESENCE TABLE (Heartbeat Fallback)
-- ============================================
CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Index for quick lookups by role and last_seen_at
CREATE INDEX idx_user_presence_role_last_seen ON public.user_presence(role, last_seen_at DESC);

-- ============================================
-- 2. RLS POLICIES FOR USER_PRESENCE
-- ============================================

-- Users can upsert their own presence
CREATE POLICY "Users can manage own presence"
ON public.user_presence
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Authenticated users can read all presence data
CREATE POLICY "Authenticated users can read presence"
ON public.user_presence
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================
-- 3. FUNCTION TO VALIDATE ROLE PAIRINGS
-- ============================================

CREATE OR REPLACE FUNCTION public.can_chat(sender_id uuid, receiver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_role app_role;
  receiver_role app_role;
BEGIN
  -- Get sender role
  SELECT role INTO sender_role
  FROM public.user_roles
  WHERE user_id = sender_id
  LIMIT 1;
  
  -- Get receiver role
  SELECT role INTO receiver_role
  FROM public.user_roles
  WHERE user_id = receiver_id
  LIMIT 1;
  
  -- If either role is NULL, cannot chat
  IF sender_role IS NULL OR receiver_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allowed pairs (bidirectional):
  -- appelant ↔ superviseur
  -- livreur ↔ superviseur
  -- administrateur ↔ superviseur
  
  IF (sender_role = 'appelant' AND receiver_role = 'superviseur') OR
     (sender_role = 'superviseur' AND receiver_role = 'appelant') OR
     (sender_role = 'livreur' AND receiver_role = 'superviseur') OR
     (sender_role = 'superviseur' AND receiver_role = 'livreur') OR
     (sender_role = 'administrateur' AND receiver_role = 'superviseur') OR
     (sender_role = 'superviseur' AND receiver_role = 'administrateur') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- ============================================
-- 4. TRIGGER FOR UPDATED_AT ON USER_PRESENCE
-- ============================================

CREATE TRIGGER update_user_presence_updated_at
BEFORE UPDATE ON public.user_presence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
