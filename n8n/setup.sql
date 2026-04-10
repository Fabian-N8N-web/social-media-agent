-- ============================================
-- Produktbilder Feature - Supabase SQL Setup
-- ============================================

-- 1. Neue Tabelle: product_images
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id text NOT NULL DEFAULT 'admin',
  original_url text NOT NULL,
  processed_url text,
  mode text NOT NULL DEFAULT 'original',
  processing_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 2. products: image_mode Spalte ergaenzen
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_mode text DEFAULT 'ai_generated';

-- 3. config: image_fallback_mode ergaenzen
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS image_fallback_mode text DEFAULT 'ai_generated';

-- 4. RLS Policies fuer product_images (analog zu products)
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON product_images
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Index fuer schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_product_images_product_id
  ON product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_status
  ON product_images(processing_status);
