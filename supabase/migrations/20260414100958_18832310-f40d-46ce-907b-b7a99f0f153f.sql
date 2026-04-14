CREATE TABLE public.manychat_subscribers (
  phone TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manychat_subscribers ENABLE ROW LEVEL SECURITY;

-- No public RLS policies - only service role access from edge functions
COMMENT ON TABLE public.manychat_subscribers IS 'Cache des subscriber_id ManyChat pour éviter de recréer les contacts à chaque envoi';