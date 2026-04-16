-- ============================================
-- Onboarding-Wizard Feature
-- ============================================

-- config: setup_completed Flag fuer Onboarding-Wizard
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS setup_completed boolean DEFAULT false;

-- Bestehende Zeile (admin) direkt auf true setzen, damit Wizard nicht sofort
-- erscheint. Neustart jederzeit via Einstellungen -> "Setup neu starten".
UPDATE config
  SET setup_completed = true
  WHERE user_id = 'admin' AND setup_completed IS NOT true;

-- ============================================
-- Publish-Plattform-Schalter
-- ============================================

-- config: publish_platform steuert ob Posts auf FB, IG oder beide gehen
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS publish_platform text DEFAULT 'both';

-- ============================================
-- Business-Typ & Branche
-- ============================================

-- config: business_type unterscheidet Produkt-, Dienstleistungs- oder Misch-Unternehmen
-- und bestimmt UI-Labels + Bildprompt-Kontext (z.B. PPE für Handwerk)
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'products';

-- Freitext fuer die Branche, z.B. "Dachdeckerei & Fertighausbau", "Gastronomie"
-- Wird in Bild-Prompts eingefuegt, damit Arbeitskleidung / Setting / Safety Gear passen
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS industry text DEFAULT '';

-- ============================================
-- Produkt / Dienstleistung-Kennzeichnung (mixed-Business-Typ)
-- ============================================
-- products.entry_type: 'product' | 'service'
-- NULL = automatisch aus business_type abgeleitet (services → service, sonst product)
-- Bei business_type = 'mixed' waehlt der User explizit pro Eintrag.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS entry_type text;

-- ============================================
-- Zwei Bildmodelle (Menschen vs Szenen) - Auto-Wahl pro Post
-- ============================================
-- config.image_models: { "people": "<replicate-slug>", "scene": "<replicate-slug>" }
-- Claude liefert scene_type ('people' | 'scene') pro Post; der Workflow waehlt
-- automatisch das passende Modell. Standard: Imagen 4 fuer Menschen, Flux Ultra fuer Szenen.
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS image_models jsonb
  DEFAULT '{"people": "google/imagen-4", "scene": "black-forest-labs/flux-1.1-pro-ultra"}'::jsonb;

-- Bestehende Zeilen mit Default befuellen
UPDATE config
  SET image_models = '{"people": "google/imagen-4", "scene": "black-forest-labs/flux-1.1-pro-ultra"}'::jsonb
  WHERE image_models IS NULL;

-- ============================================
-- Anti-Wiederholungs-Kontext: image_concept persistieren
-- ============================================
-- posts.image_concept: Claudes Bildbeschreibung pro Post speichern,
-- damit folgende Posts desselben Typs andere Bildszenen waehlen koennen.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS image_concept text;
