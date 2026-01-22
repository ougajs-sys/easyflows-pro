-- =====================================================
-- SECURITY FIX: scheduled_followups weak RLS policies
-- =====================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view followups" ON public.scheduled_followups;
DROP POLICY IF EXISTS "Authenticated users can create followups" ON public.scheduled_followups;
DROP POLICY IF EXISTS "Authenticated users can update followups" ON public.scheduled_followups;

-- Create role-based policies for scheduled_followups

-- View: Only appelants, supervisors, and admins
CREATE POLICY "Role based view access for followups"
ON public.scheduled_followups FOR SELECT
USING (
  public.has_role(auth.uid(), 'appelant'::app_role) OR
  public.has_role(auth.uid(), 'superviseur'::app_role) OR
  public.has_role(auth.uid(), 'administrateur'::app_role)
);

-- Create: Only appelants, supervisors, and admins
CREATE POLICY "Role based insert access for followups"
ON public.scheduled_followups FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'appelant'::app_role) OR
  public.has_role(auth.uid(), 'superviseur'::app_role) OR
  public.has_role(auth.uid(), 'administrateur'::app_role)
);

-- Update: Only creator, supervisors, and admins
CREATE POLICY "Creator and supervisor update access for followups"
ON public.scheduled_followups FOR UPDATE
USING (
  created_by = auth.uid() OR
  public.has_role(auth.uid(), 'superviseur'::app_role) OR
  public.has_role(auth.uid(), 'administrateur'::app_role)
);

-- =====================================================
-- SECURITY FIX: Stock transfer functions lack access control
-- =====================================================

-- Recreate transfer_stock_to_delivery with proper authorization
-- Remove p_performed_by parameter and use auth.uid() instead
CREATE OR REPLACE FUNCTION public.transfer_stock_to_delivery(
  p_delivery_person_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_performed_by UUID DEFAULT NULL -- Keep for backward compatibility but ignore it
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INTEGER;
  v_caller_id UUID;
BEGIN
  -- Get the actual caller from auth context
  v_caller_id := auth.uid();
  
  -- Authorization check: only admins and supervisors can transfer stock
  IF NOT (
    public.has_role(v_caller_id, 'administrateur'::app_role) OR
    public.has_role(v_caller_id, 'superviseur'::app_role)
  ) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Accès refusé. Seuls les administrateurs et superviseurs peuvent transférer du stock.'
    );
  END IF;
  
  -- Vérifier le stock disponible
  SELECT stock INTO v_current_stock FROM products WHERE id = p_product_id;
  
  IF v_current_stock IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Produit non trouvé');
  END IF;
  
  IF v_current_stock < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Stock insuffisant dans la boutique');
  END IF;

  -- Réduire le stock principal
  UPDATE products SET stock = stock - p_quantity, updated_at = now() WHERE id = p_product_id;

  -- Ajouter au stock du livreur
  INSERT INTO delivery_person_stock (delivery_person_id, product_id, quantity, last_restocked_at)
  VALUES (p_delivery_person_id, p_product_id, p_quantity, now())
  ON CONFLICT (delivery_person_id, product_id)
  DO UPDATE SET 
    quantity = delivery_person_stock.quantity + p_quantity,
    last_restocked_at = now(),
    updated_at = now();

  -- Enregistrer le mouvement avec l'ID réel du caller (not client-supplied)
  INSERT INTO stock_movements (delivery_person_id, product_id, quantity, movement_type, performed_by, notes)
  VALUES (p_delivery_person_id, p_product_id, p_quantity, 'transfer_to_delivery', v_caller_id, 'Transfert boutique -> livreur');

  RETURN json_build_object('success', true);
END;
$$;

-- Recreate transfer_stock_from_delivery with proper authorization
CREATE OR REPLACE FUNCTION public.transfer_stock_from_delivery(
  p_delivery_person_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_performed_by UUID DEFAULT NULL -- Keep for backward compatibility but ignore it
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_stock INTEGER;
  v_caller_id UUID;
BEGIN
  -- Get the actual caller from auth context
  v_caller_id := auth.uid();
  
  -- Authorization check: only admins and supervisors can transfer stock
  IF NOT (
    public.has_role(v_caller_id, 'administrateur'::app_role) OR
    public.has_role(v_caller_id, 'superviseur'::app_role)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Accès refusé. Seuls les administrateurs et superviseurs peuvent retirer du stock.'
    );
  END IF;
  
  -- Vérifier le stock du livreur
  SELECT quantity INTO v_delivery_stock 
  FROM delivery_person_stock 
  WHERE delivery_person_id = p_delivery_person_id AND product_id = p_product_id;

  IF v_delivery_stock IS NULL OR v_delivery_stock < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Stock livreur insuffisant');
  END IF;

  -- Retirer du stock livreur
  UPDATE delivery_person_stock 
  SET quantity = quantity - p_quantity, updated_at = now()
  WHERE delivery_person_id = p_delivery_person_id AND product_id = p_product_id;

  -- Ajouter au stock principal
  UPDATE products SET stock = stock + p_quantity, updated_at = now() WHERE id = p_product_id;

  -- Enregistrer le mouvement avec l'ID réel du caller (not client-supplied)
  INSERT INTO stock_movements (delivery_person_id, product_id, quantity, movement_type, performed_by, notes)
  VALUES (p_delivery_person_id, p_product_id, -p_quantity, 'transfer_from_delivery', v_caller_id, 'Retour livreur -> boutique');

  RETURN json_build_object('success', true);
END;
$$;