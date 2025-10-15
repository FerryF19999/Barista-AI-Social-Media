-- Seed data to mirror the local fallback store so the UI has content immediately

insert into public.profiles (id, email_address, password, name, avatar_url, bio, following, followers)
values
  ('user-123', 'goresf19@gmail.com', 'password123', 'KopiLover',
   'https://images.pexels.com/photos/1844547/pexels-photo-1844547.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
   'Pecinta kopi dan senja.', ARRAY['user-456'], ARRAY['user-456']),
  ('user-456', 'andi@example.com', 'password123', 'Andi Pratama',
   'https://images.pexels.com/photos/837358/pexels-photo-837358.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
   'Barista & Roaster.', ARRAY['user-123'], ARRAY['user-123']),
  ('user-789', 'addict@example.com', 'password123', 'CoffeeAddict',
   'https://images.pexels.com/photos/842980/pexels-photo-842980.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
   'Exploring beans.', ARRAY[]::text[], ARRAY[]::text[])
  on conflict (id) do update
  set email_address = excluded.email_address,
      password = excluded.password,
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      bio = excluded.bio,
      following = excluded.following,
      followers = excluded.followers;

insert into public.posts (id, author_id, image_url, caption, location_tag, likes, is_bookmarked, comments, views, created_at)
values
  ('post_mock_1', 'user-456',
   'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600',
   'Seni latte hari ini. Mencoba pola baru!',
   'Roast & Co.', ARRAY['user-123', 'user-789'], false,
   jsonb_build_array(jsonb_build_object(
     'id', 'comment_mock_1',
     'text', 'Keren banget, bro!',
     'authorId', 'user-123',
     'createdAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')
   )),
   ARRAY['user-123', 'user-456', 'user-789'], timezone('utc', now()) - interval '2 days'),
  ('post_mock_2', 'user-123',
   'https://images.pexels.com/photos/1235717/pexels-photo-1235717.jpeg?auto=compress&cs=tinysrgb&w=600',
   'Menikmati secangkir V60 di pagi yang cerah. Sempurna.',
   'Rumah', ARRAY['user-456'], true,
   '[]'::jsonb,
   ARRAY['user-123', 'user-456'], timezone('utc', now()) - interval '1 day'),
  ('post_mock_3', 'user-789',
   'https://images.pexels.com/photos/373639/pexels-photo-373639.jpeg?auto=compress&cs=tinysrgb&w=600',
   'Biji kopi Ethiopia baru, aromanya luar biasa!',
   'Kopi Kenangan', ARRAY[]::text[], false,
   '[]'::jsonb,
   ARRAY['user-789'], timezone('utc', now()) - interval '12 hours')
  on conflict (id) do update
  set author_id = excluded.author_id,
      image_url = excluded.image_url,
      caption = excluded.caption,
      location_tag = excluded.location_tag,
      likes = excluded.likes,
      is_bookmarked = excluded.is_bookmarked,
      comments = excluded.comments,
      views = excluded.views,
      created_at = excluded.created_at;
