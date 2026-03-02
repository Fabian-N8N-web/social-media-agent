/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_WEBHOOK_REGEN_TEXT: string;
  readonly VITE_WEBHOOK_REGEN_IMAGE: string;
  readonly VITE_WEBHOOK_TRIGGER_PLAN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}