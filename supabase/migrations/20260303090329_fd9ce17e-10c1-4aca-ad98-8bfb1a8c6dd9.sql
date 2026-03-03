
-- Add landing page columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS landing_headline text,
  ADD COLUMN IF NOT EXISTS landing_description text,
  ADD COLUMN IF NOT EXISTS landing_html text,
  ADD COLUMN IF NOT EXISTS facebook_pixel_id text,
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#2563eb';

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug) WHERE slug IS NOT NULL;

-- Public SELECT policy for landing pages (anon users can view active products with slug)
CREATE POLICY "Public can view landing pages"
  ON public.products
  FOR SELECT
  TO anon
  USING (is_active = true AND slug IS NOT NULL);
