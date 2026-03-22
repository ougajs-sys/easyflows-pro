-- Fix the stock deduction trigger to handle ALL delivery scenarios properly
-- Problem: Current trigger only deducts from delivery_person_stock, never from global products.stock
-- This means orders without prior stock transfer or without delivery person never deduct stock

CREATE OR REPLACE FUNCTION public.deduct_delivery_stock_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dp_stock_row RECORD;
  v_dp_had_stock BOOLEAN := false;
BEGIN
  -- Only trigger when status changes TO 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.product_id IS NOT NULL THEN
    
    -- Case 1: Delivery person assigned
    IF NEW.delivery_person_id IS NOT NULL THEN
      -- Check if delivery person has stock for this product
      SELECT * INTO v_dp_stock_row
      FROM delivery_person_stock
      WHERE delivery_person_id = NEW.delivery_person_id 
        AND product_id = NEW.product_id;

      IF FOUND AND v_dp_stock_row.quantity > 0 THEN
        -- Delivery person HAS stock -> deduct from their stock
        -- (global stock was already deducted during transfer_to_delivery)
        v_dp_had_stock := true;
        UPDATE delivery_person_stock 
        SET quantity = GREATEST(0, quantity - NEW.quantity), updated_at = now()
        WHERE delivery_person_id = NEW.delivery_person_id 
          AND product_id = NEW.product_id;
      END IF;

      -- If delivery person did NOT have stock, deduct from global stock
      -- (product was never transferred to this delivery person)
      IF NOT v_dp_had_stock THEN
        UPDATE products 
        SET stock = GREATEST(0, stock - NEW.quantity), updated_at = now()
        WHERE id = NEW.product_id;
      END IF;

      -- Log the stock movement
      INSERT INTO stock_movements (
        delivery_person_id, product_id, quantity, movement_type, reference_id, notes
      ) VALUES (
        NEW.delivery_person_id, NEW.product_id, -NEW.quantity, 'sale', NEW.id, 
        CASE WHEN v_dp_had_stock 
          THEN 'Vente/Livraison (stock livreur)' 
          ELSE 'Vente/Livraison (stock global - pas de transfert prealable)' 
        END
      );

    ELSE
      -- Case 2: No delivery person - deduct directly from global stock
      UPDATE products 
      SET stock = GREATEST(0, stock - NEW.quantity), updated_at = now()
      WHERE id = NEW.product_id;

      -- Log the movement
      INSERT INTO stock_movements (
        product_id, quantity, movement_type, reference_id, notes
      ) VALUES (
        NEW.product_id, -NEW.quantity, 'sale', NEW.id, 'Vente directe (sans livreur)'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;