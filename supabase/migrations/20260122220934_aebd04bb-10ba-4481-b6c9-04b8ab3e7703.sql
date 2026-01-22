-- Fix function search_path security issue
-- Set fixed search_path for all public functions to prevent search path manipulation attacks

-- 1. Fix has_role function with fixed search_path
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Fix update_updated_at_column function with fixed search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Fix transfer_stock_to_delivery function with fixed search_path (correct parameter order)
CREATE OR REPLACE FUNCTION public.transfer_stock_to_delivery(
  p_delivery_person_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_performed_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
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
    public.has_role('administrateur'::app_role, v_caller_id) OR
    public.has_role('superviseur'::app_role, v_caller_id)
  ) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Accès refusé. Seuls les administrateurs et superviseurs peuvent transférer du stock.'
    );
  END IF;
  
  -- Vérifier le stock disponible
  SELECT stock INTO v_current_stock FROM public.products WHERE id = p_product_id;
  
  IF v_current_stock IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Produit non trouvé');
  END IF;
  
  IF v_current_stock < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Stock insuffisant dans la boutique');
  END IF;

  -- Réduire le stock principal
  UPDATE public.products SET stock = stock - p_quantity, updated_at = now() WHERE id = p_product_id;

  -- Ajouter au stock du livreur
  INSERT INTO public.delivery_person_stock (delivery_person_id, product_id, quantity, last_restocked_at)
  VALUES (p_delivery_person_id, p_product_id, p_quantity, now())
  ON CONFLICT (delivery_person_id, product_id)
  DO UPDATE SET 
    quantity = delivery_person_stock.quantity + p_quantity,
    last_restocked_at = now(),
    updated_at = now();

  -- Enregistrer le mouvement avec l'ID réel du caller (not client-supplied)
  INSERT INTO public.stock_movements (delivery_person_id, product_id, quantity, movement_type, performed_by, notes)
  VALUES (p_delivery_person_id, p_product_id, p_quantity, 'transfer_to_delivery', v_caller_id, 'Transfert boutique -> livreur');

  RETURN json_build_object('success', true);
END;
$$;

-- 4. Fix transfer_stock_from_delivery function with fixed search_path (correct parameter order)
CREATE OR REPLACE FUNCTION public.transfer_stock_from_delivery(
  p_delivery_person_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_performed_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
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
    public.has_role('administrateur'::app_role, v_caller_id) OR
    public.has_role('superviseur'::app_role, v_caller_id)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Accès refusé. Seuls les administrateurs et superviseurs peuvent retirer du stock.'
    );
  END IF;
  
  -- Vérifier le stock du livreur
  SELECT quantity INTO v_delivery_stock 
  FROM public.delivery_person_stock 
  WHERE delivery_person_id = p_delivery_person_id AND product_id = p_product_id;

  IF v_delivery_stock IS NULL OR v_delivery_stock < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Stock livreur insuffisant');
  END IF;

  -- Retirer du stock livreur
  UPDATE public.delivery_person_stock 
  SET quantity = quantity - p_quantity, updated_at = now()
  WHERE delivery_person_id = p_delivery_person_id AND product_id = p_product_id;

  -- Ajouter au stock principal
  UPDATE public.products SET stock = stock + p_quantity, updated_at = now() WHERE id = p_product_id;

  -- Enregistrer le mouvement avec l'ID réel du caller (not client-supplied)
  INSERT INTO public.stock_movements (delivery_person_id, product_id, quantity, movement_type, performed_by, notes)
  VALUES (p_delivery_person_id, p_product_id, -p_quantity, 'transfer_from_delivery', v_caller_id, 'Retour livreur -> boutique');

  RETURN json_build_object('success', true);
END;
$$;