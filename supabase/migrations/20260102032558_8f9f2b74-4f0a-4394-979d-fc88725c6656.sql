-- Table pour les plannings des livreurs et appelants
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('delivery', 'caller')),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  zone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performances
CREATE INDEX idx_schedules_user_date ON public.schedules(user_id, date);
CREATE INDEX idx_schedules_date ON public.schedules(date);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Policies pour schedules
CREATE POLICY "Admins and supervisors can manage all schedules"
ON public.schedules
FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

CREATE POLICY "Users can view own schedules"
ON public.schedules
FOR SELECT
USING (user_id = auth.uid());

-- Table pour les campagnes SMS/WhatsApp
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sms', 'whatsapp')),
  category TEXT NOT NULL CHECK (category IN ('promotion', 'relance', 'notification', 'custom')),
  message TEXT NOT NULL,
  segment TEXT CHECK (segment IN ('all', 'new', 'regular', 'vip', 'inactive')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Policies pour campaigns
CREATE POLICY "Admins and supervisors can manage campaigns"
ON public.campaigns
FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

CREATE POLICY "Authenticated users can view campaigns"
ON public.campaigns
FOR SELECT
USING (true);

-- Table pour les logs d'envoi de messages
CREATE TABLE public.campaign_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performances
CREATE INDEX idx_campaign_logs_campaign ON public.campaign_logs(campaign_id);

-- Enable RLS
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour campaign_logs
CREATE POLICY "Admins and supervisors can view campaign logs"
ON public.campaign_logs
FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

-- Trigger pour updated_at
CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();