-- =============================================
-- PUSH NOTIFICATIONS INFRASTRUCTURE
-- =============================================

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================
-- 1. TABLE user_push_tokens
-- Store FCM tokens for push notifications
-- =============================================
CREATE TABLE public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tokens"
ON public.user_push_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
ON public.user_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
ON public.user_push_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
ON public.user_push_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_enabled ON public.user_push_tokens(user_id, is_enabled);

-- =============================================
-- 2. TABLE push_log
-- Log all push notifications sent
-- =============================================
CREATE TABLE public.push_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status TEXT DEFAULT 'pending',
  error_message TEXT
);

ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_log
CREATE POLICY "Users can view their own push logs"
ON public.push_log FOR SELECT
USING (auth.uid() = user_id);

-- Only system can insert push logs (via triggers)
CREATE POLICY "System can insert push logs"
ON public.push_log FOR INSERT
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_push_log_user_id ON public.push_log(user_id);
CREATE INDEX idx_push_log_sent_at ON public.push_log(sent_at DESC);

-- =============================================
-- 3. Trigger for updated_at
-- =============================================
CREATE TRIGGER update_user_push_tokens_updated_at
BEFORE UPDATE ON public.user_push_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
