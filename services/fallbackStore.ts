import type { Post, User } from '../types';

type FallbackUser = User & { password: string };

type FallbackComment = {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
};

type FallbackPost = {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string;
  locationTag: string;
  likes: string[];
  isBookmarked: boolean;
  comments: FallbackComment[];
  views: string[];
  createdAt: string;
};

const cloneUser = (user: FallbackUser): User => ({
  id: user.id,
  name: user.name,
  avatarUrl: user.avatarUrl,
  email: user.email,
  bio: user.bio,
  following: [...user.following],
  followers: [...user.followers],
});

const createInitialUsers = (): FallbackUser[] => [
  {
    id: 'user-123',
    name: 'KopiLover',
    avatarUrl:
      'https://images.pexels.com/photos/1844547/pexels-photo-1844547.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    email: 'goresf19@gmail.com',
    bio: 'Pecinta kopi dan senja.',
    following: ['user-456'],
    followers: ['user-456'],
    password: 'password123',
  },
  {
    id: 'user-456',
    name: 'Andi Pratama',
    avatarUrl:
      'https://images.pexels.com/photos/837358/pexels-photo-837358.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    email: 'andi@example.com',
    bio: 'Barista & Roaster.',
    following: ['user-123'],
    followers: ['user-123'],
    password: 'password123',
  },
  {
    id: 'user-789',
    name: 'CoffeeAddict',
    avatarUrl:
      'https://images.pexels.com/photos/842980/pexels-photo-842980.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    email: 'addict@example.com',
    bio: 'Exploring beans.',
    following: [],
    followers: [],
    password: 'password123',
  },
];

const createInitialPosts = (): FallbackPost[] => [
  {
    id: 'post_mock_1',
    authorId: 'user-456',
    imageUrl:
      'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Seni latte hari ini. Mencoba pola baru!',
    locationTag: 'Roast & Co.',
    likes: ['user-123', 'user-789'],
    isBookmarked: false,
    comments: [
      {
        id: 'comment_mock_1',
        text: 'Keren banget, bro!',
        authorId: 'user-123',
        createdAt: new Date().toISOString(),
      },
    ],
    views: ['user-123', 'user-456', 'user-789'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'post_mock_2',
    authorId: 'user-123',
    imageUrl:
      'https://images.pexels.com/photos/1235717/pexels-photo-1235717.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Menikmati secangkir V60 di pagi yang cerah. Sempurna.',
    locationTag: 'Rumah',
    likes: ['user-456'],
    isBookmarked: true,
    comments: [],
    views: ['user-123', 'user-456'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'post_mock_3',
    authorId: 'user-789',
    imageUrl:
      'https://images.pexels.com/photos/373639/pexels-photo-373639.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Biji kopi Ethiopia baru, aromanya luar biasa!',
    locationTag: 'Kopi Kenangan',
    likes: [],
    isBookmarked: false,
    comments: [],
    views: ['user-789'],
    createdAt: new Date().toISOString(),
  },
];

let users: FallbackUser[] = createInitialUsers();
let posts: FallbackPost[] = createInitialPosts();

const getUserById = (id: string): FallbackUser | undefined => users.find(user => user.id === id);

const ensureUser = (id: string): FallbackUser => {
  const user = getUserById(id);
  if (!user) {
    throw new Error('Pengguna tidak ditemukan');
  }
  return user;
};

const mapComment = (comment: FallbackComment) => ({
  id: comment.id,
  text: comment.text,
  author: cloneUser(ensureUser(comment.authorId)),
});

const mapPost = (post: FallbackPost): Post => ({
  id: post.id,
  author: cloneUser(ensureUser(post.authorId)),
  imageUrl: post.imageUrl,
  caption: post.caption,
  locationTag: post.locationTag,
  likes: [...post.likes],
  isBookmarked: post.isBookmarked,
  comments: post.comments.map(mapComment),
  views: [...post.views],
});

const generateId = () => `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getUsersSnapshot = () => users.map(cloneUser);

const getPostsSnapshot = () => posts.map(mapPost);

export const fallbackSeeds = {
  getUsers: (): User[] => getUsersSnapshot(),
  getPosts: (): Post[] => getPostsSnapshot(),
};

export const fallbackApi = {
  reset: () => {
    users = createInitialUsers();
    posts = createInitialPosts();
  },
  getUsers: async (): Promise<User[]> => getUsersSnapshot(),
  signup: async (email: string, password: string) => {
    const existing = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: false, message: 'Email sudah terdaftar.' };
    }

    const id = generateId();
    const name = email.split('@')[0] || 'Pengguna';
    const user: FallbackUser = {
      id,
      email,
      password,
      name,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      bio: '',
      following: [],
      followers: [],
    };

    users = [...users, user];
    return { success: true, user: cloneUser(user) };
  },
  login: async (email: string, password: string) => {
    const user = users.find(candidate => candidate.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      return { success: false, message: 'Email atau kata sandi salah.' };
    }

    return { success: true, user: cloneUser(user) };
  },
  updateUser: async (userId: string, data: Partial<User>) => {
    const user = ensureUser(userId);
    if (data.name !== undefined) user.name = data.name;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.following !== undefined) user.following = [...data.following];
    if (data.followers !== undefined) user.followers = [...data.followers];

    return { success: true, user: cloneUser(user) };
  },
  toggleFollow: async (userId: string, targetUserId: string) => {
    if (userId === targetUserId) {
      return { success: false, message: 'Tidak dapat mengikuti diri sendiri.' };
    }

    const user = ensureUser(userId);
    const target = ensureUser(targetUserId);

    const isFollowing = user.following.includes(targetUserId);
    user.following = isFollowing
      ? user.following.filter(id => id !== targetUserId)
      : [...user.following, targetUserId];

    target.followers = isFollowing
      ? target.followers.filter(id => id !== userId)
      : [...target.followers, userId];

    return { success: true, users: getUsersSnapshot() };
  },
  getPosts: async (): Promise<Post[]> => getPostsSnapshot(),
  getPostById: async (postId: string): Promise<Post> => {
    const post = posts.find(item => item.id === postId);
    if (!post) {
      throw new Error('Post tidak ditemukan');
    }
    return mapPost(post);
  },
  createPost: async (data: { authorId: string; imageUrl: string; caption: string; locationTag: string }) => {
    ensureUser(data.authorId);
    const post: FallbackPost = {
      id: generateId(),
      authorId: data.authorId,
      imageUrl: data.imageUrl,
      caption: data.caption,
      locationTag: data.locationTag,
      likes: [],
      isBookmarked: false,
      comments: [],
      views: [],
      createdAt: new Date().toISOString(),
    };

    posts = [post, ...posts];
    return { success: true, post: mapPost(post) };
  },
  updatePost: async (postId: string, data: { caption?: string; locationTag?: string }) => {
    const post = posts.find(item => item.id === postId);
    if (!post) {
      throw new Error('Post tidak ditemukan');
    }

    if (data.caption !== undefined) {
      post.caption = data.caption;
    }
    if (data.locationTag !== undefined) {
      post.locationTag = data.locationTag;
    }

    return { success: true, post: mapPost(post) };
  },
  deletePost: async (postId: string) => {
    posts = posts.filter(item => item.id !== postId);
    return { success: true };
  },
  toggleLike: async (postId: string, userId: string) => {
    ensureUser(userId);
    const post = posts.find(item => item.id === postId);
    if (!post) {
      throw new Error('Post tidak ditemukan');
    }

    const hasLiked = post.likes.includes(userId);
    post.likes = hasLiked ? post.likes.filter(id => id !== userId) : [...post.likes, userId];

    return { success: true, post: mapPost(post) };
  },
  toggleBookmark: async (postId: string) => {
    const post = posts.find(item => item.id === postId);
    if (!post) {
      throw new Error('Post tidak ditemukan');
    }

    post.isBookmarked = !post.isBookmarked;
    return { success: true, post: mapPost(post) };
  },
  incrementView: async (postId: string, userId: string) => {
    ensureUser(userId);
    const post = posts.find(item => item.id === postId);
    if (!post) {
      throw new Error('Post tidak ditemukan');
    }

    if (!post.views.includes(userId)) {
      post.views = [...post.views, userId];
    }

    return { success: true, post: mapPost(post) };
  },
  addComment: async (postId: string, userId: string, text: string) => {
    ensureUser(userId);
    const post = posts.find(item => item.id === postId);
    if (!post) {
      throw new Error('Post tidak ditemukan');
    }

    const comment: FallbackComment = {
      id: generateId(),
      text,
      authorId: userId,
      createdAt: new Date().toISOString(),
    };

    post.comments = [...post.comments, comment];
    return { success: true, comment: { id: comment.id }, post: mapPost(post) };
  },
};
