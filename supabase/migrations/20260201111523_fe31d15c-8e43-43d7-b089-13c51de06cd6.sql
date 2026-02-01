
-- Ajouter le statut de confirmation aux versements
ALTER TABLE public.revenue_deposits 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Créer un index pour les requêtes de statut
CREATE INDEX IF NOT EXISTS idx_revenue_deposits_status ON public.revenue_deposits(status);
CREATE INDEX IF NOT EXISTS idx_revenue_deposits_pending ON public.revenue_deposits(status) WHERE status = 'pending';

-- Créer la fonction pour confirmer un versement (superviseur/admin)
CREATE OR REPLACE FUNCTION public.confirm_revenue_deposit(
  p_deposit_id UUID,
  p_supervisor_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_deposit RECORD;
  v_caller_id UUID;
BEGIN
  -- Vérifier que l'utilisateur est superviseur ou admin
  IF NOT (
    public.has_role('administrateur'::app_role, p_supervisor_id) OR
    public.has_role('superviseur'::app_role, p_supervisor_id)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé. Seuls les superviseurs et administrateurs peuvent confirmer les versements.');
  END IF;
  
  -- Récupérer le versement
  SELECT * INTO v_deposit
  FROM public.revenue_deposits
  WHERE id = p_deposit_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Versement non trouvé');
  END IF;
  
  IF v_deposit.status = 'confirmed' THEN
    RETURN json_build_object('success', false, 'error', 'Ce versement a déjà été confirmé');
  END IF;
  
  -- Mettre à jour le statut du versement
  UPDATE public.revenue_deposits
  SET 
    status = 'confirmed',
    confirmed_by = p_supervisor_id,
    confirmed_at = now()
  WHERE id = p_deposit_id;
  
  RETURN json_build_object(
    'success', true, 
    'deposit_id', p_deposit_id, 
    'amount', v_deposit.total_amount,
    'deposited_by', v_deposit.deposited_by
  );
END;
$$;

-- Créer la fonction pour rejeter un versement
CREATE OR REPLACE FUNCTION public.reject_revenue_deposit(
  p_deposit_id UUID,
  p_supervisor_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_deposit RECORD;
BEGIN
  -- Vérifier que l'utilisateur est superviseur ou admin
  IF NOT (
    public.has_role('administrateur'::app_role, p_supervisor_id) OR
    public.has_role('superviseur'::app_role, p_supervisor_id)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé.');
  END IF;
  
  -- Récupérer le versement
  SELECT * INTO v_deposit
  FROM public.revenue_deposits
  WHERE id = p_deposit_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Versement non trouvé');
  END IF;
  
  IF v_deposit.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Ce versement ne peut plus être rejeté');
  END IF;
  
  -- Remettre les recettes en statut "collected" pour permettre un nouveau versement
  UPDATE public.collected_revenues
  SET 
    status = 'collected',
    deposit_id = NULL,
    updated_at = now()
  WHERE deposit_id = p_deposit_id;
  
  -- Marquer le versement comme rejeté
  UPDATE public.revenue_deposits
  SET 
    status = 'rejected',
    confirmed_by = p_supervisor_id,
    confirmed_at = now(),
    notes = COALESCE(notes || E'\n', '') || 'Rejeté: ' || COALESCE(p_reason, 'Sans raison')
  WHERE id = p_deposit_id;
  
  RETURN json_build_object('success', true, 'deposit_id', p_deposit_id);
END;
$$;

-- Mettre à jour les politiques RLS pour revenue_deposits
DROP POLICY IF EXISTS "Supervisors and admins can view all deposits" ON public.revenue_deposits;
CREATE POLICY "Supervisors and admins can view all deposits"
  ON public.revenue_deposits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('superviseur', 'administrateur')
      AND ur.confirmed = true
    )
    OR deposited_by = auth.uid()
  );

DROP POLICY IF EXISTS "Supervisors and admins can update deposits" ON public.revenue_deposits;
CREATE POLICY "Supervisors and admins can update deposits"
  ON public.revenue_deposits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('superviseur', 'administrateur')
      AND ur.confirmed = true
    )
  );
