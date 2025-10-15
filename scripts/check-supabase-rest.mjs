#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const URL_KEYS = ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'];
const KEY_KEYS = ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'];
const DOTENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env.development.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'supabase/.env'),
];

const FALLBACK_URL = 'https://jfanrxopqcsknnqlzmlv.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYW5yeG9wcWNza25ucWx6bWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDY2ODgsImV4cCI6MjA3NTgyMjY4OH0.ph4V7lXH6acslBu20uQxGpYE5CyNCFqrf2eQQleH7ng';

const parseDotenv = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
};

const dotenvValues = DOTENV_CANDIDATES.map(parseDotenv);

const resolveValue = (keys) => {
  for (const key of keys) {
    if (process.env[key]) {
      return { value: process.env[key], source: `process.env(${key})` };
    }

    for (const record of dotenvValues) {
      if (record[key]) {
        return { value: record[key], source: key };
      }
    }
  }

  return { value: '', source: '' };
};

const urlResult = resolveValue(URL_KEYS);
const keyResult = resolveValue(KEY_KEYS);

const missing = [];
if (!urlResult.value) missing.push('Supabase URL');
if (!keyResult.value) missing.push('Supabase anon key');

if (missing.length) {
  console.error(`Missing ${missing.join(' and ')}. Set the variables in .env.local or your shell before running this check.`);
  process.exitCode = 1;
  process.exit();
}

if (urlResult.value === FALLBACK_URL && keyResult.value === FALLBACK_KEY) {
  console.warn('Using the built-in demo Supabase project. Provide your own credentials to verify your project connection.');
}

const joinUrl = (base, pathFragment) => {
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${pathFragment.startsWith('/') ? '' : '/'}${pathFragment}`;
};

const run = async () => {
  const restEndpoint = joinUrl(urlResult.value, '/rest/v1/profiles?select=id&limit=1');
  const headers = {
    apikey: keyResult.value,
    Authorization: `Bearer ${keyResult.value}`,
    Accept: 'application/json',
  };

  console.log(`Checking Supabase REST access via ${restEndpoint}...`);

  const response = await fetch(restEndpoint, { headers });

  if (response.ok) {
    const body = await response.json();
    console.log('Supabase REST endpoint responded successfully.');
    console.log(`Found ${Array.isArray(body) ? body.length : 0} profile rows (limit 1).`);
    console.log('\nYou can now run `npm run supabase:seed` to insert demo data or use the app UI to create posts.');
    return;
  }

  const contentType = response.headers.get('content-type') ?? '';
  let message = await response.text();
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed?.message) {
        message = parsed.message;
      }
    } catch (error) {
      // ignore parse errors and fall back to raw text
    }
  }

  const statusLine = `${response.status} ${response.statusText}`.trim();
  console.error(`Supabase REST request failed (${statusLine}).`);
  if (message) {
    console.error(message);
  }

  if (response.status === 404) {
    console.error('The profiles table may not exist yet. Run `npm run supabase:migrate` to create the required schema.');
  } else if (response.status === 401) {
    console.error('Authentication failed. Double-check that NEXT_PUBLIC_SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY) is valid.');
  }

  process.exitCode = 1;
};

run().catch((error) => {
  console.error('Unexpected error while checking Supabase connectivity:', error.message);
  process.exitCode = 1;
});
