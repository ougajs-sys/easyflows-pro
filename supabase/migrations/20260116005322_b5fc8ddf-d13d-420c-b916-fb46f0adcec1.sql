-- Fix stock execution error (ON CONFLICT) by ensuring a unique index exists for delivery_person_stock
CREATE UNIQUE INDEX IF NOT EXISTS delivery_person_stock_delivery_person_id_product_id_key
  ON public.delivery_person_stock (delivery_person_id, product_id);

-- Allow call center (appelant) users to update order status even when created_by is NULL (ex: orders created via webhook/embed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'orders'
      AND policyname = 'Appelants can update orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Appelants can update orders" ON public.orders FOR UPDATE USING (has_role(auth.uid(), ''appelant''::app_role))';
  END IF;
END
$$;