-- Permettre aux livreurs de retourner leur propre stock vers la boutique, tout en gardant le contrôle admin/superviseur.

CREATE OR REPLACE FUNCTION public.transfer_stock_from_delivery(
  p_delivery_person_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_performed_by uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_delivery_stock INTEGER;
  v_caller_id UUID;
  v_target_delivery_person_id UUID;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Quantité invalide');
  END IF;

  -- Admins/superviseurs: peuvent retourner le stock de n'importe quel livreur
  IF (
    public.has_role(v_caller_id, 'administrateur'::app_role) OR
    public.has_role(v_caller_id, 'superviseur'::app_role)
  ) THEN
    v_target_delivery_person_id := p_delivery_person_id;

  -- Livreurs: ne peuvent retourner QUE leur propre stock
  ELSIF public.has_role(v_caller_id, 'livreur'::app_role) THEN
    SELECT dp.id
    INTO v_target_delivery_person_id
    FROM public.delivery_persons dp
    WHERE dp.user_id = v_caller_id
      AND dp.is_active = true
    LIMIT 1;

    IF v_target_delivery_person_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Profil livreur introuvable');
    END IF;

    -- Si un id est fourni et ne correspond pas, refuser explicitement (anti-usurpation)
    IF p_delivery_person_id IS NOT NULL AND p_delivery_person_id <> v_target_delivery_person_id THEN
      RETURN json_build_object('success', false, 'error', 'Accès refusé: retour de stock uniquement sur votre profil');
    END IF;

  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Accès refusé. Seuls les administrateurs, superviseurs ou le livreur concerné peuvent retourner du stock.'
    );
  END IF;

  IF v_target_delivery_person_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Livreur non sélectionné');
  END IF;

  -- Vérifier le stock du livreur
  SELECT quantity
  INTO v_delivery_stock
  FROM public.delivery_person_stock
  WHERE delivery_person_id = v_target_delivery_person_id
    AND product_id = p_product_id
  FOR UPDATE;

  IF v_delivery_stock IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Stock livreur introuvable pour ce produit');
  END IF;

  IF v_delivery_stock < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Stock livreur insuffisant');
  END IF;

  -- Retirer du stock livreur
  UPDATE public.delivery_person_stock
  SET quantity = quantity - p_quantity,
      updated_at = now()
  WHERE delivery_person_id = v_target_delivery_person_id
    AND product_id = p_product_id;

  -- Ajouter au stock principal
  UPDATE public.products
  SET stock = stock + p_quantity,
      updated_at = now()
  WHERE id = p_product_id;

  -- Enregistrer le mouvement (performed_by = caller réel)
  INSERT INTO public.stock_movements (
    delivery_person_id,
    product_id,
    quantity,
    movement_type,
    performed_by,
    notes
  )
  VALUES (
    v_target_delivery_person_id,
    p_product_id,
    -p_quantity,
    'transfer_from_delivery',
    v_caller_id,
    'Retour livreur -> boutique'
  );

  RETURN json_build_object('success', true);
END;
$$;

-- (Optionnel) on peut aussi verrouiller l'exécution au rôle authentifié si besoin.
-- GRANT EXECUTE ON FUNCTION public.transfer_stock_from_delivery(uuid,uuid,integer,uuid) TO authenticated;
