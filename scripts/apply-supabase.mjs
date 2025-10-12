#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
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

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'Missing Supabase connection string. Set SUPABASE_DB_URL or DATABASE_URL with the value from your project settings.'
  );
  process.exitCode = 1;
  process.exit();
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
