#!/usr/bin/env node
/**
 * Fügt den Trigger-Pfad "/generate-style-suggestions" in den Live-N8N-Workflow ein.
 *
 * Aufruf:
 *   N8N_API_KEY=xxxxx node n8n/add_style_path.mjs
 *
 * Schritte:
 *   1) GET aktuellen Workflow
 *   2) Check ob der Webhook-Node bereits existiert (idempotent)
 *   3) Neue Nodes + Connections mergen
 *   4) PUT an N8N API
 *   5) Gespeicherten Workflow zu lokalem workflow.json schreiben (Backup)
 */

import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const N8N_BASE = 'https://n8n.srv1274405.hstgr.cloud';
const WORKFLOW_ID = '-k-9TfqEfximpwRITU63T';
const API_KEY = process.env.N8N_API_KEY;

if (!API_KEY) {
  console.error('Bitte N8N_API_KEY als Umgebungsvariable setzen.');
  process.exit(1);
}

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// ---------- Neue Nodes ----------
const Y = 12400; // eigene Y-Spur, weit weg von bestehenden Pfaden
const X0 = -11232;
const STEP = 448;

const ids = {
  webhook:    randomUUID(),
  creds:      randomUUID(),
  getCfg:     randomUUID(),
  getProds:   randomUUID(),
  buildPrmt:  randomUUID(),
  chain:      randomUUID(),
  anthropic:  randomUUID(),
  parse:      randomUUID(),
  patchCfg:   randomUUID(),
  respBody:   randomUUID(),
  respond:    randomUUID(),
};

const newNodes = [
  // 1) Webhook
  {
    id: ids.webhook,
    name: 'Webhook Style Suggestions',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 1,
    position: [X0, Y],
    webhookId: 'generate-style-suggestions-webhook',
    parameters: {
      httpMethod: 'POST',
      path: 'generate-style-suggestions',
      responseMode: 'responseNode',
      options: {},
    },
  },

  // 2) Code: Credentials setzen
  {
    id: ids.creds,
    name: 'Setup Style Creds',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [X0 + STEP, Y],
    parameters: {
      jsCode: [
        "const webhookData = $('Webhook Style Suggestions').first().json;",
        "const userId = webhookData.body?.userId || webhookData.userId || 'admin';",
        "return [{ json: {",
        "  userId,",
        "  supabaseUrl: 'https://iosuxvmkcmgenesirlfb.supabase.co',",
        "  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc3V4dm1rY21nZW5lc2lybGZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0NDA1MywiZXhwIjoyMDg1NzIwMDUzfQ.g_mnc9Ry6XE5_P1zh_1altV2qpVM1HcfILs6xaInrs0',",
        "} }];",
      ].join('\n'),
    },
  },

  // 3) HTTP GET config
  {
    id: ids.getCfg,
    name: 'Lade Config (Style)',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [X0 + STEP * 2, Y],
    parameters: {
      url: '={{ $json.supabaseUrl }}/rest/v1/config?user_id=eq.{{ $json.userId }}&select=*',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: '={{ $json.supabaseKey }}' },
          { name: 'Authorization', value: '=Bearer {{ $json.supabaseKey }}' },
        ],
      },
      options: {},
    },
  },

  // 4) HTTP GET products
  {
    id: ids.getProds,
    name: 'Lade Produkte (Style)',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [X0 + STEP * 3, Y],
    parameters: {
      url: "={{ $('Setup Style Creds').first().json.supabaseUrl }}/rest/v1/products?user_id=eq.{{ $('Setup Style Creds').first().json.userId }}&select=name,description,tags",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: "={{ $('Setup Style Creds').first().json.supabaseKey }}" },
          { name: 'Authorization', value: "=Bearer {{ $('Setup Style Creds').first().json.supabaseKey }}" },
        ],
      },
      options: {},
    },
  },

  // 5) Code: Prompt bauen (kollabiert N products auf 1 Item)
  {
    id: ids.buildPrmt,
    name: 'Build Style Prompt',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [X0 + STEP * 4, Y],
    parameters: {
      jsCode: [
        "const creds = $('Setup Style Creds').first().json;",
        "// Config kommt als einzelnes Item (Supabase liefert Array) – erstes Element nehmen",
        "const cfgItem = $('Lade Config (Style)').first().json;",
        "const cfg = Array.isArray(cfgItem) ? cfgItem[0] : (cfgItem[0] || cfgItem);",
        "// Products: $input.all() sind die Produkt-Items",
        "const products = $input.all().map(i => i.json).filter(p => p && p.name);",
        "const productsTxt = products.length",
        "  ? products.map(p => `- ${p.name}${p.description ? ': ' + p.description : ''}`).join('\\n')",
        "  : '(keine Produkte hinterlegt)';",
        "const prompt = [",
        "  'Du bist Social-Media-Stratege. Basierend auf folgendem Business schlage sinnvolle Stiloptionen für Social-Media-Posts (Facebook / Instagram) vor.',",
        "  '',",
        "  'BESCHREIBUNG:',",
        "  (cfg?.topic || '(keine Beschreibung)'),",
        "  '',",
        "  'USPs:',",
        "  (cfg?.brand_keywords || '(keine)'),",
        "  '',",
        "  'WEBSITE-KONTEXT:',",
        "  (cfg?.brand_context || '(kein Website-Kontext verfügbar)').slice(0, 2000),",
        "  '',",
        "  'PRODUKTE:',",
        "  productsTxt,",
        "  '',",
        "  'Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, keine Prosa, keine Markdown-Fences. Pflicht-Schlüssel:',",
        "  '{',",
        "  '  \"tonality\": \"professional\" | \"casual\" | \"humorous\" | \"inspirational\",',",
        "  '  \"targetAudience\": \"b2b\" | \"b2c\" | \"mixed\",',",
        "  '  \"ageRange\": { \"min\": <int 18-80>, \"max\": <int 18-80, max >= min> },',",
        "  '  \"language\": \"de\" | \"en\",',",
        "  '  \"emojiUsage\": \"none\" | \"minimal\" | \"moderate\" | \"extensive\",',",
        "  '  \"hashtags\": [5 bis 8 relevante Hashtags ohne Raute-Präfix]',",
        "  '}',",
        "  '',",
        "  'Wähle inhaltlich passend – z. B. Menopause-Beratung → targetAudience b2c, ageRange {min:45,max:65}, tonality professional oder inspirational, emojiUsage minimal.',",
        "].join('\\n');",
        "return [{ json: { prompt, userId: creds.userId, supabaseUrl: creds.supabaseUrl, supabaseKey: creds.supabaseKey } }];",
      ].join('\n'),
    },
  },

  // 6) chainLlm Prompt-Wrapper
  {
    id: ids.chain,
    name: 'Style Generator (Chain)',
    type: '@n8n/n8n-nodes-langchain.chainLlm',
    typeVersion: 1.9,
    position: [X0 + STEP * 5, Y],
    parameters: {
      promptType: 'define',
      text: '={{ $json.prompt }}',
      batching: {},
    },
  },

  // 7) Anthropic-LLM (als Sub-Node des chainLlm via ai_languageModel)
  {
    id: ids.anthropic,
    name: 'Anthropic (Style)',
    type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
    typeVersion: 1.3,
    position: [X0 + STEP * 5, Y + 208],
    parameters: {
      model: {
        __rl: true,
        value: 'claude-sonnet-4-5-20250929',
        mode: 'list',
        cachedResultName: 'Claude Sonnet 4.5',
      },
      options: {},
    },
    credentials: {
      anthropicApi: {
        id: 'pu3BH9aER9eFMDUU',
        name: 'Claude API',
      },
    },
  },

  // 8) Code: JSON parsen + validieren
  {
    id: ids.parse,
    name: 'Parse Style JSON',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [X0 + STEP * 6, Y],
    parameters: {
      jsCode: [
        "const creds = $('Setup Style Creds').first().json;",
        "const raw = ($input.first().json.text || $input.first().json.output || '').trim();",
        "// Möglichen Markdown-Fence entfernen",
        "const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```\\s*$/i, '').trim();",
        "let parsed;",
        "try { parsed = JSON.parse(cleaned); } catch (e) {",
        "  // letzter Versuch: ersten {...}-Block extrahieren",
        "  const m = cleaned.match(/\\{[\\s\\S]*\\}/);",
        "  if (!m) throw new Error('Kein JSON in KI-Antwort: ' + raw.slice(0, 200));",
        "  parsed = JSON.parse(m[0]);",
        "}",
        "// Normalisieren + validieren",
        "const allow = (v, set, fallback) => set.includes(v) ? v : fallback;",
        "const tonality = allow(parsed.tonality, ['professional','casual','humorous','inspirational'], 'professional');",
        "const targetAudience = allow(parsed.targetAudience, ['b2b','b2c','mixed'], 'mixed');",
        "const language = allow(parsed.language, ['de','en'], 'de');",
        "const emojiUsage = allow(parsed.emojiUsage, ['none','minimal','moderate','extensive'], 'moderate');",
        "let min = parseInt(parsed.ageRange?.min, 10); let max = parseInt(parsed.ageRange?.max, 10);",
        "if (!Number.isFinite(min) || min < 18 || min > 80) min = 25;",
        "if (!Number.isFinite(max) || max < 18 || max > 80) max = 55;",
        "if (max < min) max = Math.min(80, min + 10);",
        "let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];",
        "hashtags = hashtags.slice(0, 8).map(h => String(h).trim()).map(h => h.startsWith('#') ? h : ('#' + h)).filter(Boolean);",
        "return [{ json: {",
        "  userId: creds.userId,",
        "  supabaseUrl: creds.supabaseUrl,",
        "  supabaseKey: creds.supabaseKey,",
        "  suggestions: { tonality, targetAudience, ageRange: { min, max }, language, emojiUsage, hashtags },",
        "  raw,",
        "} }];",
      ].join('\n'),
    },
  },

  // 9) HTTP PATCH config
  {
    id: ids.patchCfg,
    name: 'Style Vorschläge speichern',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [X0 + STEP * 7, Y],
    parameters: {
      method: 'PATCH',
      url: '={{ $json.supabaseUrl }}/rest/v1/config?user_id=eq.{{ $json.userId }}',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: '={{ $json.supabaseKey }}' },
          { name: 'Authorization', value: '=Bearer {{ $json.supabaseKey }}' },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'return=representation' },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: "={{ JSON.stringify({ tonality: $json.suggestions.tonality, target_audience: $json.suggestions.targetAudience, age_range: $json.suggestions.ageRange, language: $json.suggestions.language, emoji_usage: $json.suggestions.emojiUsage, hashtags: $json.suggestions.hashtags }) }}",
      options: {},
    },
  },

  // 10) Code: Response bauen
  {
    id: ids.respBody,
    name: 'Style Response Body',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [X0 + STEP * 8, Y],
    parameters: {
      jsCode: [
        "const s = $('Parse Style JSON').first().json.suggestions;",
        "return { json: { success: true, suggestions: s } };",
      ].join('\n'),
    },
  },

  // 11) Respond
  {
    id: ids.respond,
    name: 'Antwort Style',
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [X0 + STEP * 9, Y],
    parameters: {
      respondWith: 'json',
      responseBody: '={{ JSON.stringify($json) }}',
      options: {},
    },
  },
];

const newConnections = {
  'Webhook Style Suggestions': {
    main: [[{ node: 'Setup Style Creds', type: 'main', index: 0 }]],
  },
  'Setup Style Creds': {
    main: [[{ node: 'Lade Config (Style)', type: 'main', index: 0 }]],
  },
  'Lade Config (Style)': {
    main: [[{ node: 'Lade Produkte (Style)', type: 'main', index: 0 }]],
  },
  'Lade Produkte (Style)': {
    main: [[{ node: 'Build Style Prompt', type: 'main', index: 0 }]],
  },
  'Build Style Prompt': {
    main: [[{ node: 'Style Generator (Chain)', type: 'main', index: 0 }]],
  },
  'Anthropic (Style)': {
    ai_languageModel: [[{ node: 'Style Generator (Chain)', type: 'ai_languageModel', index: 0 }]],
  },
  'Style Generator (Chain)': {
    main: [[{ node: 'Parse Style JSON', type: 'main', index: 0 }]],
  },
  'Parse Style JSON': {
    main: [[{ node: 'Style Vorschläge speichern', type: 'main', index: 0 }]],
  },
  'Style Vorschläge speichern': {
    main: [[{ node: 'Style Response Body', type: 'main', index: 0 }]],
  },
  'Style Response Body': {
    main: [[{ node: 'Antwort Style', type: 'main', index: 0 }]],
  },
};

// ---------- Hauptlogik ----------
async function main() {
  console.log('→ GET aktueller Workflow …');
  const getRes = await fetch(`${N8N_BASE}/api/v1/workflows/${WORKFLOW_ID}`, { headers });
  if (!getRes.ok) throw new Error(`GET fehlgeschlagen: ${getRes.status} ${await getRes.text()}`);
  const wf = await getRes.json();
  console.log(`  ✓ Workflow "${wf.name}" mit ${wf.nodes.length} Nodes geladen`);

  // Idempotenz-Check
  const existingNames = new Set(wf.nodes.map(n => n.name));
  const toAdd = newNodes.filter(n => !existingNames.has(n.name));
  if (toAdd.length === 0) {
    console.log('✓ Alle Style-Nodes existieren bereits – nichts zu tun.');
    return;
  }
  if (toAdd.length < newNodes.length) {
    console.warn(`⚠ ${newNodes.length - toAdd.length} Nodes existieren bereits – füge nur neue hinzu.`);
  }

  wf.nodes = [...wf.nodes, ...toAdd];
  wf.connections = { ...wf.connections, ...newConnections };

  // PUT erwartet nur {name, nodes, connections, settings} (keine id, active, createdAt etc.)
  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
  };

  console.log('→ PUT Workflow …');
  const putRes = await fetch(`${N8N_BASE}/api/v1/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error(`PUT fehlgeschlagen: ${putRes.status} ${txt}`);
  }
  console.log('  ✓ Workflow aktualisiert');

  // Backup lokal sichern
  await writeFile(
    new URL('./workflow.json', import.meta.url),
    JSON.stringify({ nodes: wf.nodes, connections: wf.connections, pinData: wf.pinData || {}, meta: wf.meta || {} }, null, 2),
  );
  console.log('  ✓ n8n/workflow.json aktualisiert');

  console.log(`\n✅ Fertig – ${toAdd.length} neue Nodes ergänzt.`);
  console.log('Webhook: POST ' + N8N_BASE + '/webhook/generate-style-suggestions');
}

main().catch(err => { console.error('✗ FEHLER:', err.message); process.exit(1); });
