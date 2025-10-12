<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15FPnpECp6G1ENImCKFUVJkjIv4bMYriF

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies: `npm install`
2. Create a Supabase project and set the following environment variables in `.env.local`:

   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-key
   ```

3. Provision the required tables inside Supabase (SQL Editor → run the snippet below):

   ```sql
   create table if not exists public.profiles (
     id text primary key,
     email text unique not null,
     password text,
     name text,
     avatar_url text,
     bio text,
     following text[] default array[]::text[],
     followers text[] default array[]::text[]
   );

   create table if not exists public.posts (
     id text primary key,
     author_id text references public.profiles(id) on delete cascade,
     image_url text not null,
     caption text,
     location_tag text,
     likes text[] default array[]::text[],
     is_bookmarked boolean default false,
     comments jsonb default '[]'::jsonb,
     views text[] default array[]::text[],
     created_at timestamp with time zone default timezone('utc', now())
   );

   alter table public.profiles enable row level security;
   alter table public.posts enable row level security;

   create policy "Public read profiles" on public.profiles
     for select using (true);

   create policy "Public read posts" on public.posts
     for select using (true);

   create policy "Anyone can insert profiles" on public.profiles
     for insert with check (true);

   create policy "Anyone can insert posts" on public.posts
     for insert with check (true);

   create policy "Anyone can update profiles" on public.profiles
     for update using (true) with check (true);

   create policy "Anyone can update posts" on public.posts
     for update using (true) with check (true);

   create policy "Anyone can delete posts" on public.posts
     for delete using (true);
   ```

   _Tip:_ enable Realtime for the `profiles` and `posts` tables so every mutation is pushed instantly to all connected clients.

4. Run the app: `npm run dev`
