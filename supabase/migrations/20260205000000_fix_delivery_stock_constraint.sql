-- Fix "no unique or exclusion constraint matching the ON CONFLICT specification" error
-- This ensures the delivery_person_stock table has the required unique constraint for upsert operations

DO $$
BEGIN
    -- 1. Cleanup duplicates if any exist (keeping the one with the highest ID)
    DELETE FROM public.delivery_person_stock a
    USING public.delivery_person_stock b
    WHERE a.id < b.id
      AND a.delivery_person_id = b.delivery_person_id
      AND a.product_id = b.product_id;

    -- 2. Drop potential existing index or constraint to ensure clean state
    DROP INDEX IF EXISTS public.delivery_person_stock_delivery_person_id_product_id_key;
    ALTER TABLE public.delivery_person_stock DROP CONSTRAINT IF EXISTS delivery_person_stock_delivery_person_id_product_id_key;

    -- 3. Add the unique constraint explicitly
    ALTER TABLE public.delivery_person_stock
    ADD CONSTRAINT delivery_person_stock_delivery_person_id_product_id_key
    UNIQUE (delivery_person_id, product_id);

END $$;
