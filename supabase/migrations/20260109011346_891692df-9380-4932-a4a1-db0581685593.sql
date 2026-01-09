-- Table pour gérer le stock détenu par chaque livreur
CREATE TABLE public.delivery_person_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_person_id UUID NOT NULL REFERENCES public.delivery_persons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(delivery_person_id, product_id)
);

-- Enable RLS
ALTER TABLE public.delivery_person_stock ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Delivery persons can view own stock"
ON public.delivery_person_stock
FOR SELECT
USING (delivery_person_id IN (
  SELECT id FROM delivery_persons WHERE user_id = auth.uid()
));

CREATE POLICY "Delivery persons can update own stock"
ON public.delivery_person_stock
FOR UPDATE
USING (delivery_person_id IN (
  SELECT id FROM delivery_persons WHERE user_id = auth.uid()
));

CREATE POLICY "Admins and supervisors can view all stock"
ON public.delivery_person_stock
FOR SELECT
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

CREATE POLICY "Admins and supervisors can manage all stock"
ON public.delivery_person_stock
FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

-- Table pour l'historique des mouvements de stock livreur
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_person_id UUID REFERENCES public.delivery_persons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('transfer_to_delivery', 'transfer_from_delivery', 'sale', 'return', 'adjustment')),
  reference_id UUID, -- order_id ou autre référence
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Delivery persons can view own movements"
ON public.stock_movements
FOR SELECT
USING (
  delivery_person_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'administrateur')
  OR has_role(auth.uid(), 'superviseur')
);

CREATE POLICY "Delivery persons can create own movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (
  delivery_person_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'administrateur')
  OR has_role(auth.uid(), 'superviseur')
);

CREATE POLICY "Admins can manage all movements"
ON public.stock_movements
FOR ALL
USING (has_role(auth.uid(), 'administrateur'));

-- Fonction pour transférer du stock de la boutique vers un livreur
CREATE OR REPLACE FUNCTION public.transfer_stock_to_delivery(
  p_delivery_person_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_performed_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INTEGER;
  v_result JSON;
BEGIN
  -- Vérifier le stock disponible
  SELECT stock INTO v_current_stock FROM products WHERE id = p_product_id;
  
  IF v_current_stock < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Stock insuffisant');
  END IF;

  -- Réduire le stock principal
  UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;

  -- Ajouter au stock du livreur
  INSERT INTO delivery_person_stock (delivery_person_id, product_id, quantity, last_restocked_at)
  VALUES (p_delivery_person_id, p_product_id, p_quantity, now())
  ON CONFLICT (delivery_person_id, product_id)
  DO UPDATE SET 
    quantity = delivery_person_stock.quantity + p_quantity,
    last_restocked_at = now(),
    updated_at = now();

  -- Enregistrer le mouvement
  INSERT INTO stock_movements (delivery_person_id, product_id, quantity, movement_type, performed_by, notes)
  VALUES (p_delivery_person_id, p_product_id, p_quantity, 'transfer_to_delivery', p_performed_by, 'Transfert boutique -> livreur');

  RETURN json_build_object('success', true);
END;
$$;

-- Fonction pour retourner du stock d'un livreur vers la boutique
CREATE OR REPLACE FUNCTION public.transfer_stock_from_delivery(
  p_delivery_person_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_performed_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_stock INTEGER;
BEGIN
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
  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;

  -- Enregistrer le mouvement
  INSERT INTO stock_movements (delivery_person_id, product_id, quantity, movement_type, performed_by, notes)
  VALUES (p_delivery_person_id, p_product_id, -p_quantity, 'transfer_from_delivery', p_performed_by, 'Retour livreur -> boutique');

  RETURN json_build_object('success', true);
END;
$$;

-- Trigger pour déduire automatiquement le stock livreur lors d'une livraison
CREATE OR REPLACE FUNCTION public.deduct_delivery_stock_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la commande passe en "delivered" et a un livreur assigné
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.delivery_person_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
    -- Déduire du stock livreur
    UPDATE delivery_person_stock 
    SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = now()
    WHERE delivery_person_id = NEW.delivery_person_id AND product_id = NEW.product_id;

    -- Enregistrer le mouvement
    INSERT INTO stock_movements (delivery_person_id, product_id, quantity, movement_type, reference_id, notes)
    VALUES (NEW.delivery_person_id, NEW.product_id, -NEW.quantity, 'sale', NEW.id, 'Vente/Livraison');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER deduct_delivery_stock_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_delivery_stock_on_sale();

-- Enable realtime for stock tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_person_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;