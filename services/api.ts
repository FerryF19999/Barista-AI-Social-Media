import { getSupabaseClient } from './supabaseClient';
import type { Comment, Post, User } from '../types';

interface ProfileRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  following: string[] | null;
  followers: string[] | null;
  password: string | null;
}

interface CommentRow {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
}

interface PostRow {
  id: string;
  author_id: string;
  image_url: string;
  caption: string | null;
  location_tag: string | null;
  likes: string[] | null;
  is_bookmarked: boolean | null;
  comments: CommentRow[] | null;
  views: string[] | null;
  created_at: string;
}

const createPlaceholderUser = (id: string): User => ({
  id,
  name: 'Pengguna',
  email: '',
  avatarUrl: '',
  bio: undefined,
  following: [],
  followers: [],
});

const mapProfileRowToUser = (row: ProfileRow): User => {
  const name = row.name ?? row.email.split('@')[0] ?? 'Pengguna';
  return {
    id: row.id,
    name,
    email: row.email,
    avatarUrl: row.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
    bio: row.bio ?? undefined,
    following: row.following ?? [],
    followers: row.followers ?? [],
  };
};

const mapCommentRowToComment = (row: CommentRow, userMap: Map<string, User>): Comment => {
  const author = userMap.get(row.author_id) ?? createPlaceholderUser(row.author_id);
  return {
    id: row.id,
    text: row.text,
    author,
  };
};

const mapPostRowToPost = (row: PostRow, userMap: Map<string, User>): Post => {
  const author = userMap.get(row.author_id) ?? createPlaceholderUser(row.author_id);
  const comments = (row.comments ?? []).map(comment => mapCommentRowToComment(comment, userMap));

  return {
    id: row.id,
    author,
    imageUrl: row.image_url,
    caption: row.caption ?? '',
    locationTag: row.location_tag ?? '',
    likes: row.likes ?? [],
    isBookmarked: Boolean(row.is_bookmarked),
    comments,
    views: row.views ?? [],
  };
};

const buildUserMap = async (userIds: string[]): Promise<Map<string, User>> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client.from('profiles').select('*').in('id', uniqueIds);
  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, User>();
  (data as ProfileRow[]).forEach(row => {
    map.set(row.id, mapProfileRowToUser(row));
  });

  return map;
};

const transformPostRows = async (rows: PostRow[]): Promise<Post[]> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  if (rows.length === 0) {
    return [];
  }

  const userIds = new Set<string>();
  rows.forEach(row => {
    userIds.add(row.author_id);
    (row.comments ?? []).forEach(comment => userIds.add(comment.author_id));
  });

  const userMap = await buildUserMap(Array.from(userIds));
  return rows.map(row => mapPostRowToPost(row, userMap));
};

const getPostById = async (postId: string): Promise<Post> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await client.from('posts').select('*').eq('id', postId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Post tidak ditemukan');
  }

  const posts = await transformPostRows([data as PostRow]);
  return posts[0];
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const ensureClient = () => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return client;
};

export const api = {
  getUsers: async (): Promise<User[]> => {
    const client = ensureClient();
    const { data, error } = await client.from('profiles').select('*').order('name', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data as ProfileRow[]).map(mapProfileRowToUser);
  },
  signup: async (email: string, password: string) => {
    const client = ensureClient();

    const { data: existing, error: existingError } = await client
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      return { success: false, message: 'Email sudah terdaftar.' };
    }

    const id = generateId();
    const name = email.split('@')[0];

    const { data, error } = await client
      .from('profiles')
      .insert({
        id,
        email,
        password,
        name,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        bio: '',
        following: [],
        followers: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const user = mapProfileRowToUser(data as ProfileRow);
    return { success: true, user };
  },
  login: async (email: string, password: string) => {
    const client = ensureClient();

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return { success: false, message: 'Email atau kata sandi salah.' };
    }

    const row = data as ProfileRow;
    if (row.password !== password) {
      return { success: false, message: 'Email atau kata sandi salah.' };
    }

    const user = mapProfileRowToUser(row);
    return { success: true, user };
  },
  updateUser: async (userId: string, data: Partial<User>) => {
    const client = ensureClient();
    const payload: Record<string, unknown> = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.following !== undefined) payload.following = data.following;
    if (data.followers !== undefined) payload.followers = data.followers;

    const { error } = await client.from('profiles').update(payload).eq('id', userId);
    if (error) {
      throw new Error(error.message);
    }

    const { data: updated, error: fetchError } = await client.from('profiles').select('*').eq('id', userId).single();
    if (fetchError) {
      throw new Error(fetchError.message);
    }

    return { success: true, user: mapProfileRowToUser(updated as ProfileRow) };
  },
  toggleFollow: async (userId: string, targetUserId: string) => {
    const client = ensureClient();

    const { data, error } = await client
      .from('profiles')
      .select('id, following, followers')
      .in('id', [userId, targetUserId]);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data as Pick<ProfileRow, 'id' | 'following' | 'followers'>[];
    const currentUser = rows.find(row => row.id === userId);
    const targetUser = rows.find(row => row.id === targetUserId);

    if (!currentUser || !targetUser) {
      throw new Error('Pengguna tidak ditemukan');
    }

    const following = currentUser.following ?? [];
    const followers = targetUser.followers ?? [];
    const isFollowing = following.includes(targetUserId);

    const updatedFollowing = isFollowing
      ? following.filter(id => id !== targetUserId)
      : [...following, targetUserId];

    const updatedFollowers = isFollowing
      ? followers.filter(id => id !== userId)
      : [...followers, userId];

    const updates = [
      client.from('profiles').update({ following: updatedFollowing }).eq('id', userId),
      client.from('profiles').update({ followers: updatedFollowers }).eq('id', targetUserId),
    ];

    const results = await Promise.all(updates);
    const failed = results.find(result => result.error);
    if (failed && failed.error) {
      throw new Error(failed.error.message);
    }

    const users = await api.getUsers();
    return { success: true, users };
  },
  getPosts: async (): Promise<Post[]> => {
    const client = ensureClient();
    const { data, error } = await client.from('posts').select('*').order('created_at', { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    return transformPostRows((data as PostRow[]) ?? []);
  },
  createPost: async (data: { authorId: string; imageUrl: string; caption: string; locationTag: string }) => {
    const client = ensureClient();
    const row = {
      id: generateId(),
      author_id: data.authorId,
      image_url: data.imageUrl,
      caption: data.caption,
      location_tag: data.locationTag,
      likes: [],
      is_bookmarked: false,
      comments: [],
      views: [],
    };

    const { data: inserted, error } = await client.from('posts').insert(row).select().single();
    if (error) {
      throw new Error(error.message);
    }

    const posts = await transformPostRows([inserted as PostRow]);
    return { success: true, post: posts[0] };
  },
  updatePost: async (postId: string, data: { caption?: string; locationTag?: string }) => {
    const client = ensureClient();
    const payload: Record<string, unknown> = {};
    if (data.caption !== undefined) payload.caption = data.caption;
    if (data.locationTag !== undefined) payload.location_tag = data.locationTag;

    const { error } = await client.from('posts').update(payload).eq('id', postId);
    if (error) {
      throw new Error(error.message);
    }

    const post = await getPostById(postId);
    return { success: true, post };
  },
  deletePost: async (postId: string) => {
    const client = ensureClient();
    const { error } = await client.from('posts').delete().eq('id', postId);
    if (error) {
      throw new Error(error.message);
    }
    return { success: true };
  },
  toggleLike: async (postId: string, userId: string) => {
    const client = ensureClient();

    const { data, error } = await client.from('posts').select('likes').eq('id', postId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    const likes = ((data as Pick<PostRow, 'likes'> | null)?.likes ?? []).filter(Boolean);
    const hasLiked = likes.includes(userId);
    const updatedLikes = hasLiked ? likes.filter(id => id !== userId) : [...likes, userId];

    const { error: updateError } = await client.from('posts').update({ likes: updatedLikes }).eq('id', postId);
    if (updateError) {
      throw new Error(updateError.message);
    }

    const post = await getPostById(postId);
    return { success: true, post };
  },
  toggleBookmark: async (postId: string) => {
    const client = ensureClient();

    const { data, error } = await client
      .from('posts')
      .select('is_bookmarked')
      .eq('id', postId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const isBookmarked = Boolean((data as Pick<PostRow, 'is_bookmarked'> | null)?.is_bookmarked);

    const { error: updateError } = await client
      .from('posts')
      .update({ is_bookmarked: !isBookmarked })
      .eq('id', postId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const post = await getPostById(postId);
    return { success: true, post };
  },
  incrementView: async (postId: string, userId: string) => {
    const client = ensureClient();

    const { data, error } = await client.from('posts').select('views').eq('id', postId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    const views = ((data as Pick<PostRow, 'views'> | null)?.views ?? []).filter(Boolean);
    if (!views.includes(userId)) {
      views.push(userId);
      const { error: updateError } = await client.from('posts').update({ views }).eq('id', postId);
      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    const post = await getPostById(postId);
    return { success: true, post };
  },
  addComment: async (postId: string, userId: string, text: string) => {
    const client = ensureClient();

    const { data, error } = await client.from('posts').select('comments').eq('id', postId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    const comments = ((data as Pick<PostRow, 'comments'> | null)?.comments ?? []) as CommentRow[];
    const comment: CommentRow = {
      id: generateId(),
      text,
      author_id: userId,
      created_at: new Date().toISOString(),
    };

    const updatedComments = [...comments, comment];

    const { error: updateError } = await client.from('posts').update({ comments: updatedComments }).eq('id', postId);
    if (updateError) {
      throw new Error(updateError.message);
    }

    const post = await getPostById(postId);
    return { success: true, comment: { id: comment.id }, post };
  },
};
