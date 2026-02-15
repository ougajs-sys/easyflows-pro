
-- 1. caller_scores: Replace "Users can view all scores" with role-based access
DROP POLICY IF EXISTS "Users can view all scores" ON public.caller_scores;

CREATE POLICY "Users can view own scores"
ON public.caller_scores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Supervisors and admins can view all scores"
ON public.caller_scores FOR SELECT
USING (
  has_role(auth.uid(), 'superviseur'::app_role) OR
  has_role(auth.uid(), 'administrateur'::app_role)
);

-- 2. campaigns: Remove public SELECT, keep admin/supervisor management policy
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;

CREATE POLICY "Callers can view campaigns"
ON public.campaigns FOR SELECT
USING (
  has_role(auth.uid(), 'appelant'::app_role) OR
  has_role(auth.uid(), 'superviseur'::app_role) OR
  has_role(auth.uid(), 'administrateur'::app_role)
);

-- 3. sms_templates: Restrict to employees who send messages
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.sms_templates;

CREATE POLICY "Employees can view sms templates"
ON public.sms_templates FOR SELECT
USING (
  has_role(auth.uid(), 'appelant'::app_role) OR
  has_role(auth.uid(), 'superviseur'::app_role) OR
  has_role(auth.uid(), 'administrateur'::app_role)
);

-- 4. stock_thresholds: Restrict to relevant roles
DROP POLICY IF EXISTS "Everyone can view thresholds" ON public.stock_thresholds;

CREATE POLICY "Authorized roles can view thresholds"
ON public.stock_thresholds FOR SELECT
USING (
  has_role(auth.uid(), 'livreur'::app_role) OR
  has_role(auth.uid(), 'superviseur'::app_role) OR
  has_role(auth.uid(), 'administrateur'::app_role)
);

-- 5. training_resources: Restrict to authenticated employees
DROP POLICY IF EXISTS "Everyone can view training resources" ON public.training_resources;

CREATE POLICY "Authenticated employees can view training resources"
ON public.training_resources FOR SELECT
USING (
  has_role(auth.uid(), 'appelant'::app_role) OR
  has_role(auth.uid(), 'livreur'::app_role) OR
  has_role(auth.uid(), 'superviseur'::app_role) OR
  has_role(auth.uid(), 'administrateur'::app_role)
);
