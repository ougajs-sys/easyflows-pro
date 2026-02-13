
-- 1. Add new enum value
ALTER TYPE followup_status ADD VALUE IF NOT EXISTS 'awaiting_validation';

-- 2. Add new columns to follow_ups
ALTER TABLE public.follow_ups 
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

-- 3. Create auto-close function
CREATE OR REPLACE FUNCTION public.auto_close_followups_on_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When order status changes to delivered, confirmed, or cancelled
  IF NEW.status IN ('delivered', 'confirmed', 'cancelled') 
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Close pending/awaiting follow_ups
    UPDATE public.follow_ups
    SET status = 'completed', completed_at = now()
    WHERE order_id = NEW.id
      AND status IN ('pending', 'awaiting_validation');
    
    -- Close pending scheduled_followups
    UPDATE public.scheduled_followups
    SET status = 'completed', updated_at = now()
    WHERE order_id = NEW.id
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger
DROP TRIGGER IF EXISTS auto_close_followups_on_order_status ON public.orders;
CREATE TRIGGER auto_close_followups_on_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_close_followups_on_order_update();

-- 5. Update RLS policies on follow_ups
-- Drop existing policies that need changes
DROP POLICY IF EXISTS "Authenticated users can view follow ups" ON public.follow_ups;
DROP POLICY IF EXISTS "Appelants, superviseurs et admins can create follow ups" ON public.follow_ups;

-- Supervisors and admins see all follow-ups
CREATE POLICY "Supervisors and admins can view all follow ups"
ON public.follow_ups FOR SELECT
USING (
  has_role(auth.uid(), 'administrateur'::app_role) 
  OR has_role(auth.uid(), 'superviseur'::app_role)
);

-- Callers see only follow-ups assigned to them
CREATE POLICY "Callers can view assigned follow ups"
ON public.follow_ups FOR SELECT
USING (
  has_role(auth.uid(), 'appelant'::app_role) 
  AND assigned_to = auth.uid()
);

-- All roles (including livreur) can create follow-ups
CREATE POLICY "Authenticated users can create follow ups"
ON public.follow_ups FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'appelant'::app_role) 
  OR has_role(auth.uid(), 'superviseur'::app_role) 
  OR has_role(auth.uid(), 'administrateur'::app_role)
  OR has_role(auth.uid(), 'livreur'::app_role)
);
