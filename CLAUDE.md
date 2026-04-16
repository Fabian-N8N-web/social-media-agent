# Social Media Agent – Vital Growth

## Projektübersicht
Automatisierter Social Media Agent der KI-generierten Content (Text + Bild) plant, verwaltet und auf Facebook & Instagram veröffentlicht.

- **Frontend:** React 18 + TypeScript + Vite
- **Backend-Automation:** N8N Workflow (Self-Hosted auf Hostinger VPS)
- **Datenbank & Storage:** Supabase (PostgreSQL + Blob Storage)
- **KI Text:** Claude Sonnet 4.5 (Anthropic API via N8N)
- **KI Bild:** Dual-Model-Routing auf Replicate – Auto-Wahl nach `scene_type`:
  - `people` → Google Imagen 4 (Default)
  - `scene` → Flux 1.1 Pro Ultra mit `raw: true` (Default)
  - Alternative Modelle: Ideogram v3 Turbo, Flux 1.1 Pro klassisch
  - + Bria AI (Produktfotografie-Hintergrund) + Flux 1.1 Pro (img2img)
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
    index.ts              # Config, Post, Product, ProductImage, ToastData, PostEngagement, BusinessType
  /constants
    index.ts              # Webhooks, DEFAULT_CONFIG, CHART_COLORS, WEEKDAYS, IMAGE_MODES
  /components
    LoginScreen.tsx
    Sidebar.tsx
    StatCard.tsx
    Dashboard.tsx
    ContentPlanning.tsx
    Settings.tsx           # 3 Tabs: business / content / schedule; Toolbar (Refresh/Save/Restart-Wizard)
    ProductManager.tsx     # Bild-Upload, Verarbeitung (Freistellen/Hintergrund), Modus-Auswahl, adaptive Labels
    OnboardingWizard.tsx   # 4-Schritt Wizard: Unternehmen → Website → Produkt → Content-Varianten
    Analytics.tsx
    Toast.tsx
    WebhookStatus.tsx
    PostPreviewModal.tsx   # Nur Facebook-Mockup (Instagram entfernt)
/n8n
  workflow.json
  add_style_path.mjs
  patch_industry_context.mjs
  setup.sql
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
VITE_WEBHOOK_GENERATE_STYLE=<n8n webhook url>/generate-style-suggestions
```

---

## Supabase Tabellen

### `posts`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| content | text | Post-Text |
| image_concept | text | Claudes Bildbeschreibung (für Anti-Wiederholungs-Kontext) |
| status | text | `scheduled` / `posted` |
| platform | text | `Facebook & Instagram` |
| image_url | text | Public URL aus Supabase Storage |
| scheduled_at | timestamptz | Geplanter Veröffentlichungszeitpunkt |
| created_at | timestamptz | Erstellungsdatum |
| engagement | jsonb | `{likes, comments, shares}` |
| config_snapshot | jsonb | Einstellungen zum Zeitpunkt der Erstellung (inkl. `scene_type`) |
| fb_post_id | text | Facebook Post ID |
| ig_post_id | text | Instagram Post ID |
| engagement_updated_at | timestamptz | Letztes Engagement-Update |
| post_type | text | `trend` / `knowledge` / `story` / `tip` / `spotlight` |
| product_id | uuid | Referenz auf products.id (nullable) |

### `config`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| user_id | text | `admin` |
| topic | text | Unternehmensbeschreibung |
| business_type | text | `products` / `services` / `mixed` |
| industry | text | Freitext Branche |
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
| publish_platform | text | `both` / `facebook` / `instagram` |
| image_style | text | `realistic` / `comic` / `art` / `fantasy` |
| image_prompt | text | Eigener Bildprompt (leer = automatisch) |
| enabled_post_types | text[] | Aktivierte Post-Typen |
| style_overrides | jsonb | Pro Stil-Option `auto`/`manual` |
| image_fallback_mode | text | Globaler Fallback-Modus (default: `ai_generated`) |
| setup_completed | boolean | Onboarding-Wizard abgeschlossen |
| image_models | jsonb | `{"people": "<slug>", "scene": "<slug>"}` |

### `products`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| user_id | text | `admin` |
| name | text | Produktname |
| description | text | Kurzbeschreibung für LLM-Kontext |
| tags | text[] | Produkt-spezifische Hashtags |
| image_mode | text | Standard-Bildmodus |
| entry_type | text | `product` / `service` / NULL |
| created_at | timestamptz | Erstellungsdatum |

### `product_images`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| product_id | uuid | Referenz auf products.id (cascade delete) |
| user_id | text | `admin` |
| original_url | text | URL des originalen Bildes |
| processed_url | text | URL des verarbeiteten Bildes (nullable) |
| mode | text | `original` / `removed_bg` / `replaced_bg` / `ai_generated` |
| processing_status | text | `pending` / `processing` / `done` / `error` |
| created_at | timestamptz | Erstellungsdatum |

### `bot_status`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| is_active | boolean | Bot ein/aus |
| updated_at | timestamptz | Letztes Update |

---

## N8N Workflow – Architektur

### Instanz & API
- **URL:** `https://n8n.srv1274405.hstgr.cloud`
- **Workflow-ID:** `-k-9TfqEfximpwRITU63T`
- **API:** `PUT /api/v1/workflows/{id}` für Updates

### 8 Trigger-Pfade
1. Content Planer (stündlich + manuell)
2. Text regenerieren (`/regenerate-text`)
3. Bild regenerieren (`/regenerate-image`)
4. Auto Publisher (`/publish-post`)
5. Engagement Tracker (`/trigger-engagement`)
6. Website Scraper (`/scrape-website`)
7. Produktbild verarbeiten (`/process-product-image`)
8. Style-Vorschläge generieren (`/generate-style-suggestions`)

---

## Content-Generierung – Detaillierter Ablauf

### Schritt 1: Post-Typ & Timing bestimmen (`Pruefen und Planen`)

**Rotationsreihenfolge:** `['trend', 'knowledge', 'story', 'tip', 'spotlight']` – Spotlight kommt bewusst zuletzt, damit neue Nutzer Zeit haben Produkte einzupflegen.

**Rotationslogik:**
1. Letzter Typ aus **scheduled** Posts (nach `scheduled_at` sortiert)
2. Fallback wenn Queue leer: letzter **geposteter** Post (nach `created_at` sortiert)
3. Wenn gar keine Posts existieren → Index 0 (`trend`)

**Max Queue:** 5 Posts (Frontend umschaltbar zwischen 3 und 5 Slots).

**Timing:** Nächster Slot = letzter `scheduled_at` + `intervalDays`. Uhrzeit = Zufall innerhalb `publish_window`.

### Schritt 2: Text-Prompt an Claude bauen

Der Prompt wird aus folgenden Quellen zusammengesetzt:

| Abschnitt | Quelle |
|-----------|--------|
| UNTERNEHMEN | `config.topic` |
| MARKEN-KONTEXT (Website) | `config.brand_context` (gescrapte Website) |
| USPs & BESONDERHEITEN | `config.brand_keywords` |
| LETZTE POSTS DIESES TYPS | Letzte 4 gepostete Posts gleichen Typs aus DB (Anti-Wiederholung) |
| LETZTE BILDSZENEN | `image_concept` der letzten Posts (für Bildvariation) |
| PRODUKT IM FOKUS | `product.name + .description + .tags` (nur bei Spotlight) |
| POST-TYP | Aus Rotation bestimmt, z.B. "Story / Testimonial" |
| IMAGE RULE | Post-typ-spezifische Bildregeln (siehe unten) |
| STIL | `auto` → Claude wählt selbst; `manual` → aus Config |
| TEXTLÄNGE | `config.text_length` → z.B. "Mittel (3-5 Sätze)" |
| SPRACHE | `config.language` |

**Anti-Wiederholungs-Kontext:**
```
LETZTE POSTS DIESES TYPS (Wiederholungen unbedingt vermeiden):
- [vor 3 Tagen]: "Wusstest du, dass pflanzliche Isoflavone..."
- [vor 7 Tagen]: "Ein spannender Trend: Die natürliche..."
WICHTIG: Wähle eine ANDERE Eröffnung, ein ANDERES Thema und einen ANDEREN Ton.
LETZTE BILDSZENEN (andere Szene wählen): "A serene woman...", "Close-up of natural..."
```

**Claude-Antwortformat:**
```json
{"text": "<Post-Text>", "image_concept": "<EN-Bildbeschreibung>", "scene_type": "people|scene"}
```

### Schritt 3: Post-Typ-spezifische Bildregeln

Claude bekommt pro Post-Typ eigene IMAGE RULES im Prompt:

| Typ | `scene_type` | Kernregel |
|-----|-------------|-----------|
| **story** | MUSS `people` | Authentische Person in privatem Moment (lesen, Natur, Fenster). Kein Produkt, keine Teetassen. Setting variieren. |
| **tip** | Bevorzugt `scene` | Ergebnis/Kontext des Tipps zeigen. Menschen dürfen gelegentlich vorkommen, Fokus auf Konzept. |
| **trend** | Bevorzugt `scene` | Editorial, atmosphärisch, Magazin-Stil. Menschen dürfen vorkommen wenn thematisch passend. |
| **knowledge** | Bevorzugt `scene` | Visuelles Metapher, Close-ups, Flat-Lays. Menschen dürfen gelegentlich als Teil der Szene vorkommen. |
| **spotlight** | MUSS `scene` | Produkt als visueller Held. Personen nur im Hintergrund. Kein Halten/Präsentieren. |

### Schritt 4: Claude-Response parsen (`Text parsen (Plan)`)

1. Code-Fences stripping (` ```json ... ``` `)
2. `{...}`-Block per Regex extrahieren
3. `JSON.parse()` versuchen
4. **Regex-Fallback** bei Parse-Fehler (z.B. unescapte `"` in Story-Zitaten): Felder über Key-Boundaries extrahieren
5. **`scene_type` Override:** Story → `people` erzwungen, Spotlight → `scene` erzwungen
6. Letzter Fallback: Rohtext als Content

### Schritt 5: Bildprompt zusammenbauen

**Style-Varianten-Rotation:** Statt eines festen `styleDesc` rotieren 4 Varianten pro Bildstil (Index = `allPosts.length % 4`):

| Stil | Variante 0 | Variante 1 | Variante 2 | Variante 3 |
|------|-----------|-----------|-----------|-----------|
| realistic | Canon EOS R5, natural light | Leica M10, documentary | Golden hour, cinematic | Overcast, Fujifilm X-T4 |
| comic | Bold outlines, cheerful | Pastel, Scandinavian | Hand-drawn, textured | Minimalist line art |
| art | Impressionist, rich palette | Watercolor, loose strokes | Acrylic, textured canvas | Mixed media collage |
| fantasy | Soft lens flare, dreamy | Volumetric light, epic | Morning mist, enchanted | Surreal dreamscape |

**Bildprompt-Formel (wenn `imageConcept` vorhanden):**
```
{styleDesc}. {imageConcept} Brand: {brandKeywords}. Industry: {industry}. Age: {ageRange}.
No text/words/logos. No writing on clothing. People must not hold/carry/present any product. No floating objects. Safe for work.
```

### Schritt 6: Modell-Routing & Speichern

| `scene_type` | Modell | API-Endpunkt |
|-------------|--------|--------------|
| `people` | Imagen 4 | `/v1/models/google/imagen-4/predictions` |
| `scene` | Flux 1.1 Pro Ultra | `/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions` |

Post wird gespeichert mit: `content`, `image_concept`, `image_url`, `config_snapshot` (inkl. `scene_type`), `post_type`, `product_id`.

### Publish-Pfade

Beide Publish-Nodes (`Post fuer Publish` + `Posts vorbereiten`) haben eine `cleanContent()`-Funktion die JSON-Reste aus dem Content extrahiert bevor er an Facebook gesendet wird.

---

## Frontend – Besonderheiten

### `parsePostContent()` (ContentPlanning.tsx + PostPreviewModal.tsx)
Defensives Parsing: Wenn `post.content` rohes JSON enthält (Code-Fences + JSON-Objekt), wird nur der `text`-Wert extrahiert. Regex-Fallback für Story-Posts mit unescapten Anführungszeichen.

### Content-Planung Features
- **3/5 Slot-Toggle** (localStorage): Wählbar zwischen 3 und 5 Vorschau-Kacheln
- **Auto-Fill bei Bot-Aktivierung:** Beim Einschalten werden fehlende Slots sequenziell generiert
- **"Alle löschen"-Button:** Löscht alle geplanten Posts mit Bestätigungsdialog
- **Agent-Status-Text:** Zeigt bei aktivem Bot einen Hinweis zur automatischen Generierung/Veröffentlichung

---

## Aktueller Stand (Stand: April 2026)

### ✅ Fertig
- Komplettes Frontend (Login, Dashboard, Content-Planung, Settings, Analytics, Onboarding-Wizard)
- Supabase Auth + Dark Mode
- 8 N8N Webhook-Pfade
- Content-Varianten-Rotation (trend → knowledge → story → tip → spotlight)
- Dual-Model-Routing (Imagen 4 / Flux Ultra)
- Post-Typ-spezifische Bildregeln im Claude-Prompt
- scene_type erzwungen für Story (people) und Spotlight (scene)
- Anti-Wiederholungs-Kontext (letzte 4 Posts + Bildszenen im Prompt)
- Style-Varianten-Rotation (4 Varianten pro Bildstil)
- image_concept Persistierung in posts-Tabelle
- Sanitize-Funktion für Unicode-Surrogate im Prompt
- Content-Cleaning in Publish-Nodes (cleanContent)
- Story-JSON-Parse-Fix (Regex-Fallback für unescapte Anführungszeichen)
- Produktbilder: Upload, Freistellen, KI-Hintergrund, KI-generiert
- Business-Typ & Branche, adaptive Labels
- Settings: 3 Tabs, KI-Vorschläge neu generieren
- Plattform-Schalter (both/facebook/instagram)

### 📋 Geplant
- A/B Testing
- Multi-Tenancy (webhook_base_url pro Kunde)

---

## Bekannte Schwachstellen
1. N8N Credentials hardcoded – workflow.json in .gitignore
2. Replicate Rate-Limit bei < $5 Guthaben
3. `brand_context` ist statischer Text-Dump ohne Zusammenfassung
4. Text-Regenerierung (`/regenerate-text`) nutzt vereinfachten Prompt ohne JSON-Format und ohne Anti-Wiederholungs-Kontext
5. `Text parsen (Plan)`: `styleVariantsMap` nur dort, `Image Prompt bauen` (Regenerate-Pfad) hat noch die alte `styleMap`

---

## Entwicklungs-Workflow
```bash
npm run dev
npm run build
npm run preview
```
