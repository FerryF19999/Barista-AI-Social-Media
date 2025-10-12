#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACTION_MAP = {
  migrate: path.resolve(__dirname, '../supabase/migrations/20241011120000_init.sql'),
  seed: path.resolve(__dirname, '../supabase/seed.sql'),
  all: [
    path.resolve(__dirname, '../supabase/migrations/20241011120000_init.sql'),
    path.resolve(__dirname, '../supabase/seed.sql'),
  ],
};

const action = process.argv[2] ?? 'all';

if (!ACTION_MAP[action]) {
  const available = Object.keys(ACTION_MAP).join(', ');
  console.error(`Unknown action "${action}". Use one of: ${available}.`);
  process.exitCode = 1;
  process.exit();
}

const DB_URL_KEYS = ['SUPABASE_DB_URL', 'DATABASE_URL'];
const DOTENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env.development.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../.env.development.local'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../supabase/.env'),
];

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

const findConnectionStringIn = (record, sourceLabel) => {
  for (const key of DB_URL_KEYS) {
    const value = record?.[key];
    if (value) {
      return { value, source: `${sourceLabel} (${key})` };
    }
  }
  return null;
};

const fromProcessEnv = () => findConnectionStringIn(process.env, 'environment variable');

const fromDotenvFiles = () => {
  for (const candidate of DOTENV_CANDIDATES) {
    const record = parseDotenv(candidate);
    const resolved = findConnectionStringIn(record, path.relative(process.cwd(), candidate));
    if (resolved) {
      return resolved;
    }
  }
  return null;
};

const updateEnvFile = (filePath, key, value) => {
  let contents = '';

  if (fs.existsSync(filePath)) {
    contents = fs.readFileSync(filePath, 'utf8');
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedKey}=.*$`, 'm');

  if (pattern.test(contents)) {
    contents = contents.replace(pattern, `${key}=${value}`);
  } else {
    const prefix = contents.length && !contents.endsWith('\n') ? '\n' : '';
    contents = `${contents}${prefix}${key}=${value}\n`;
  }

  fs.writeFileSync(filePath, contents);
};

const promptForConnectionString = async () => {
  if (!process.stdin.isTTY) {
    return null;
  }

  console.log(
    'Paste the Supabase database connection string (Project Settings → Database → Connection string → URI).'
  );

  const rl = createInterface({ input, output });

  try {
    const value = (await rl.question('Connection string: ')).trim();

    if (!value) {
      return null;
    }

    const save = (await rl.question('Save to .env.local for future runs? (y/N) ')).trim().toLowerCase();

    if (save === 'y' || save === 'yes') {
      const target = path.resolve(process.cwd(), '.env.local');
      updateEnvFile(target, DB_URL_KEYS[0], value);
      console.log(`Saved Supabase connection string to ${path.relative(process.cwd(), target)}.`);
      return { value, source: `.env.local (${DB_URL_KEYS[0]})` };
    }

    return { value, source: 'interactive input' };
  } finally {
    rl.close();
  }
};

const resolveConnectionString = async () => {
  return fromProcessEnv() ?? fromDotenvFiles() ?? (await promptForConnectionString());
};

const resolvedConnection = await resolveConnectionString();

if (!resolvedConnection?.value) {
  console.error(
    'Missing Supabase connection string. Provide SUPABASE_DB_URL/DATABASE_URL or paste it when prompted.'
  );
  process.exitCode = 1;
  process.exit();
}

const { value: connectionString, source: connectionSource } = resolvedConnection;

if (connectionSource && connectionSource !== 'environment variable') {
  console.log(`Using Supabase connection string from ${connectionSource}.`);
}

const files = Array.isArray(ACTION_MAP[action]) ? ACTION_MAP[action] : [ACTION_MAP[action]];

const run = async () => {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    for (const filePath of files) {
      const sql = fs.readFileSync(filePath, 'utf8');
      const label = path.relative(process.cwd(), filePath);

      if (!sql.trim()) {
        console.warn(`Skipped ${label} because the file is empty.`);
        continue;
      }

      console.log(`\nApplying ${label}...`);
      await client.query(sql);
      console.log(`Finished ${label}.`);
    }
  } finally {
    await client.end();
  }
};

run()
  .then(() => {
    console.log('\nSupabase schema update complete.');
  })
  .catch((error) => {
    console.error('\nFailed to apply Supabase schema:', error.message);
    process.exitCode = 1;
  });
