import type { Config } from '../types';

export const WEBHOOK_REGEN_TEXT   = import.meta.env.VITE_WEBHOOK_REGEN_TEXT;
export const WEBHOOK_REGEN_IMAGE  = import.meta.env.VITE_WEBHOOK_REGEN_IMAGE;
export const WEBHOOK_TRIGGER_PLAN = import.meta.env.VITE_WEBHOOK_TRIGGER_PLAN;
export const WEBHOOK_PUBLISH_POST = import.meta.env.VITE_WEBHOOK_PUBLISH_POST;
export const WEBHOOK_ENGAGEMENT   = import.meta.env.VITE_WEBHOOK_ENGAGEMENT;
export const WEBHOOK_SCRAPE       = import.meta.env.VITE_WEBHOOK_SCRAPE;
export const WEBHOOK_PROCESS_IMAGE = import.meta.env.VITE_WEBHOOK_PROCESS_IMAGE;

export const IMAGE_MODES = [
  { key: 'original',     label: 'Original',           icon: '📸', description: 'Bild direkt verwenden' },
  { key: 'removed_bg',   label: 'Freigestellt',        icon: '✂️', description: 'Hintergrund entfernen' },
  { key: 'replaced_bg',  label: 'Neuer Hintergrund',   icon: '🎨', description: 'Produkt freigestellt + KI-Hintergrund' },
  { key: 'ai_generated', label: 'KI-generiert',        icon: '🤖', description: 'Kein Produktbild, Flux frei' },
] as const;

export const DEFAULT_CONFIG: Config = {
  tonality: 'professional',
  topic: 'Business & Erfolg',
  targetAudience: 'b2b',
  ageRange: { min: 25, max: 55 },
  postFrequency: 3,
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
  postFrequencyUnit: 'week' as const,
  enabledPostTypes: ['spotlight', 'trend', 'knowledge', 'story', 'tip'],
  imageFallbackMode: 'ai_generated',
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
