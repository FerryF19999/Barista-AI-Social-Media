import type { Comment, Post, User } from '../types';
import { supabaseDelete, supabaseInsert, supabaseSelect, supabaseUpdate } from './supabaseRest';

interface ProfileRow {
  id: string;
  email_address: string;
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
  const name = row.name ?? row.email_address.split('@')[0] ?? 'Pengguna';
  return {
    id: row.id,
    name,
    email: row.email_address,
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

const withSupabase = async <T>(attempt: () => Promise<T>): Promise<T> => {
  try {
    return await attempt();
  } catch (error) {
    throw error instanceof Error ? error : new Error('Supabase request failed');
  }
};

const buildUserMap = async (userIds: string[]): Promise<Map<string, User>> => {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueIds.length === 0) {
    return new Map();
  }

  return withSupabase(async () => {
    const { data, error } = await supabaseSelect<ProfileRow[]>(
      'profiles',
      {
        filters: [
          {
            type: 'in',
            column: 'id',
            values: uniqueIds,
          },
        ],
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    const map = new Map<string, User>();
    (data ?? []).forEach(row => {
      map.set(row.id, mapProfileRowToUser(row));
    });

    return map;
  });
};

const transformPostRows = async (rows: PostRow[]): Promise<Post[]> => {
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

const getPostById = async (postId: string): Promise<Post> =>
  withSupabase(async () => {
    const { data, error } = await supabaseSelect<PostRow>('posts', {
      filters: [
        {
          type: 'eq',
          column: 'id',
          value: postId,
        },
      ],
      mode: 'maybeSingle',
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Post tidak ditemukan');
    }

    const posts = await transformPostRows([data]);
    return posts[0];
  });

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const api = {
  getUsers: async (): Promise<User[]> =>
    withSupabase(async () => {
      const { data, error } = await supabaseSelect<ProfileRow[]>(
        'profiles',
        {
          orderBy: { column: 'name', ascending: true },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapProfileRowToUser);
    }),
  signup: async (email: string, password: string) =>
    withSupabase(async () => {
      const { data: existing, error: existingError } = await supabaseSelect<Pick<ProfileRow, 'id'>>(
        'profiles',
        {
          columns: 'id',
          filters: [
            {
              type: 'eq',
              column: 'email_address',
              value: email,
            },
          ],
          mode: 'maybeSingle',
        }
      );

      if (existingError) {
        throw new Error(existingError.message);
      }

      if (existing) {
        return { success: false, message: 'Email sudah terdaftar.' };
      }

      const id = generateId();
      const name = email.split('@')[0];

      const { data, error } = await supabaseInsert<ProfileRow>('profiles', {
        id,
        email_address: email,
        password,
        name,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        bio: '',
        following: [],
        followers: [],
      });

      if (error) {
        throw new Error(error.message);
      }

      const user = mapProfileRowToUser(data as ProfileRow);
      return { success: true, user };
    }),
  login: async (email: string, password: string) =>
    withSupabase(async () => {
      const { data, error } = await supabaseSelect<ProfileRow>('profiles', {
        filters: [
          {
            type: 'eq',
            column: 'email_address',
            value: email,
          },
        ],
        mode: 'maybeSingle',
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return { success: false, message: 'Email atau kata sandi salah.' };
      }

      if (data.password !== password) {
        return { success: false, message: 'Email atau kata sandi salah.' };
      }

      const user = mapProfileRowToUser(data);
      return { success: true, user };
    }),
  updateUser: async (userId: string, data: Partial<User>) =>
    withSupabase(async () => {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
      if (data.bio !== undefined) payload.bio = data.bio;
      if (data.following !== undefined) payload.following = data.following;
      if (data.followers !== undefined) payload.followers = data.followers;

      const { error } = await supabaseUpdate('profiles', payload, {
        filters: [
          {
            type: 'eq',
            column: 'id',
            value: userId,
          },
        ],
      });

      if (error) {
        throw new Error(error.message);
      }

      const { data: updated, error: fetchError } = await supabaseSelect<ProfileRow>('profiles', {
        filters: [
          {
            type: 'eq',
            column: 'id',
            value: userId,
          },
        ],
        mode: 'maybeSingle',
      });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!updated) {
        throw new Error('Pengguna tidak ditemukan');
      }

      return { success: true, user: mapProfileRowToUser(updated) };
    }),
  toggleFollow: async (userId: string, targetUserId: string) =>
    withSupabase(async () => {
      const { data, error } = await supabaseSelect<Pick<ProfileRow, 'id' | 'following' | 'followers'>[]>(
        'profiles',
        {
          columns: 'id, following, followers',
          filters: [
            {
              type: 'in',
              column: 'id',
              values: [userId, targetUserId],
            },
          ],
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const rows = data ?? [];
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

      const results = await Promise.all([
        supabaseUpdate('profiles', { following: updatedFollowing }, {
          filters: [
            { type: 'eq', column: 'id', value: userId },
          ],
        }),
        supabaseUpdate('profiles', { followers: updatedFollowers }, {
          filters: [
            { type: 'eq', column: 'id', value: targetUserId },
          ],
        }),
      ]);

      const failed = results.find(result => result.error);
      if (failed && failed.error) {
        throw new Error(failed.error.message);
      }

      const users = await api.getUsers();
      return { success: true, users };
    }),
  getPosts: async (): Promise<Post[]> =>
    withSupabase(async () => {
      const { data, error } = await supabaseSelect<PostRow[]>(
        'posts',
        {
          orderBy: { column: 'created_at', ascending: false },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return transformPostRows(data ?? []);
    }),
  createPost: async (data: { authorId: string; imageUrl: string; caption: string; locationTag: string }) =>
    withSupabase(async () => {
      const row: PostRow = {
        id: generateId(),
        author_id: data.authorId,
        image_url: data.imageUrl,
        caption: data.caption,
        location_tag: data.locationTag,
        likes: [],
        is_bookmarked: false,
        comments: [],
        views: [],
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabaseInsert<PostRow>('posts', row);

      if (error) {
        throw new Error(error.message);
      }

      const posts = await transformPostRows([inserted as PostRow]);
      return { success: true, post: posts[0] };
    }),
  updatePost: async (postId: string, data: { caption?: string; locationTag?: string }) =>
    withSupabase(async () => {
      const payload: Record<string, unknown> = {};
      if (data.caption !== undefined) payload.caption = data.caption;
      if (data.locationTag !== undefined) payload.location_tag = data.locationTag;

      const { error } = await supabaseUpdate('posts', payload, {
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
      });

      if (error) {
        throw new Error(error.message);
      }

      const post = await getPostById(postId);
      return { success: true, post };
    }),
  deletePost: async (postId: string) =>
    withSupabase(async () => {
      const { error } = await supabaseDelete('posts', {
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    }),
  toggleLike: async (postId: string, userId: string) =>
    withSupabase(async () => {
      const { data, error } = await supabaseSelect<Pick<PostRow, 'likes'>>('posts', {
        columns: 'likes',
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
        mode: 'maybeSingle',
      });

      if (error) {
        throw new Error(error.message);
      }

      const likes = (data?.likes ?? []).filter(Boolean);
      const hasLiked = likes.includes(userId);
      const updatedLikes = hasLiked ? likes.filter(id => id !== userId) : [...likes, userId];

      const { error: updateError } = await supabaseUpdate('posts', { likes: updatedLikes }, {
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      const post = await getPostById(postId);
      return { success: true, post };
    }),
  toggleBookmark: async (postId: string) =>
    withSupabase(async () => {
      const { data, error } = await supabaseSelect<Pick<PostRow, 'is_bookmarked'>>('posts', {
        columns: 'is_bookmarked',
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
        mode: 'maybeSingle',
      });

      if (error) {
        throw new Error(error.message);
      }

      const isBookmarked = Boolean(data?.is_bookmarked);

      const { error: updateError } = await supabaseUpdate('posts', { is_bookmarked: !isBookmarked }, {
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      const post = await getPostById(postId);
      return { success: true, post };
    }),
  incrementView: async (postId: string, userId: string) =>
    withSupabase(async () => {
      const { data, error } = await supabaseSelect<Pick<PostRow, 'views'>>('posts', {
        columns: 'views',
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
        mode: 'maybeSingle',
      });

      if (error) {
        throw new Error(error.message);
      }

      const views = (data?.views ?? []).filter(Boolean);

      if (!views.includes(userId)) {
        views.push(userId);
        const { error: updateError } = await supabaseUpdate('posts', { views }, {
          filters: [
            { type: 'eq', column: 'id', value: postId },
          ],
        });

        if (updateError) {
          throw new Error(updateError.message);
        }
      }

      const post = await getPostById(postId);
      return { success: true, post };
    }),
  addComment: async (postId: string, userId: string, text: string) =>
    withSupabase(async () => {
      const { data, error } = await supabaseSelect<Pick<PostRow, 'comments'>>('posts', {
        columns: 'comments',
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
        mode: 'maybeSingle',
      });

      if (error) {
        throw new Error(error.message);
      }

      const comments = (data?.comments ?? []) as CommentRow[];
      const comment: CommentRow = {
        id: generateId(),
        text,
        author_id: userId,
        created_at: new Date().toISOString(),
      };

      const updatedComments = [...comments, comment];

      const { error: updateError } = await supabaseUpdate('posts', { comments: updatedComments }, {
        filters: [
          { type: 'eq', column: 'id', value: postId },
        ],
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      const post = await getPostById(postId);
      return { success: true, comment: { id: comment.id }, post };
    }),
};
