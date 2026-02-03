-- Corriger la fonction check_stock_alerts pour utiliser INSERT/UPDATE explicite
-- au lieu de ON CONFLICT qui ne fonctionne pas avec les index partiels

CREATE OR REPLACE FUNCTION public.check_stock_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_threshold RECORD;
  v_severity varchar;
  v_existing_alert_id uuid;
BEGIN
  -- Verifier le stock principal (warehouse)
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
      
      -- Chercher une alerte existante pour warehouse
      SELECT id INTO v_existing_alert_id
      FROM stock_alerts
      WHERE product_id = NEW.id 
        AND alert_type = 'warehouse'
        AND delivery_person_id IS NULL;
      
      IF v_existing_alert_id IS NOT NULL THEN
        -- Mettre a jour l'alerte existante
        UPDATE stock_alerts
        SET current_quantity = NEW.stock,
            severity = v_severity,
            updated_at = now()
        WHERE id = v_existing_alert_id;
      ELSE
        -- Creer une nouvelle alerte
        INSERT INTO stock_alerts (product_id, alert_type, threshold, current_quantity, severity)
        VALUES (NEW.id, 'warehouse', v_threshold.warning_threshold, NEW.stock, v_severity);
      END IF;
    END IF;
  END IF;
  
  -- Verifier le stock livreur
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
      
      -- Chercher une alerte existante pour ce livreur
      SELECT id INTO v_existing_alert_id
      FROM stock_alerts
      WHERE product_id = NEW.product_id 
        AND alert_type = 'delivery_person'
        AND delivery_person_id = NEW.delivery_person_id;
      
      IF v_existing_alert_id IS NOT NULL THEN
        -- Mettre a jour l'alerte existante
        UPDATE stock_alerts
        SET current_quantity = NEW.quantity,
            severity = v_severity,
            updated_at = now()
        WHERE id = v_existing_alert_id;
      ELSE
        -- Creer une nouvelle alerte
        INSERT INTO stock_alerts (product_id, alert_type, delivery_person_id, threshold, current_quantity, severity)
        VALUES (NEW.product_id, 'delivery_person', NEW.delivery_person_id, v_threshold.warning_threshold, NEW.quantity, v_severity);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;