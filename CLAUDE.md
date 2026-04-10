# Social Media Agent – Vital Growth

## Projektübersicht
Automatisierter Social Media Agent der KI-generierten Content (Text + Bild) plant, verwaltet und auf Facebook & Instagram veröffentlicht.

- **Frontend:** React 18 + TypeScript + Vite
- **Backend-Automation:** N8N Workflow (Self-Hosted auf Hostinger VPS)
- **Datenbank & Storage:** Supabase (PostgreSQL + Blob Storage)
- **KI Text:** Claude Sonnet 4.5 (Anthropic API via N8N)
- **KI Bild:** Flux 1.1 Pro (Replicate API via N8N) + Bria AI (Produktfotografie)
- **Publishing:** Facebook Graph API v19.0 (Facebook + Instagram)

---

## Projektstruktur

```
/src
  App.tsx
  App.css
  supabaseClient.ts
  env.d.ts
  /types
    index.ts              # Config, Post, Product, ProductImage, ToastData, PostEngagement
  /constants
    index.ts              # Webhooks, DEFAULT_CONFIG, CHART_COLORS, WEEKDAYS, IMAGE_MODES
  /components
    LoginScreen.tsx
    Sidebar.tsx
    StatCard.tsx
    Dashboard.tsx
    ContentPlanning.tsx
    Settings.tsx
    ProductManager.tsx    # Bild-Upload, Verarbeitung (Freistellen/Hintergrund), Modus-Auswahl
    Analytics.tsx
    Toast.tsx
    WebhookStatus.tsx
    PostPreviewModal.tsx
/n8n
  workflow.json
.env
```

---

## Umgebungsvariablen (.env)

```env
VITE_SUPABASE_URL=https://iosuxvmkcmgenesirlfb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_WEBHOOK_REGEN_TEXT=<n8n webhook url>/regenerate-text
VITE_WEBHOOK_REGEN_IMAGE=<n8n webhook url>/regenerate-image
VITE_WEBHOOK_TRIGGER_PLAN=<n8n webhook url>/trigger-planning
VITE_WEBHOOK_PUBLISH_POST=<n8n webhook url>/publish-post
VITE_WEBHOOK_ENGAGEMENT=<n8n webhook url>/trigger-engagement
VITE_WEBHOOK_SCRAPE=<n8n webhook url>/scrape-website
VITE_WEBHOOK_PROCESS_IMAGE=<n8n webhook url>/process-product-image
```

---

## Supabase Tabellen

### `posts`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| content | text | Post-Text |
| status | text | `scheduled` / `posted` |
| platform | text | `Facebook & Instagram` |
| image_url | text | Public URL aus Supabase Storage |
| scheduled_at | timestamptz | Geplanter Veröffentlichungszeitpunkt |
| created_at | timestamptz | Erstellungsdatum |
| engagement | jsonb | `{likes, comments, shares}` |
| config_snapshot | jsonb | Einstellungen zum Zeitpunkt der Erstellung |
| fb_post_id | text | Facebook Post ID |
| ig_post_id | text | Instagram Post ID |
| engagement_updated_at | timestamptz | Letztes Engagement-Update |
| post_type | text | `spotlight` / `trend` / `knowledge` / `story` / `tip` |
| product_id | uuid | Referenz auf products.id (nullable) |

### `config`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| user_id | text | `admin` |
| topic | text | Unternehmensbeschreibung |
| brand_keywords | text | USPs, Werte, Besonderheiten |
| website_url | text | URL der Unternehmenswebsite |
| brand_context | text | Automatisch extrahierter Website-Text |
| brand_context_updated_at | timestamptz | Letztes Scraping |
| style_mode | text | `auto` / `manual` |
| tonality | text | `professional` / `casual` / `humorous` / `inspirational` |
| target_audience | text | `b2b` / `b2c` / `mixed` |
| age_range | jsonb | `{min, max}` |
| language | text | `de` / `en` |
| emoji_usage | text | `none` / `minimal` / `moderate` / `extensive` |
| hashtags | text[] | Globale Hashtags |
| text_length | int | 0–100 |
| post_frequency | int | Anzahl Posts |
| post_frequency_unit | text | `week` / `day` |
| publish_window | jsonb | `{start, end}` |
| image_style | text | `realistic` / `comic` / `art` / `fantasy` |
| image_prompt | text | Eigener Bildprompt (leer = automatisch) |
| enabled_post_types | text[] | Aktivierte Post-Typen |
| style_overrides | jsonb | Pro Stil-Option `auto`/`manual` |
| image_fallback_mode | text | Globaler Fallback-Modus (default: `ai_generated`) |

### `products`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| user_id | text | `admin` |
| name | text | Produktname |
| description | text | Kurzbeschreibung für LLM-Kontext |
| tags | text[] | Produkt-spezifische Hashtags |
| image_mode | text | Standard-Bildmodus für dieses Produkt |
| created_at | timestamptz | Erstellungsdatum |

### `product_images`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| product_id | uuid | Referenz auf products.id (cascade delete) |
| user_id | text | `admin` |
| original_url | text | URL des originalen hochgeladenen Bildes |
| processed_url | text | URL des verarbeiteten Bildes (nullable) |
| mode | text | `original` / `removed_bg` / `replaced_bg` / `ai_generated` |
| processing_status | text | `pending` / `processing` / `done` / `error` |
| created_at | timestamptz | Erstellungsdatum |

### `bot_status`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| is_active | boolean | Bot ein/aus |
| updated_at | timestamptz | Letztes Update |

### Supabase Storage Buckets
- **`social-media-images`** (public) – generierte Post-Bilder
- **`product-images`** (public, MIME: image/jpeg, image/png, image/webp) – Produktfotos

### RLS Policies
```sql
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for product_images" ON product_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Allow upload product-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Allow delete product-images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
```

---

## Bildmodi – Übersicht

| Modus | Key | Beschreibung | API |
|-------|-----|--------------|-----|
| Original | `original` | Produktbild direkt verwenden | – |
| Freigestellt | `removed_bg` | Hintergrund entfernt → transparentes PNG | `lucataco/remove-bg` |
| KI-Hintergrund | `replaced_bg` | Freistellen + KI-Hintergrund + Schatten | `bria/generate-background` |
| KI-generiert | `ai_generated` | Flux generiert frei aus Produktbeschreibung | `flux-1.1-pro` |

**Logik im Content Planer (nur bei Spotlight):**
1. Produkt hat Bilder mit `processing_status = done` → verwende `processed_url` gemäß `image_mode` (Fallback: `original_url`)
2. Bildauswahl: Bevorzugt Bild mit `mode` = Produkt-`image_mode`, sonst erstes verfügbares
3. Keine Bilder → Flux generiert frei aus Produktbeschreibung
4. Nicht-Spotlight-Posts → immer Flux (kein Produktbild)

---

## N8N Workflow – Architektur

### Instanz & API
- **URL:** `https://n8n.srv1274405.hstgr.cloud`
- **Workflow-ID:** `-k-9TfqEfximpwRITU63T`
- **API:** `PUT /api/v1/workflows/{id}` für Updates (UI-Import übernimmt Connections nicht zuverlässig)

### 7 Trigger-Pfade
1. Content Planer (stündlich + manuell)
2. Text regenerieren (`/regenerate-text`)
3. Bild regenerieren (`/regenerate-image`)
4. Auto Publisher (`/publish-post`)
5. Engagement Tracker (`/trigger-engagement`)
6. Website Scraper (`/scrape-website`)
7. Produktbild verarbeiten (`/process-product-image`)

### Datenfluss Content Planer
```
Config Parser (Plan) → Geplante Posts zaehlen ──┐
Config Parser (Plan) → Produkte laden ───────────┤→ Merge Posts+Produkte ──┐
                                                 │                         ├→ Merge Alle Daten → Pruefen und Planen
Config Parser (Plan) → Produktbilder laden (alle) ─────────────────────────┘
```
- **Code-Node Sandbox:** `fetch()`, `require()` NICHT verfügbar – Daten müssen über Merge-Nodes fließen
- **Item-Trennung in Pruefen und Planen:** `$input.all()` wird nach Feldern gefiltert (Produkte: `name`, Bilder: `product_id`, Posts: `scheduled_at`)
- **Produkte nur für Spotlight:** Nur Post-Typ `spotlight` bekommt ein Produkt + Produktbild zugewiesen
- **1 Post pro Trigger:** Es wird immer genau 1 Post generiert (max. 3 in Queue)

### Webhook `/process-product-image`
```
Payload: { productImageId, mode, backgroundPrompt? }
→ Router nach mode: original / removed_bg / replaced_bg / ai_generated
→ Supabase PATCH: processed_url + processing_status = 'done'
→ Response: { success, processed_url }
```

**Für mode `ai_generated` (NEU im N8N-Workflow ergänzen):**
```
→ Produkt-Daten laden (name, description, brand_keywords aus config)
→ Prompt bauen:
  "Professional product photography of [product.name].
   [product.description]. [brand_keywords].
   Clean commercial style, high quality, [image_style from config]."
→ Flux 1.1 Pro generieren
→ Supabase Storage Upload (product-images bucket)
→ Supabase PATCH: processed_url, processing_status = 'done'
   (original_url = processed_url da kein Upload, nur URL setzen)
```

### Replicate API – Wichtige Hinweise
- `lucataco/remove-bg` → `/v1/predictions` mit `version` (NICHT `/v1/models/...`)
- `bria/generate-background` → `/v1/models/bria/.../predictions`
- `flux-1.1-pro` → `/v1/models/black-forest-labs/flux-1.1-pro/predictions`
- Rate-Limit bei < $5 Guthaben → Waits nötig (20s Code-Nodes bereits eingebaut)

### Webhook-Tabelle

| Aktion | Payload | Response |
|--------|---------|----------|
| Post generieren (1 Stück) | `{manual: true}` | HTTP 200 |
| Text neu | `{postId}` | `{success, content}` |
| Bild neu | `{postId}` | `{success, imageUrl}` |
| Sofort posten | `{postId}` | HTTP 200 |
| Engagement | `{manual: true}` | HTTP 200 |
| Website scrapen | `{url, userId}` | `{success, brand_context}` |
| Produktbild verarbeiten | `{productImageId, mode, backgroundPrompt?}` | `{success, processed_url}` |

---

## Aktueller Stand (Stand: April 2026)

### ✅ Fertig
- Frontend komplett (Login, Dashboard, Content-Planung, Settings, Analytics)
- Supabase Auth Login + Registrierung
- Dark Mode
- Refactoring App.tsx → 11 Komponenten-Dateien
- Webhook-Status-Anzeige
- Kalender-View interaktiv
- Post-Vorschau Mockup (Facebook + Instagram)
- Kachel-Paginierung
- Settings Redesign (3 Tabs)
- Knowledge Base (Website-URL Scraping)
- Produkt-Portfolio (CRUD) mit "Nächster"-Badge (wie Content-Varianten)
- Content-Varianten (5 Post-Typen, Rotation)
- Individuelle Stiloptionen (styleOverrides)
- N8N: 7 Pfade inkl. Scraper + Produktbild-Verarbeitung
- N8N: Post-Typ-Rotation + Produkt-Rotation (nur Spotlight) + erweiterter Prompt
- N8N: Merge-Nodes für zuverlässigen Datenfluss (Posts + Produkte + Bilder)
- N8N: Multi-Item-Processing korrekt (Index-Matching in Text/Bild parsen)
- N8N: Workflow-Updates via REST API (UI-Import unzuverlässig für Connections)
- Kontextbezogene Bildgenerierung
- Produktbilder: Upload, Verarbeitung (Freistellen + Hintergrund), Modus-Auswahl
- Produktbild-Auswahl nach `image_mode` + `processed_url` Fallback
- Bria AI Integration
- Abbrechen-Button für Upload/Verarbeitung im ProductManager
- Aufklapp-Schaltfläche mit Text statt Pfeil
- Speichern-Buttons einheitlich benannt ("Einstellungen speichern")
- Bildmodus-Kennzeichnung pro Bild (Badge immer sichtbar)
- Fallback-Sektion vereinfacht (nur Info-Text)
- KI-Bild direkt im ProductManager generierbar
- Content-Planung: 1 Post pro Klick (statt 3), einzelne Kachel-Generierung mit Spinner
- Content-Planung: Globale Sperre bei Text/Bild-Regenerierung (Replicate Rate-Limit)
- Content-Planung: Leere Kacheln zeigen Lock-State während Generierung
- Produkt-Bearbeitungsformular über der Liste (statt darunter)

### 📋 Geplant
- A/B Testing

### 💡 Vor Verkauf umsetzen: Multi-Tenancy
Jeder Kunde bekommt eine eigene N8N-Instanz. Damit das Frontend die richtige Instanz anspricht:
1. Neue Spalte `webhook_base_url` in `config`-Tabelle (z.B. `https://n8n-kunde1.example.com/webhook`)
2. Frontend liest Base-URL dynamisch aus Config statt aus `VITE_`-Env-Variablen
3. Alle Webhook-Calls nutzen `config.webhookBaseUrl + '/trigger-planning'` etc.
4. Ein einziges Frontend-Build für alle Kunden, RLS via `user_id` trennt die Daten

---

## Bekannte Schwachstellen
1. ~~Login hardcoded~~ → Supabase Auth
2. N8N Credentials hardcoded – workflow.json in .gitignore
3. ~~Flux NSFW-Filter~~ → Bildprompt basiert auf Post-Text + brand_keywords
4. Replicate Rate-Limit bei < $5 Guthaben – Waits im Workflow nötig

---

## Entwicklungs-Workflow
```bash
npm run dev
npm run build
npm run preview
```
