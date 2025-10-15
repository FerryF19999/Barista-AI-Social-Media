import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export interface SupabaseError {
  message: string;
}

type EqFilter = { type: 'eq'; column: string; value: string | number | boolean };
type InFilter = { type: 'in'; column: string; values: Array<string | number> };
type Filter = EqFilter | InFilter;

interface OrderByOption {
  column: string;
  ascending?: boolean;
}

interface BaseOptions {
  filters?: Filter[];
}

interface SelectOptions extends BaseOptions {
  columns?: string;
  orderBy?: OrderByOption;
  limit?: number;
  mode?: 'list' | 'single' | 'maybeSingle';
}

interface MutateOptions extends BaseOptions {
  returnRepresentation?: boolean;
}

export const missingSupabaseConfigMessage =
  'Supabase client is not configured. Provide VITE_SUPABASE_* or NEXT_PUBLIC_SUPABASE_* environment variables.';

const ensureConfig = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(missingSupabaseConfigMessage);
  }

  return {
    url: SUPABASE_URL.replace(/\/$/, ''),
    key: SUPABASE_ANON_KEY,
  };
};

const buildHeaders = (returnRepresentation: boolean) => {
  const { key } = ensureConfig();
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  if (returnRepresentation) {
    headers.Prefer = 'return=representation';
  }

  return headers;
};

const buildQueryParams = (options: SelectOptions | MutateOptions): URLSearchParams => {
  const params = new URLSearchParams();

  if ('columns' in options && options.columns) {
    params.set('select', options.columns);
  }

  if ('orderBy' in options && options.orderBy) {
    const direction = options.orderBy.ascending === false ? 'desc' : 'asc';
    params.set('order', `${options.orderBy.column}.${direction}`);
  }

  if ('limit' in options && typeof options.limit === 'number') {
    params.set('limit', String(options.limit));
  }

  (options.filters ?? []).forEach(filter => {
    if (filter.type === 'eq') {
      params.append(filter.column, `eq.${filter.value}`);
    } else if (filter.type === 'in') {
      params.append(filter.column, `in.(${filter.values.join(',')})`);
    }
  });

  return params;
};

const parseError = async (response: Response): Promise<SupabaseError> => {
  try {
    const data = await response.json();
    if (data && typeof data.message === 'string') {
      return { message: data.message };
    }
  } catch (error) {
    // ignore json parse errors and fall back to text
  }

  const text = await response.text();
  return { message: text || 'Supabase request failed' };
};

const execute = async <T>(
  table: string,
  init: RequestInit,
  params: URLSearchParams,
  mode: SelectOptions['mode'] = 'list'
): Promise<{ data: T | null; error: SupabaseError | null }> => {
  const { url } = ensureConfig();
  const query = params.toString();
  const endpoint = `${url}/rest/v1/${table}${query ? `?${query}` : ''}`;

  const response = await fetch(endpoint, init);

  if (!response.ok) {
    return { data: null, error: await parseError(response) };
  }

  if (response.status === 204) {
    return { data: null, error: null };
  }

  const payload = await response.json();

  if (mode === 'single') {
    return { data: (payload ?? null) as T | null, error: null };
  }

  if (mode === 'maybeSingle') {
    if (!payload) {
      return { data: null, error: null };
    }

    if (Array.isArray(payload)) {
      return { data: (payload[0] ?? null) as T | null, error: null };
    }

    return { data: (payload ?? null) as T | null, error: null };
  }

  return { data: (payload ?? null) as T | null, error: null };
};

export const supabaseSelect = async <T>(
  table: string,
  options: SelectOptions = {}
): Promise<{ data: T | null; error: SupabaseError | null }> => {
  const params = buildQueryParams(options);
  const headers = buildHeaders(false);
  headers.Accept = options.mode === 'single' ? 'application/vnd.pgrst.object+json' : 'application/json';

  return execute<T>(table, { method: 'GET', headers }, params, options.mode);
};

export const supabaseInsert = async <T>(
  table: string,
  payload: unknown,
  options: MutateOptions = {}
): Promise<{ data: T | null; error: SupabaseError | null }> => {
  const params = buildQueryParams(options);
  const headers = buildHeaders(true);
  const body = JSON.stringify(payload);

  return execute<T>(table, { method: 'POST', headers, body }, params, 'maybeSingle');
};

export const supabaseUpdate = async (
  table: string,
  payload: unknown,
  options: MutateOptions = {}
): Promise<{ error: SupabaseError | null }> => {
  const params = buildQueryParams(options);
  const headers = buildHeaders(options.returnRepresentation ?? false);
  const body = JSON.stringify(payload);

  const { error } = await execute(table, { method: 'PATCH', headers, body }, params, options.returnRepresentation ? 'list' : 'maybeSingle');
  return { error };
};

export const supabaseDelete = async (
  table: string,
  options: MutateOptions = {}
): Promise<{ error: SupabaseError | null }> => {
  const params = buildQueryParams(options);
  const headers = buildHeaders(false);
  headers.Prefer = 'return=minimal';

  const { error } = await execute(table, { method: 'DELETE', headers }, params, 'list');
  return { error };
};
