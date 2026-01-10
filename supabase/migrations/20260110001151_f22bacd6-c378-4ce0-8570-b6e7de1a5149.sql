-- Table des alertes de stock
CREATE TABLE public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  alert_type varchar NOT NULL CHECK (alert_type IN ('warehouse', 'delivery_person')),
  delivery_person_id uuid REFERENCES public.delivery_persons(id) ON DELETE CASCADE,
  threshold integer NOT NULL DEFAULT 10,
  current_quantity integer NOT NULL DEFAULT 0,
  severity varchar NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table des demandes d'approvisionnement
CREATE TABLE public.supply_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid NOT NULL,
  requester_type varchar NOT NULL CHECK (requester_type IN ('warehouse', 'delivery_person')),
  delivery_person_id uuid REFERENCES public.delivery_persons(id) ON DELETE CASCADE,
  quantity_requested integer NOT NULL,
  quantity_approved integer,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  reason text,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  fulfilled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Configuration des seuils d'alerte
CREATE TABLE public.stock_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  location_type varchar NOT NULL CHECK (location_type IN ('warehouse', 'delivery_person')),
  warning_threshold integer NOT NULL DEFAULT 10,
  critical_threshold integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_type)
);

-- RLS pour stock_alerts
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and supervisors can view all alerts"
ON public.stock_alerts FOR SELECT
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

CREATE POLICY "Delivery persons can view own alerts"
ON public.stock_alerts FOR SELECT
USING (delivery_person_id IN (
  SELECT id FROM delivery_persons WHERE user_id = auth.uid()
));

CREATE POLICY "System can create alerts"
ON public.stock_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage alerts"
ON public.stock_alerts FOR ALL
USING (has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Supervisors can update alerts"
ON public.stock_alerts FOR UPDATE
USING (has_role(auth.uid(), 'superviseur'));

-- RLS pour supply_requests
ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and supervisors can view all requests"
ON public.supply_requests FOR SELECT
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

CREATE POLICY "Users can view own requests"
ON public.supply_requests FOR SELECT
USING (requested_by = auth.uid());

CREATE POLICY "Delivery persons can view own requests"
ON public.supply_requests FOR SELECT
USING (delivery_person_id IN (
  SELECT id FROM delivery_persons WHERE user_id = auth.uid()
));

CREATE POLICY "Authenticated users can create requests"
ON public.supply_requests FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and supervisors can update requests"
ON public.supply_requests FOR UPDATE
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'superviseur'));

CREATE POLICY "Users can update own pending requests"
ON public.supply_requests FOR UPDATE
USING (requested_by = auth.uid() AND status = 'pending');

-- RLS pour stock_thresholds
ALTER TABLE public.stock_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage thresholds"
ON public.stock_thresholds FOR ALL
USING (has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Everyone can view thresholds"
ON public.stock_thresholds FOR SELECT
USING (true);

-- Fonction pour vérifier et créer des alertes automatiquement
CREATE OR REPLACE FUNCTION public.check_stock_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold RECORD;
  v_severity varchar;
BEGIN
  -- Vérifier le stock principal (warehouse)
  IF TG_TABLE_NAME = 'products' THEN
    SELECT * INTO v_threshold
    FROM stock_thresholds
    WHERE product_id = NEW.id AND location_type = 'warehouse';
    
    IF FOUND THEN
      IF NEW.stock <= v_threshold.critical_threshold THEN
        v_severity := 'critical';
      ELSIF NEW.stock <= v_threshold.warning_threshold THEN
        v_severity := 'warning';
      ELSE
        -- Stock OK, supprimer l'alerte existante
        DELETE FROM stock_alerts 
        WHERE product_id = NEW.id 
          AND alert_type = 'warehouse' 
          AND is_acknowledged = false;
        RETURN NEW;
      END IF;
      
      -- Créer ou mettre à jour l'alerte
      INSERT INTO stock_alerts (product_id, alert_type, threshold, current_quantity, severity)
      VALUES (NEW.id, 'warehouse', v_threshold.warning_threshold, NEW.stock, v_severity)
      ON CONFLICT (product_id, alert_type) WHERE delivery_person_id IS NULL
      DO UPDATE SET 
        current_quantity = EXCLUDED.current_quantity,
        severity = EXCLUDED.severity,
        updated_at = now();
    END IF;
  END IF;
  
  -- Vérifier le stock livreur
  IF TG_TABLE_NAME = 'delivery_person_stock' THEN
    SELECT * INTO v_threshold
    FROM stock_thresholds
    WHERE product_id = NEW.product_id AND location_type = 'delivery_person';
    
    IF FOUND THEN
      IF NEW.quantity <= v_threshold.critical_threshold THEN
        v_severity := 'critical';
      ELSIF NEW.quantity <= v_threshold.warning_threshold THEN
        v_severity := 'warning';
      ELSE
        -- Stock OK, supprimer l'alerte existante
        DELETE FROM stock_alerts 
        WHERE product_id = NEW.product_id 
          AND delivery_person_id = NEW.delivery_person_id 
          AND is_acknowledged = false;
        RETURN NEW;
      END IF;
      
      -- Créer ou mettre à jour l'alerte
      INSERT INTO stock_alerts (product_id, alert_type, delivery_person_id, threshold, current_quantity, severity)
      VALUES (NEW.product_id, 'delivery_person', NEW.delivery_person_id, v_threshold.warning_threshold, NEW.quantity, v_severity)
      ON CONFLICT (product_id, alert_type, delivery_person_id)
      DO UPDATE SET 
        current_quantity = EXCLUDED.current_quantity,
        severity = EXCLUDED.severity,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer un index unique partiel pour les alertes warehouse
CREATE UNIQUE INDEX stock_alerts_warehouse_unique 
ON stock_alerts (product_id, alert_type) 
WHERE delivery_person_id IS NULL;

-- Créer un index unique pour les alertes delivery person
CREATE UNIQUE INDEX stock_alerts_delivery_unique 
ON stock_alerts (product_id, alert_type, delivery_person_id) 
WHERE delivery_person_id IS NOT NULL;

-- Triggers pour vérifier les alertes
CREATE TRIGGER check_product_stock_alerts
AFTER INSERT OR UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION check_stock_alerts();

CREATE TRIGGER check_delivery_stock_alerts
AFTER INSERT OR UPDATE OF quantity ON delivery_person_stock
FOR EACH ROW
EXECUTE FUNCTION check_stock_alerts();

-- Activer realtime
ALTER PUBLICATION supabase_realtime ADD TABLE stock_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE supply_requests;

-- Insérer des seuils par défaut pour les produits existants
INSERT INTO stock_thresholds (product_id, location_type, warning_threshold, critical_threshold)
SELECT id, 'warehouse', 10, 5 FROM products
ON CONFLICT DO NOTHING;

INSERT INTO stock_thresholds (product_id, location_type, warning_threshold, critical_threshold)
SELECT id, 'delivery_person', 5, 2 FROM products
ON CONFLICT DO NOTHING;