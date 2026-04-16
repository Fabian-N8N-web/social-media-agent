#!/usr/bin/env node
/**
 * Erweitert den N8N-Workflow um business_type + industry-Kontext:
 *
 *   1) Build Style Prompt (Style-Webhook) — ergänzt Branche/Business-Typ im Prompt
 *   2) Image Prompt bauen (Content Planer) — injiziert industryHint + PPE/Arbeitskleidung
 *   3) Config Parser (Plan) — stellt sicher, dass business_type + industry durchgereicht werden
 *   4) Config Parser (Bild) — liest business_type + industry auch aus post/config_snapshot
 *
 * Aufruf:
 *   N8N_API_KEY=xxx node n8n/patch_industry_context.mjs
 */

import { writeFile } from 'node:fs/promises';

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

// =========================================================
//   Neue jsCode-Inhalte pro Node
// =========================================================

// --- (1) Build Style Prompt ---
const BUILD_STYLE_PROMPT_JSCODE = [
  "const creds = $('Setup Style Creds').first().json;",
  "const cfgItem = $('Lade Config (Style)').first().json;",
  "const cfg = Array.isArray(cfgItem) ? cfgItem[0] : (cfgItem[0] || cfgItem);",
  "const products = $input.all().map(i => i.json).filter(p => p && p.name);",
  "const productsTxt = products.length",
  "  ? products.map(p => `- ${p.name}${p.description ? ': ' + p.description : ''}`).join('\\n')",
  "  : '(keine Produkte / Dienstleistungen hinterlegt)';",
  "const btRaw = (cfg?.business_type || 'products').toLowerCase();",
  "const btLabel = btRaw === 'services' ? 'Dienstleistungsunternehmen' : btRaw === 'mixed' ? 'Produkte & Dienstleistungen' : 'Produktunternehmen';",
  "const industry = (cfg?.industry || '').trim();",
  "const prompt = [",
  "  'Du bist Social-Media-Stratege. Basierend auf folgendem Business schlage sinnvolle Stiloptionen für Social-Media-Posts (Facebook / Instagram) vor.',",
  "  '',",
  "  'BUSINESS-TYP: ' + btLabel,",
  "  'BRANCHE: ' + (industry || '(keine angegeben)'),",
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
  "  'PRODUKTE / DIENSTLEISTUNGEN:',",
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
  "  'Wähle inhaltlich passend zum Business-Typ und zur Branche. Beispiele:',",
  "  '- Menopause-Beratung → b2c, 45-65, professional oder inspirational, minimal.',",
  "  '- Dachdeckerei (services) → b2c, 35-70, professional, minimal, Hashtags aus dem Handwerk.',",
  "  '- Gastronomie (services) → b2c, gemischt, casual, moderate Emojis.',",
  "].join('\\n');",
  "return [{ json: { prompt, userId: creds.userId, supabaseUrl: creds.supabaseUrl, supabaseKey: creds.supabaseKey } }];",
].join('\n');

// --- (2) Image Prompt bauen (Regenerate-Image-Pfad) ---
// WICHTIG: Weicher Kontext fuer Alter & Branche - KEINE erzwungene Menschendarstellung.
// Flux entscheidet selbst anhand Post-Content, ob Menschen/Produkte/Szenen gezeigt werden.
const IMAGE_PROMPT_BAUEN_JSCODE = [
  "const config = $input.first().json || {};",
  "const postId = $('Router').first().json.postId;",
  "const styleMap = { realistic: 'editorial photograph, Canon EOS R5 85mm f/2.8, natural lighting, shallow depth of field, authentic color grading, slight film grain', comic: 'colorful comic book illustration, bold outlines, dynamic composition, vibrant colors', art: 'artistic painting, creative composition, expressive brushstrokes, gallery quality', fantasy: 'fantasy digital art, magical atmosphere, ethereal lighting, dreamlike scenery' };",
  "const styleDesc = styleMap[config.image_style] || styleMap.realistic;",
  "const customImagePrompt = config.image_prompt || '';",
  "const postContent = config._postContent || '';",
  "const brandKw = config.brand_keywords || '';",
  "const topic = config.topic || 'Business & Erfolg';",
  "const businessType = (config.business_type || 'products').toLowerCase();",
  "const industry = (config.industry || '').trim();",
  "",
  "// Alter: nur als weicher Kontext, falls Menschen im Bild auftauchen - kein Zwang",
  "const ageRange = config.age_range || null;",
  "let audienceHint = '';",
  "if (ageRange && ageRange.min && ageRange.max) {",
  "  audienceHint = ' If people appear in the image, target age range is ' + ageRange.min + '-' + ageRange.max + ' years.';",
  "}",
  "",
  "// Branchen-Kontext: neutrale Angabe, keine erzwungene Menschendarstellung",
  "let industryHint = '';",
  "if (industry) {",
  "  industryHint = ' Industry context: ' + industry + '. Authentic setting appropriate to this industry.';",
  "  if (businessType === 'services' || businessType === 'mixed') {",
  "    industryHint += ' If people are depicted, they should wear attire and equipment appropriate to this industry.';",
  "  }",
  "}",
  "",
  "let autoImagePrompt = '';",
  "if (postContent) {",
  "  const contentSnippet = postContent.replace(/#\\S+/g, '').replace(/[\\n\\r]+/g, ' ').substring(0, 250).trim();",
  "  const brandHint = brandKw ? ' Brand: ' + brandKw.substring(0, 100) + '.' : ' Brand: ' + topic.substring(0, 100) + '.';",
  "  autoImagePrompt = styleDesc + '. Visual concept for this social media post: ' + contentSnippet + '.' + brandHint + industryHint + audienceHint + ' Modern, positive, visually appealing. No text, no words, no letters, no logos in the image. Safe for work, family friendly.';",
  "} else {",
  "  autoImagePrompt = styleDesc + ' for a social media post. Topic: ' + topic + '.' + industryHint + audienceHint + ' Modern, visually appealing. No text, no words, no letters, no logos in the image. Safe for work, family friendly.';",
  "}",
  "return { json: {",
  "  postId,",
  "  imagePrompt: customImagePrompt || autoImagePrompt",
  "} };",
].join('\n');

// --- (2b) Text parsen (Plan) - Content-Planer Bildprompt nach LLM-Textgenerierung ---
// Spiegelt die gleiche Logik wie "Image Prompt bauen", damit Regenerate-Pfad und Planer konsistent sind.
const TEXT_PARSEN_PLAN_JSCODE = [
  "const allLlm = $input.all();",
  "const allPrev = $('Pruefen und Planen').all();",
  "",
  "const styleMap = { realistic: 'editorial photograph, Canon EOS R5 85mm f/2.8, natural lighting, shallow depth of field, authentic color grading, slight film grain', comic: 'colorful comic illustration, bold outlines, vibrant colors, dynamic composition', art: 'artistic painting, creative brushstrokes, gallery quality, expressive', fantasy: 'fantasy digital art, magical atmosphere, ethereal lighting, dreamlike' };",
  "",
  "return allLlm.map((llmItem, idx) => {",
  "  const llm = llmItem.json;",
  "  const prev = (allPrev[idx] || allPrev[0]).json;",
  "  const content = (llm.text || llm.response || '').trim();",
  "",
  "  const cs = prev.configSnapshot || {};",
  "  const styleDesc = styleMap[cs.image_style] || styleMap.realistic;",
  "  const brandKw = cs.brand_keywords || '';",
  "  const topic = cs.topic || '';",
  "  const customImagePrompt = cs.image_prompt || '';",
  "  const businessType = (cs.business_type || 'products').toLowerCase();",
  "  const industry = (cs.industry || '').trim();",
  "",
  "  let imagePrompt = prev.imagePrompt;",
  "  if (!customImagePrompt) {",
  "    const contentSnippet = content.replace(/#\\S+/g, '').replace(/[\\n\\r]+/g, ' ').substring(0, 250).trim();",
  "    const brandHint = brandKw ? ' Brand: ' + brandKw.substring(0, 100) + '.' : (topic ? ' Brand: ' + topic.substring(0, 100) + '.' : '');",
  "",
  "    // Alter: weicher Kontext, kein Zwang",
  "    let audienceHint = '';",
  "    const ageRange = cs.age_range || null;",
  "    if (ageRange && ageRange.min && ageRange.max) {",
  "      audienceHint = ' If people appear in the image, target age range is ' + ageRange.min + '-' + ageRange.max + ' years.';",
  "    }",
  "",
  "    // Branchen-Kontext: neutral, kein Menschen-Zwang",
  "    let industryHint = '';",
  "    if (industry) {",
  "      industryHint = ' Industry context: ' + industry + '. Authentic setting appropriate to this industry.';",
  "      if (businessType === 'services' || businessType === 'mixed') {",
  "        industryHint += ' If people are depicted, they should wear attire and equipment appropriate to this industry.';",
  "      }",
  "    }",
  "",
  "    imagePrompt = styleDesc + '. Visual concept for this social media post: ' + contentSnippet + '.' + brandHint + industryHint + audienceHint + ' Modern, positive, visually appealing. No text, no words, no letters, no logos in the image. Safe for work, family friendly.';",
  "  }",
  "",
  "  return { json: { ...prev, content, imagePrompt } };",
  "});",
].join('\n');

// --- (2c) PI AI Prompt - AI-generiertes Produktbild im ProductManager ---
// Bei reiner Produktfotografie steht das PRODUKT im Fokus - kein audienceHint, keine Menschen.
const PI_AI_PROMPT_JSCODE = [
  "const prev = $input.first().json;",
  "const prompt = 'Professional product photography of ' + prev.product_name + '. ' +",
  "  (prev.product_description || '') + '. ' +",
  "  (prev.brand_keywords || '') + '.' +",
  "  ' Commercial photography style, high quality, clean background, product centered.';",
  "return { json: { ...prev, fluxPrompt: prompt } };",
].join('\n');

// --- Helper-Snippet, das im Config Parser (Plan) und (Bild) sicherstellt, dass business_type + industry dabei sind ---
const CONFIG_PARSER_APPEND = '\n// business_type + industry fuer Image-Prompt durchreichen\nif (typeof config === \'object\' && config) {\n  config.business_type = config.business_type || post?.business_type || \'products\';\n  config.industry = config.industry || post?.industry || \'\';\n}\n';

// --- (2d) Pruefen und Planen: surgical replace der Menschen-Zwang-Stellen ---
// Der Node-Code ist sehr gross, deshalb nur gezielte Replacements statt Vollersatz.
function patchPruefenPlanen(node) {
  if (!node?.parameters?.jsCode) return false;
  let code = node.parameters.jsCode;
  const before = code;

  // (a) styleMap.realistic entschaerfen - Menschen-Bias ("skin texture with pores", "candid not posed") raus
  code = code.replace(
    "realistic: 'editorial photograph shot on Canon EOS R5 85mm f/2.8, natural lighting, shallow depth of field, natural skin texture with pores and imperfections, candid not posed, slight film grain, authentic color grading'",
    "realistic: 'editorial photograph, Canon EOS R5 85mm f/2.8, natural lighting, shallow depth of field, authentic color grading, slight film grain'"
  );

  // (b) postTypeImageHints neutralisieren - keine Niche-Klischees, keine Menschen-Zwang
  code = code.replace(
    /const postTypeImageHints = \{[\s\S]*?\};/,
    "const postTypeImageHints = {\n  spotlight: 'clear presentation of the subject in focus, elegant composition',\n  trend: 'modern, forward-looking context, innovation theme',\n  knowledge: 'informative, educational visual context',\n  story: 'narrative scene with emotional atmosphere',\n  tip: 'practical, illustrative scene demonstrating the tip'\n};"
  );

  // (c) audienceHint-Block + imagePrompt - weicher Kontext, industryHint ergaenzt
  const OLD_AUDIENCE_BLOCK = /let audienceHint = '';\s*const ageRange = config\.age_range \|\| null;\s*if \(ageRange && ageRange\.min && ageRange\.max\) \{\s*const avgAge = Math\.round\(\(ageRange\.min \+ ageRange\.max\) \/ 2\);[\s\S]*?\}\s*if \(config\.target_audience === 'b2b'\) audienceHint \+= ' Professional business context\.';\s*const imagePrompt = customImagePrompt \|\| \([^;]*\);/;
  const NEW_AUDIENCE_BLOCK = `let audienceHint = '';
  const ageRange = config.age_range || null;
  if (ageRange && ageRange.min && ageRange.max) {
    audienceHint = ' If people appear in the image, target age range is ' + ageRange.min + '-' + ageRange.max + ' years.';
  }
  if (config.target_audience === 'b2b') audienceHint += ' Professional business context.';
  const businessType = (config.business_type || 'products').toLowerCase();
  const industry = (config.industry || '').trim();
  let industryHint = '';
  if (industry) {
    industryHint = ' Industry context: ' + industry + '. Authentic setting appropriate to this industry.';
    if (businessType === 'services' || businessType === 'mixed') {
      industryHint += ' If people are depicted, they should wear attire and equipment appropriate to this industry.';
    }
  }
  const imagePrompt = customImagePrompt || (styleDesc + ', ' + imageHint + '.' + industryHint + audienceHint + ' Mood: ' + tonality + ', modern, positive, uplifting. No text, no words, no letters, no logos in the image. Safe for work, family friendly.');`;
  code = code.replace(OLD_AUDIENCE_BLOCK, NEW_AUDIENCE_BLOCK);

  if (code === before) return false; // nichts geaendert (evtl. schon gepatched)
  node.parameters.jsCode = code;
  return true;
}

// =========================================================
//   Hauptlogik
// =========================================================

function findNode(wf, name) {
  return wf.nodes.find(n => n.name === name);
}

function setJsCode(node, code) {
  if (!node) return false;
  if (!node.parameters) node.parameters = {};
  node.parameters.jsCode = code;
  return true;
}

function appendJsCode(node, snippet) {
  if (!node) return false;
  const current = node.parameters?.jsCode || '';
  if (current.includes('// business_type + industry fuer Image-Prompt')) return false; // idempotent
  // Einfüge-Strategie: vor dem abschließenden `return { json: config };` falls vorhanden
  const returnPattern = /return\s*\{\s*json:\s*config\s*\}/;
  if (returnPattern.test(current)) {
    node.parameters.jsCode = current.replace(returnPattern, snippet + '\nreturn { json: config }');
  } else {
    node.parameters.jsCode = current + snippet;
  }
  return true;
}

async function main() {
  console.log('→ GET aktueller Workflow …');
  const getRes = await fetch(`${N8N_BASE}/api/v1/workflows/${WORKFLOW_ID}`, { headers });
  if (!getRes.ok) throw new Error(`GET fehlgeschlagen: ${getRes.status} ${await getRes.text()}`);
  const wf = await getRes.json();
  console.log(`  ✓ Workflow "${wf.name}" mit ${wf.nodes.length} Nodes geladen`);

  let changes = 0;

  // (1) Build Style Prompt
  const buildStyle = findNode(wf, 'Build Style Prompt');
  if (!buildStyle) console.warn('  ! "Build Style Prompt" nicht gefunden (wurde der Style-Webhook deployed?)');
  else {
    setJsCode(buildStyle, BUILD_STYLE_PROMPT_JSCODE);
    console.log('  ✓ Build Style Prompt aktualisiert');
    changes++;
  }

  // (2) Image Prompt bauen (Regenerate-Image-Pfad)
  const imgPrompt = findNode(wf, 'Image Prompt bauen');
  if (!imgPrompt) console.warn('  ! "Image Prompt bauen" nicht gefunden');
  else {
    setJsCode(imgPrompt, IMAGE_PROMPT_BAUEN_JSCODE);
    console.log('  ✓ Image Prompt bauen aktualisiert');
    changes++;
  }

  // (2b) Text parsen (Plan) — Bildprompt nach LLM-Textgenerierung im Content-Planer
  const textParsen = findNode(wf, 'Text parsen (Plan)');
  if (!textParsen) console.warn('  ! "Text parsen (Plan)" nicht gefunden');
  else {
    setJsCode(textParsen, TEXT_PARSEN_PLAN_JSCODE);
    console.log('  ✓ Text parsen (Plan) aktualisiert');
    changes++;
  }

  // (2c) PI AI Prompt — AI-generiertes Produktbild im ProductManager
  const piAiPrompt = findNode(wf, 'PI AI Prompt');
  if (!piAiPrompt) console.warn('  ! "PI AI Prompt" nicht gefunden');
  else {
    setJsCode(piAiPrompt, PI_AI_PROMPT_JSCODE);
    console.log('  ✓ PI AI Prompt aktualisiert');
    changes++;
  }

  // (2d) Pruefen und Planen — Menschen-Zwang (Alter/Skin Texture/Post-Type-Klischees) entfernen
  const pruefen = findNode(wf, 'Pruefen und Planen');
  if (!pruefen) console.warn('  ! "Pruefen und Planen" nicht gefunden');
  else if (patchPruefenPlanen(pruefen)) {
    console.log('  ✓ Pruefen und Planen entschaerft');
    changes++;
  } else {
    console.log('  = Pruefen und Planen bereits aktuell (keine Aenderung)');
  }

  // (3) Config Parser (Plan) — business_type + industry durchreichen
  const cfgPlan = findNode(wf, 'Config Parser (Plan)');
  if (cfgPlan && appendJsCode(cfgPlan, CONFIG_PARSER_APPEND)) {
    console.log('  ✓ Config Parser (Plan) patched');
    changes++;
  }

  // (4) Config Parser (Bild) — business_type + industry durchreichen
  const cfgBild = findNode(wf, 'Config Parser (Bild)');
  if (cfgBild && appendJsCode(cfgBild, CONFIG_PARSER_APPEND)) {
    console.log('  ✓ Config Parser (Bild) patched');
    changes++;
  }

  // (optional) Config Parser (Text) auch patchen
  const cfgText = findNode(wf, 'Config Parser (Text)');
  if (cfgText && appendJsCode(cfgText, CONFIG_PARSER_APPEND)) {
    console.log('  ✓ Config Parser (Text) patched');
    changes++;
  }

  if (changes === 0) {
    console.log('Nichts zu tun.');
    return;
  }

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
  if (!putRes.ok) throw new Error(`PUT fehlgeschlagen: ${putRes.status} ${await putRes.text()}`);
  console.log('  ✓ Workflow aktualisiert');

  await writeFile(
    new URL('./workflow.json', import.meta.url),
    JSON.stringify({ nodes: wf.nodes, connections: wf.connections, pinData: wf.pinData || {}, meta: wf.meta || {} }, null, 2),
  );
  console.log('  ✓ n8n/workflow.json aktualisiert');
  console.log(`\n✅ Fertig – ${changes} Nodes aktualisiert.`);
}

main().catch(err => { console.error('✗ FEHLER:', err.message); process.exit(1); });
