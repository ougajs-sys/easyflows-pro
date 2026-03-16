
-- Table de file d'attente pour les messages de campagne
CREATE TABLE public.campaign_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sms', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,
  batch_number INTEGER,
  scheduled_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Index pour le traitement efficace de la queue
CREATE INDEX idx_campaign_queue_pending ON public.campaign_queue (scheduled_after, status) WHERE status = 'pending';
CREATE INDEX idx_campaign_queue_campaign ON public.campaign_queue (campaign_id);

-- Table de contrôle pour la cadence de la queue
CREATE TABLE public.campaign_queue_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  next_batch_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  batch_size INTEGER NOT NULL DEFAULT 17,
  total_queued INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.campaign_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_queue_control ENABLE ROW LEVEL SECURITY;

-- Policies: superviseurs et admins peuvent tout faire
CREATE POLICY "Superviseurs et admins peuvent gérer la queue" ON public.campaign_queue
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('superviseur', 'administrateur')
        AND ur.confirmed = true
    )
  );

CREATE POLICY "Superviseurs et admins peuvent gérer le contrôle queue" ON public.campaign_queue_control
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('superviseur', 'administrateur')
        AND ur.confirmed = true
    )
  );
