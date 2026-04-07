
-- Table for AI campaign proposals (Easy-Claw)
CREATE TABLE public.ai_campaign_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  analysis TEXT NOT NULL,
  target_segment TEXT NOT NULL,
  target_count INTEGER DEFAULT 0,
  campaign_type TEXT NOT NULL,
  channel TEXT DEFAULT 'whatsapp',
  proposed_message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  campaign_id UUID REFERENCES public.campaigns(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_campaign_proposals ENABLE ROW LEVEL SECURITY;

-- Only supervisors and admins can read proposals
CREATE POLICY "Supervisors and admins can read proposals"
  ON public.ai_campaign_proposals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('superviseur', 'administrateur')
        AND ur.confirmed = true
    )
  );

-- Only supervisors and admins can update proposals (approve/reject)
CREATE POLICY "Supervisors and admins can update proposals"
  ON public.ai_campaign_proposals FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('superviseur', 'administrateur')
        AND ur.confirmed = true
    )
  );

-- Service role inserts (from edge functions)
CREATE POLICY "Service can insert proposals"
  ON public.ai_campaign_proposals FOR INSERT
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER set_updated_at_ai_campaign_proposals
  BEFORE UPDATE ON public.ai_campaign_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
