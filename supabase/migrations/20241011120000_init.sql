--
-- ⚠️ Do not paste shell commands such as
--     `npx supabase db push --file supabase/migrations/20241011120000_init.sql`
-- into the Supabase SQL editor. This file contains the SQL statements that the
-- command would execute for you—copy the statements below or run the CLI/
-- `npm run supabase:migrate` task from a terminal instead.

create schema if not exists public;

create table if not exists public.profiles (
  id text primary key,
  email_address text unique not null,
  password text,
  name text,
  avatar_url text,
  bio text,
  following text[] default array[]::text[],
  followers text[] default array[]::text[],
  inserted_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
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
  created_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

create policy if not exists "Public read profiles"
  on public.profiles for select
  using (true);

create policy if not exists "Public read posts"
  on public.posts for select
  using (true);

create policy if not exists "Anyone can insert profiles"
  on public.profiles for insert
  with check (true);

create policy if not exists "Anyone can update profiles"
  on public.profiles for update
  using (true)
  with check (true);

create policy if not exists "Anyone can insert posts"
  on public.posts for insert
  with check (true);

create policy if not exists "Anyone can update posts"
  on public.posts for update
  using (true)
  with check (true);

create policy if not exists "Anyone can delete posts"
  on public.posts for delete
  using (true);

create or replace function public.touch_profiles_updated()
returns trigger as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_timestamp
  before update on public.profiles
  for each row
  execute function public.touch_profiles_updated();
