/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_WEBHOOK_REGEN_TEXT: string;
  readonly VITE_WEBHOOK_REGEN_IMAGE: string;
  readonly VITE_WEBHOOK_TRIGGER_PLAN: string;
  readonly VITE_WEBHOOK_PUBLISH_POST: string;
  readonly VITE_WEBHOOK_ENGAGEMENT: string;
  readonly VITE_WEBHOOK_SCRAPE: string;
  readonly VITE_WEBHOOK_PROCESS_IMAGE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}