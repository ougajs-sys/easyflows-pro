
-- Table pour stocker les tokens FCM des utilisateurs
CREATE TABLE public.user_push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'web',
  is_enabled BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Table pour logger les notifications envoyées
CREATE TABLE public.push_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_enabled ON public.user_push_tokens(user_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_push_log_user_id ON public.push_log(user_id);
CREATE INDEX idx_push_log_created_at ON public.push_log(created_at DESC);

-- RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;

-- Policies user_push_tokens
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

-- Policies push_log
CREATE POLICY "Users can view their own push logs"
  ON public.push_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert push logs"
  ON public.push_log FOR INSERT
  WITH CHECK (true);
