-- Fix manual_withdrawal_from_delivery RPC function
-- Remove p_performed_by parameter to avoid signature mismatch
-- The function will rely solely on auth.uid() for performed_by value

-- Drop the existing function with old signature
DROP FUNCTION IF EXISTS public.manual_withdrawal_from_delivery(uuid, uuid, integer, text, uuid);

-- Recreate the function with simplified signature (no p_performed_by parameter)
CREATE OR REPLACE FUNCTION public.manual_withdrawal_from_delivery(
  p_delivery_person_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_delivery_stock INTEGER;
  v_caller_id UUID;
  v_delivery_user_id UUID;
BEGIN
  -- Get the actual caller from auth context
  v_caller_id := auth.uid();
  
  -- Authorization check: only admins and supervisors can manually withdraw stock
  IF NOT (
    public.has_role('administrateur'::app_role, v_caller_id) OR
    public.has_role('superviseur'::app_role, v_caller_id)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Accès refusé. Seuls les administrateurs et superviseurs peuvent effectuer des retraits manuels.'
    );
  END IF;
  
  -- Validate reason is provided
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Un motif est obligatoire pour le retrait manuel.'
    );
  END IF;
  
  -- Get delivery person's user_id for notification
  SELECT user_id INTO v_delivery_user_id
  FROM public.delivery_persons
  WHERE id = p_delivery_person_id;
  
  IF v_delivery_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Livreur non trouvé.'
    );
  END IF;
  
  -- Check delivery person's stock
  SELECT quantity INTO v_delivery_stock 
  FROM public.delivery_person_stock 
  WHERE delivery_person_id = p_delivery_person_id AND product_id = p_product_id;

  IF v_delivery_stock IS NULL OR v_delivery_stock < p_quantity THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Stock livreur insuffisant pour ce retrait.'
    );
  END IF;

  -- Deduct from delivery person's stock
  UPDATE public.delivery_person_stock 
  SET quantity = quantity - p_quantity, updated_at = now()
  WHERE delivery_person_id = p_delivery_person_id AND product_id = p_product_id;

  -- Add to central shop stock
  UPDATE public.products 
  SET stock = stock + p_quantity, updated_at = now() 
  WHERE id = p_product_id;

  -- Record the stock movement with reason in notes
  INSERT INTO public.stock_movements (
    delivery_person_id, 
    product_id, 
    quantity, 
    movement_type, 
    performed_by, 
    notes
  )
  VALUES (
    p_delivery_person_id, 
    p_product_id, 
    -p_quantity, 
    'adjustment', 
    v_caller_id, 
    'Retrait manuel: ' || p_reason
  );

  -- Create notification for the delivery person
  -- Store it in a custom notifications table if it exists, or use a simple approach
  -- For now, we'll rely on the stock_movements real-time subscription pattern
  
  RETURN json_build_object(
    'success', true,
    'message', 'Retrait effectué avec succès',
    'delivery_user_id', v_delivery_user_id
  );
END;
$$;

-- Grant execute permission to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION public.manual_withdrawal_from_delivery TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.manual_withdrawal_from_delivery IS 
  'Allows supervisors and administrators to manually withdraw stock from a delivery person with a mandatory reason. Uses auth.uid() for performed_by. The delivery person is notified via the stock_movements table.';
