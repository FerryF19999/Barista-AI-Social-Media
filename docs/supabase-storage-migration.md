# Supabase Storage Migration Guide

This guide walks you through moving the app's user, profile, and post data from the
bundled fallback store into Supabase so every environment reads from the hosted
database.

## Prerequisites

- Node.js and npm installed locally.
- A Supabase project (free tier is fine).
- Access to the project's connection information:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Direct connection string: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`
- The repo cloned locally.

If you have existing content inside the local fallback store (the mock users/posts
that ship with the app), the provided migration scripts can copy that snapshot into
Supabase for you. If you collected real data while running the fallback store in
production, export it to CSV/JSON first so you can re-import it with SQL `COPY`
statements after the schema exists.

## 1. Configure environment variables

1. Create `.env.local` at the repository root if it does not already exist.
2. Add the Supabase credentials so both the Vite app and the scripts can talk to
   your project:

   ```ini
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
   ```

   Replace `<password>` with the actual database password from **Project Settings →
   Database → Connection string → Direct connection**.

## 2. Apply the Supabase schema

Run the automated migration script from the project root:

```bash
npm run supabase:migrate
```

The helper reads `SUPABASE_DB_URL` from `.env.local` (or falls back to your shell)
and applies `supabase/migrations/20241011120000_init.sql`. This creates the
`profiles` and `posts` tables, attaches row-level security policies, and installs the
timestamps trigger required by the app.

If you prefer to run the migration manually, open the SQL file inside the Supabase
SQL Editor and execute it there.

## 3. Seed Supabase with the fallback data (optional)

If you want the hosted database to mirror the demo content that previously lived in
the fallback store, execute:

```bash
npm run supabase:seed
```

This upserts the bundled users and posts into Supabase so your feed immediately
shows data. You can safely re-run the seed—it preserves existing rows with matching
IDs.

For custom datasets, replace the seed script with your export or run SQL `COPY`
commands after adjusting the CSV/JSON files to match the Supabase schema.

## 4. Verify connectivity

Before switching the frontend to Supabase-only mode, confirm the credentials work:

```bash
npm run supabase:check
```

A successful run proves the REST API and row-level security policies allow reads.
If it fails, revisit the environment variables, database password, or migration step.

## 5. Point the app at Supabase

1. Ensure `.env.local` (or `.env`) contains the Supabase URL and anon key from step 1.
2. Stop any local mocks or fallback services—the frontend now reads directly from
   Supabase.
3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Sign up or edit a profile, create a post, and confirm the changes appear in the
   Supabase dashboard under the `profiles` and `posts` tables.

## 6. Enable realtime (optional but recommended)

Open **Database → Replication → Realtime** in the Supabase dashboard and enable
realtime for the `profiles` and `posts` tables. This keeps every connected device in
sync without manual refreshes.

## 7. Clean up legacy storage

Once Supabase holds the canonical data:

- Remove any local JSON/CSV exports you created for the migration.
- Delete `.env.local` entries that point to fallback mocks, if applicable.
- Communicate the Supabase credentials and migration steps to teammates so all
  environments stay in sync.

You have now fully migrated the app's storage to Supabase.
