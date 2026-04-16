import type { Config } from '../types';

export const WEBHOOK_REGEN_TEXT   = import.meta.env.VITE_WEBHOOK_REGEN_TEXT;
export const WEBHOOK_REGEN_IMAGE  = import.meta.env.VITE_WEBHOOK_REGEN_IMAGE;
export const WEBHOOK_TRIGGER_PLAN = import.meta.env.VITE_WEBHOOK_TRIGGER_PLAN;
export const WEBHOOK_PUBLISH_POST = import.meta.env.VITE_WEBHOOK_PUBLISH_POST;
export const WEBHOOK_ENGAGEMENT   = import.meta.env.VITE_WEBHOOK_ENGAGEMENT;
export const WEBHOOK_SCRAPE       = import.meta.env.VITE_WEBHOOK_SCRAPE;
export const WEBHOOK_PROCESS_IMAGE = import.meta.env.VITE_WEBHOOK_PROCESS_IMAGE;
export const WEBHOOK_GENERATE_STYLE = import.meta.env.VITE_WEBHOOK_GENERATE_STYLE;

export const IMAGE_MODES = [
  { key: 'original',     label: 'Original',           icon: '📸', description: 'Bild direkt verwenden' },
  { key: 'removed_bg',   label: 'Freigestellt',        icon: '✂️', description: 'Hintergrund entfernen' },
  { key: 'replaced_bg',  label: 'Neuer Hintergrund',   icon: '🎨', description: 'Produkt freigestellt + KI-Hintergrund' },
  { key: 'ai_generated', label: 'KI-generiert',        icon: '🤖', description: 'Kein Produktbild, Flux frei' },
] as const;

// Verfuegbare Bildmodelle (Replicate). Der N8N-Workflow uebersetzt slug -> URL + Body.
export const IMAGE_MODEL_OPTIONS = [
  { slug: 'black-forest-labs/flux-1.1-pro-ultra', label: 'Flux 1.1 Pro Ultra (Raw)', hint: 'BFL, bis 4 MP, raw-Mode gegen AI-Look - stark bei Szenen/Landschaften/Produkten' },
  { slug: 'google/imagen-4',                      label: 'Google Imagen 4',          hint: 'Top-Tier Photo-Realismus - exzellent bei Menschen, Hauttoenen, Augen' },
  { slug: 'ideogram-ai/ideogram-v3-turbo',        label: 'Ideogram v3 Turbo',        hint: 'Schnell, fotorealistisch, gut bei gemischten Szenen' },
  { slug: 'black-forest-labs/flux-1.1-pro',       label: 'Flux 1.1 Pro (klassisch)', hint: 'Das bisherige Modell - guter Allrounder, guenstiger' },
] as const;

export const DEFAULT_CONFIG: Config = {
  tonality: 'professional',
  topic: 'Business & Erfolg',
  businessType: 'products',
  industry: '',
  targetAudience: 'b2b',
  ageRange: { min: 25, max: 55 },
  postFrequency: 1,
  publishWindow: { start: '09:00', end: '18:00' },
  hashtags: ['#business', '#success', '#motivation', '#entrepreneur'],
  emojiUsage: 'moderate',
  language: 'de',
  imagePrompt: '',
  imageStyle: 'realistic',
  textLength: 50,
  websiteUrl: '',
  brandContext: '',
  brandContextUpdatedAt: '',
  brandKeywords: '',
  styleMode: 'auto' as const,
  postFrequencyUnit: 'day' as const,
  enabledPostTypes: ['trend', 'knowledge', 'story', 'tip', 'spotlight'],
  imageFallbackMode: 'ai_generated',
  setupCompleted: false,
  publishPlatform: 'both',
  imageModels: {
    people: 'google/imagen-4',
    scene: 'black-forest-labs/flux-1.1-pro-ultra'
  },
  styleOverrides: {
    tonality: 'auto' as const,
    targetAudience: 'auto' as const,
    ageRange: 'auto' as const,
    language: 'auto' as const,
    emojiUsage: 'auto' as const,
    hashtags: 'auto' as const,
  }
};

export const CHART_COLORS = {
  likes: '#ec4899', comments: '#3b82f6', shares: '#10b981',
  facebook: '#1877f2', instagram: '#e4405f', primary: '#6366f1', warning: '#f59e0b'
};

export const WEEKDAYS       = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
