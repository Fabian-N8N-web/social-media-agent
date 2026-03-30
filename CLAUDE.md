# Social Media Agent – Vital Growth

## Projektübersicht
Automatisierter Social Media Agent der KI-generierten Content (Text + Bild) plant, verwaltet und auf Facebook & Instagram veröffentlicht.

- **Frontend:** React 18 + TypeScript + Vite (entwickelt in VS Code)
- **Backend-Automation:** N8N Workflow
- **Datenbank & Storage:** Supabase (PostgreSQL + Blob Storage)
- **KI Text:** Claude Sonnet (Anthropic API via N8N)
- **KI Bild:** Flux 1.1 Pro (Replicate API via N8N)
- **Publishing:** Facebook Graph API v19.0 (Facebook + Instagram)
- **Entwickelt mit:** Claude (claude.ai) für Planung/Architektur + Claude Code (VS Code Terminal) für Implementierung

---

## Projektstruktur

```
/src
  App.tsx              # Haupt-Frontend (1277 Zeilen) – alle UI-Komponenten
  App.css              # Styling (536 Zeilen)
  supabaseClient.ts    # Supabase Service Layer (alle DB/Storage Operationen)
  env.d.ts             # TypeScript Typen für Umgebungsvariablen
/n8n
  workflow.json        # N8N Workflow Export (hier ablegen nach Export)
.env                   # Lokale Umgebungsvariablen (nie committen!)
```

---

## Umgebungsvariablen (.env)

```env
VITE_SUPABASE_URL=https://iosuxvmkcmgenesirlfb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key – NICHT service_role key!>
VITE_WEBHOOK_REGEN_TEXT=<n8n webhook url>/regenerate-text
VITE_WEBHOOK_REGEN_IMAGE=<n8n webhook url>/regenerate-image
VITE_WEBHOOK_TRIGGER_PLAN=<n8n webhook url>/trigger-planning
VITE_WEBHOOK_PUBLISH_POST=<n8n webhook url>/publish-post
VITE_WEBHOOK_ENGAGEMENT=<n8n webhook url>/trigger-engagement
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
| fb_post_id | text | Facebook Post ID nach Veröffentlichung |
| ig_post_id | text | Instagram Post ID nach Veröffentlichung |
| engagement_updated_at | timestamptz | Letztes Engagement-Update |

### `config`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| user_id | text | `admin` (aktuell fest) |
| topic | text | Thema / Themenbeschreibung |
| tonality | text | `professional` / `casual` / `humorous` / `inspirational` |
| target_audience | text | `b2b` / `b2c` / `mixed` |
| language | text | `de` / `en` |
| emoji_usage | text | `none` / `minimal` / `moderate` / `extensive` |
| hashtags | text[] | Array von Hashtags |
| post_frequency | int | Posts pro Woche (1–14) |
| publish_window | jsonb | `{start: "09:00", end: "18:00"}` |
| content_mix | jsonb | `{tips, quotes, products, news}` in % |
| image_prompt | text | Eigener Bildprompt (leer = automatisch) |
| image_style | text | `realistic` / `comic` / `art` / `fantasy` |
| text_length | int | 0–100 (Slider) |
| age_range | jsonb | `{min: 25, max: 55}` |

### `bot_status`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| is_active | boolean | Bot ein/aus |
| updated_at | timestamptz | Letztes Update |

### Supabase Storage
- **Bucket:** `social-media-images` (public)
- Bilder werden von N8N und direkt vom Frontend hochgeladen
- Dateiname-Schema: `post_{timestamp}_{random5chars}.png`

---

## N8N Workflow – Architektur

### 4 Trigger-Pfade

#### 1. Content Planer (stündlich + manuell via Webhook)
```
Trigger → Bot aktiv? → Credentials → Router (plan)
→ Config laden (Supabase) → Config Parser
→ Geplante Posts zählen → Prüfen & Planen (wie viele fehlen bis 3?)
→ Text generieren (Claude Sonnet) → Flux Bild generieren (Replicate)
→ Bild zu Supabase Storage hochladen → Post in DB speichern (status: scheduled)
```
- Hält immer **3 geplante Posts** in der Queue
- Generiert nur fehlende Posts (z.B. nur 1 wenn bereits 2 vorhanden)

#### 2. Text regenerieren (Webhook: `/regenerate-text`)
```
Webhook → Tag regen_text → Credentials → Router
→ Post laden → Config Parser (aus config_snapshot des Posts)
→ Prompt bauen → Claude Sonnet → Supabase PATCH (content)
→ Response ans Frontend
```

#### 3. Bild regenerieren (Webhook: `/regenerate-image`)
```
Webhook → Tag regen_img → Credentials → Router
→ Post laden → Image Prompt bauen
→ Flux 1.1 Pro → Bild laden → Supabase Storage Upload
→ URL generieren → Supabase PATCH (image_url) → Response ans Frontend
```

#### 4. Auto Publisher (stündlich + manuell via Webhook `/publish-post`)
```
Trigger → Bot aktiv? → Credentials → Router (publish / publish_single)
→ Fällige Posts laden (scheduled_at <= jetzt)
→ Facebook posten (Graph API /photos)
→ Instagram: Create Media → Publish
→ Supabase PATCH (status: posted, fb_post_id, ig_post_id)
```

#### 5. Engagement Tracker (alle 2h + Webhook `/trigger-engagement`)
```
Trigger → Credentials → Gepostete Posts laden
→ FB Engagement abfragen (likes, comments, shares)
→ IG Engagement abfragen → mergen
→ Supabase PATCH (engagement, engagement_updated_at)
```

### Wichtige N8N Node-Namen (für Referenzen im Workflow)
- `Credentials` – enthält alle API-Keys (⚠️ aktuell hardcoded)
- `Router` – Switch-Node der nach `action` routet
- `Config Parser (Plan/Text/Bild)` – normalisiert Supabase Config-Antwort
- `Pruefen und Planen` – Kernlogik: berechnet fehlende Posts + Zeitplanung

---

## Frontend-Komponenten

### `App.tsx` – Komponenten-Übersicht

| Komponente | Funktion |
|-----------|----------|
| `LoginScreen` | Einfaches Login (⚠️ Passwörter hardcoded – TODO: Supabase Auth) |
| `Sidebar` | Navigation: Dashboard / Content-Planung / Einstellungen / Analytics |
| `Dashboard` | Statistiken, Bot-Toggle, letzte 6 Posts mit Engagement |
| `ContentPlanning` | 3 Post-Kacheln: Vorschau, Edit, Neu generieren, Sofort posten |
| `Settings` | Alle Config-Felder → schreibt direkt in Supabase |
| `Analytics` | Charts: Engagement über Zeit, Plattform, Wochentag, Top 5 Posts |
| `Toast` | Benachrichtigungen (success/error/info) |

### `supabaseClient.ts` – SupabaseService Methoden
```ts
getPosts()                    // alle Posts
getPostedPosts()              // status = posted
getScheduledPosts()           // status = scheduled, sortiert nach scheduled_at
createPost(post)
updatePost(postId, updates)
deletePost(postId)
getConfig(userId?)            // default: 'admin'
updateConfig(config, userId?) // upsert
getBotStatus()
updateBotStatus(isActive)     // upsert
uploadImage(file)             // → Supabase Storage, gibt public URL zurück
```

---

## Webhook-Kommunikation Frontend ↔ N8N

| Aktion | Webhook | Payload | Response |
|--------|---------|---------|----------|
| Posts generieren | `TRIGGER_PLAN` | `{manual: true}` | HTTP 200 |
| Text neu | `REGEN_TEXT` | `{postId}` | `{success, content}` |
| Bild neu | `REGEN_IMAGE` | `{postId}` | `{success, imageUrl}` |
| Sofort posten | `PUBLISH_POST` | `{postId}` | HTTP 200 |
| Engagement update | `ENGAGEMENT` | `{manual: true}` | HTTP 200 |

---

## Bekannte Schwachstellen / TODOs

### ⚠️ Sicherheit (Priorität: HOCH)
1. **Login hardcoded** – `admin/admin123` steht im Frontend-Code sichtbar
   - TODO: Auf Supabase Auth (`supabase.auth.signInWithPassword`) umstellen
2. **N8N Credentials hardcoded** – Facebook Token, Supabase Service Key, Replicate Token stehen im `Credentials`-Node als JavaScript-String
   - TODO: N8N Credential-Manager verwenden (Settings → Credentials)
   - ODER: N8N Umgebungsvariablen (`$env.FB_ACCESS_TOKEN`)

### 🐛 Bugs / Code-Qualität
3. **`updateBotStatus` ohne await** in `App.tsx` → Fehler werden geschluckt
   ```ts
   // Zeile ~1200 in App.tsx – so:
   SupabaseService.updateBotStatus(newStatus);
   // Besser:
   await SupabaseService.updateBotStatus(newStatus);
   ```
4. **Auto-Publish-Timer im Frontend** – `setTimeout` in `ContentPlanning` funktioniert nur wenn Tab offen ist. N8N `Auto Publisher 1h` ist der zuverlässige Fallback.

### 🚀 Feature-Ideen
- [ ] Supabase Auth Login
- [ ] Mehrere Benutzer / Mandanten
- [ ] Post-Vorschau als Social-Media-Mockup
- [ ] A/B Testing: zwei Textvarianten generieren lassen
- [ ] Geplante Posts im Kalender-View
- [ ] Webhook-Status anzeigen (ist N8N erreichbar?)
- [x] Dark Mode ← aktuell in Umsetzung

---

## Entwicklungs-Workflow

### Lokale Entwicklung
```bash
npm run dev        # Vite Dev-Server starten
npm run build      # Production Build
npm run preview    # Build lokal testen
```

### Änderungen deployen
1. Code in VS Code bearbeiten (Claude Code im Terminal)
2. `git add . && git commit -m "..."` 
3. Push zu GitHub → automatisches Deploy (falls Vercel/Netlify verbunden)

### N8N Workflow ändern
1. In N8N UI bearbeiten
2. Workflow exportieren: Workflow → ⋯ → Export as JSON
3. JSON nach `/n8n/workflow.json` speichern und committen

### Kontext für neue Claude Code Sessions
Wenn du Claude Code in VS Code startest, liest es diese Datei automatisch.
Für komplexe Änderungen: erst hier in claude.ai besprechen, dann in VS Code umsetzen.

---

## Aktueller Stand (Stand: März 2026)

### ✅ Fertig
- Frontend komplett (Login, Dashboard, Content-Planung, Settings, Analytics)
- N8N Workflow mit allen 5 Pfaden funktionsfähig
- Supabase Tabellen und Storage eingerichtet
- Facebook + Instagram Publishing via Graph API
- Engagement Tracking automatisiert
- Bild-Upload vom Frontend (eigene Bilder)
- Dark Mode mit localStorage-Persistenz

### 🔄 In Arbeit
- Sicherheits-Verbesserungen (Login, API-Keys)

### 📋 Geplant
- Siehe Feature-Ideen oben

---

## 🎯 Aktuelle Aufgabe für Claude Code: Dark Mode

### Ziel
Einen Dark Mode Toggle in die App einbauen. Der Modus soll persistent sein (localStorage) und smooth zwischen hell und dunkel wechseln.

### Umsetzung – Schritt für Schritt

#### 1. `App.tsx` – Dark Mode State im App-Root
```tsx
// Neuer State in der App-Komponente:
const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem('darkMode') === 'true';
});

// useEffect um class auf <html> zu setzen:
useEffect(() => {
  document.documentElement.classList.toggle('dark', darkMode);
  localStorage.setItem('darkMode', String(darkMode));
}, [darkMode]);

// darkMode + setDarkMode als Props an Sidebar weitergeben
```

#### 2. `App.tsx` – Sidebar Props erweitern
```tsx
// Sidebar Props Interface erweitern:
function Sidebar({ activeTab, setActiveTab, onLogout, darkMode, onToggleDark }: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
})

// Toggle-Button in der Sidebar, direkt über dem Logout-Button:
<button className="dark-mode-button" onClick={onToggleDark}>
  <span>{darkMode ? '☀️' : '🌙'}</span>
  <span className="nav-label">{darkMode ? 'Hell' : 'Dunkel'}</span>
</button>
```

#### 3. `App.css` – CSS-Variablen + Dark Mode Styles
Alle hardcodierten Farben auf CSS-Variablen umstellen und Dark Mode Overrides hinzufügen:

```css
/* === LIGHT MODE (Standard) === */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --sidebar-bg: #1e293b;
  --sidebar-text: #94a3b8;
  --sidebar-active: #6366f1;
  --card-bg: #ffffff;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.1);
  --input-bg: #ffffff;
  --input-border: #e2e8f0;
}

/* === DARK MODE === */
html.dark {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-color: #334155;
  --sidebar-bg: #020617;
  --sidebar-text: #64748b;
  --sidebar-active: #818cf8;
  --card-bg: #1e293b;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.4);
  --input-bg: #334155;
  --input-border: #475569;
}

/* Transition für smooth Wechsel */
*, *::before, *::after {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
```

Dann alle bestehenden Farbwerte in App.css auf die Variablen umstellen, z.B.:
- `background: #ffffff` → `background: var(--bg-primary)`
- `color: #1e293b` → `color: var(--text-primary)`
- `border-color: #e2e8f0` → `border-color: var(--border-color)`
- `.sidebar` background → `var(--sidebar-bg)`
- `.post-card`, `.stat-card`, `.planning-card` → `var(--card-bg)`
- Inputs und Textareas → `var(--input-bg)`, `var(--input-border)`

#### 4. Dark Mode Button Style in App.css
```css
.dark-mode-button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: var(--sidebar-text);
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  transition: background 0.2s, color 0.2s;
}
.dark-mode-button:hover {
  background: rgba(255,255,255,0.08);
  color: #ffffff;
}
```

### Wichtige Hinweise
- Die Sidebar hat bereits einen dunklen Hintergrund (`#1e293b`) – im Dark Mode wird sie noch dunkler (`#020617`)
- Recharts Charts brauchen ggf. angepasste Farben für Achsen/Grid – `stroke="#94a3b8"` für Dark Mode
- Das `.login-container` hat einen Gradient-Hintergrund – auch diesen auf Variablen umstellen
- Nach der Umsetzung: Dark Mode in der CLAUDE.md unter "Fertig" verschieben
