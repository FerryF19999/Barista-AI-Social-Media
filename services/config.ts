type EnvLookup = Record<string, string | undefined>;

const importMetaEnv = import.meta.env as EnvLookup;

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

  }

  return '';
};

const SUPABASE_URL_KEYS = ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'];
const SUPABASE_ANON_KEYS = ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'];

export const SUPABASE_URL = getRuntimeEnv(SUPABASE_URL_KEYS);
export const SUPABASE_ANON_KEY = getRuntimeEnv(SUPABASE_ANON_KEYS);
