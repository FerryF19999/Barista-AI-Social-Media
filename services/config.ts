type EnvLookup = Record<string, string | undefined>;

const importMetaEnv = import.meta.env as EnvLookup;

const FALLBACK_ENV: EnvLookup = {
  VITE_SUPABASE_URL: 'https://jfanrxopqcsknnqlzmlv.supabase.co',
  VITE_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYW5yeG9wcWNza25ucWx6bWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDY2ODgsImV4cCI6MjA3NTgyMjY4OH0.ph4V7lXH6acslBu20uQxGpYE5CyNCFqrf2eQQleH7ng',
};

const getRuntimeEnv = (keys: string[]): string => {
  for (const key of keys) {
    const fromImport = importMetaEnv[key];
    if (fromImport) {
      return fromImport;
    }

    if (typeof process !== 'undefined') {
      const fromProcess = (process.env as EnvLookup)?.[key];
      if (fromProcess) {
        return fromProcess;
      }
    }

    if (typeof window !== 'undefined') {
      const win = window as unknown as EnvLookup & {
        __env?: EnvLookup;
        ENV?: EnvLookup;
        config?: EnvLookup;
      };
      const fromWindow = win?.[key];
      if (fromWindow) {
        return fromWindow;
      }
      const nestedEnv = win.__env ?? win.ENV ?? win.config;
      const fromNested = nestedEnv?.[key];
      if (fromNested) {
        return fromNested;
      }
    }

    const fromFallback = FALLBACK_ENV[key];
    if (fromFallback) {
      return fromFallback;
    }
  }

  return '';
};

const SUPABASE_URL_KEYS = ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'];
const SUPABASE_ANON_KEYS = ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'];

export const SUPABASE_URL = getRuntimeEnv(SUPABASE_URL_KEYS);
export const SUPABASE_ANON_KEY = getRuntimeEnv(SUPABASE_ANON_KEYS);
