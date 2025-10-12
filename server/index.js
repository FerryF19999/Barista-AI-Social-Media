import { createServer } from 'http';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT || 4000;

// --- Mock Data for Initial Feed ---
const mockUser1 = { id: 'user-123', name: 'KopiLover', avatarUrl: 'https://images.pexels.com/photos/1844547/pexels-photo-1844547.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'goresf19@gmail.com', bio: 'Pecinta kopi dan senja.', following: ['user-456'], followers: ['user-456'] };
const mockUser2 = { id: 'user-456', name: 'Andi Pratama', avatarUrl: 'https://images.pexels.com/photos/837358/pexels-photo-837358.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'andi@example.com', bio: 'Barista & Roaster.', following: ['user-123'], followers: ['user-123'] };
const mockUser3 = { id: 'user-789', name: 'CoffeeAddict', avatarUrl: 'https://images.pexels.com/photos/842980/pexels-photo-842980.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'addict@example.com', bio: 'Exploring beans.', following: [], followers: [] };

let users = [mockUser1, mockUser2, mockUser3];

let posts = [
  {
    id: 'post_mock_1',
    author: mockUser2,
    imageUrl: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Seni latte hari ini. Mencoba pola baru!',
    locationTag: 'Roast & Co.',
    likes: ['user-123', 'user-789'],
    isBookmarked: false,
    comments: [
      { id: 'comment_mock_1', text: 'Keren banget, bro!', author: mockUser1 },
    ],
    views: ['user-123', 'user-456', 'user-789'],
  },
  {
    id: 'post_mock_2',
    author: mockUser1,
    imageUrl: 'https://images.pexels.com/photos/1235717/pexels-photo-1235717.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Menikmati secangkir V60 di pagi yang cerah. Sempurna.',
    locationTag: 'Rumah',
    likes: ['user-456'],
    isBookmarked: true,
    comments: [],
    views: ['user-123', 'user-456'],
  },
  {
    id: 'post_mock_3',
    author: mockUser3,
    imageUrl: 'https://images.pexels.com/photos/373639/pexels-photo-373639.jpeg?auto=compress&cs=tinysrgb&w=600',
    caption: 'Biji kopi Ethiopia baru, aromanya luar biasa!',
    locationTag: 'Kopi Kenangan',
    likes: [],
    isBookmarked: false,
    comments: [],
    views: ['user-789'],
  },
];
// --- End of Mock Data ---

const sseClients = new Set();

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const sseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Access-Control-Allow-Origin': '*',
};

const sendEvent = (type, payload) => {
  const data = `data: ${JSON.stringify({ type, payload })}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
};

const syncAuthorInPosts = (updatedUser) => {
  let postsChanged = false;
  posts = posts.map(post => {
    let changed = false;
    let updatedPost = post;

    if (post.author.id === updatedUser.id) {
      updatedPost = { ...updatedPost, author: updatedUser };
      changed = true;
    }

    const updatedComments = updatedPost.comments.map(comment => {
      if (comment.author.id === updatedUser.id) {
        changed = true;
        return { ...comment, author: updatedUser };
      }
      return comment;
    });

    if (changed) {
      postsChanged = true;
      return { ...updatedPost, comments: updatedComments };
    }

    return updatedPost;
  });

  if (postsChanged) {
    sendEvent('POSTS_UPDATED', posts);
  }
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(404, jsonHeaders);
    res.end(JSON.stringify({ success: false, message: 'Not found' }));
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, jsonHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/events') {
    res.writeHead(200, sseHeaders);
    res.write(`data: ${JSON.stringify({ type: 'INIT', payload: { users, posts } })}\n\n`);
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    res.writeHead(200, jsonHeaders);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/users') {
    res.writeHead(200, jsonHeaders);
    res.end(JSON.stringify(users));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/posts') {
    res.writeHead(200, jsonHeaders);
    res.end(JSON.stringify(posts));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
    const body = await readJsonBody(req);
    const { email, name } = body || {};
    if (!email) {
      res.writeHead(400, jsonHeaders);
      res.end(JSON.stringify({ success: false, message: 'Email wajib diisi.' }));
      return;
    }

    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      res.writeHead(409, jsonHeaders);
      res.end(JSON.stringify({ success: false, message: 'Email ini sudah terdaftar. Silakan masuk.' }));
      return;
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name: name || email.split('@')[0],
      email,
      avatarUrl: 'https://images.pexels.com/photos/1844547/pexels-photo-1844547.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      bio: 'New coffee enthusiast!',
      following: [],
      followers: [],
    };

    users = [...users, newUser];
    sendEvent('USERS_UPDATED', users);

    res.writeHead(201, jsonHeaders);
    res.end(JSON.stringify({ success: true, user: newUser }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readJsonBody(req);
    const { email } = body || {};
    if (!email) {
      res.writeHead(400, jsonHeaders);
      res.end(JSON.stringify({ success: false, message: 'Email wajib diisi.' }));
      return;
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.writeHead(401, jsonHeaders);
      res.end(JSON.stringify({ success: false, message: 'Email atau kata sandi salah.' }));
      return;
    }

    res.writeHead(200, jsonHeaders);
    res.end(JSON.stringify({ success: true, user }));
    return;
  }

  const segments = url.pathname.split('/').filter(Boolean);

  if (segments[0] === 'api' && segments[1] === 'users' && segments.length === 3) {
    const userId = segments[2];

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const { name, avatarUrl, bio } = body || {};
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ success: false, message: 'Pengguna tidak ditemukan.' }));
        return;
      }

      const updatedUser = {
        ...users[userIndex],
        ...(name !== undefined ? { name } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(bio !== undefined ? { bio } : {}),
      };

      users = users.map(u => (u.id === userId ? updatedUser : u));
      sendEvent('USERS_UPDATED', users);
      syncAuthorInPosts(updatedUser);

      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ success: true, user: updatedUser }));
      return;
    }
  }

  if (segments[0] === 'api' && segments[1] === 'users' && segments.length === 4 && segments[3] === 'follow') {
    const userId = segments[2];
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const { targetUserId } = body || {};

      const userIndex = users.findIndex(u => u.id === userId);
      const targetIndex = users.findIndex(u => u.id === targetUserId);
      if (userIndex === -1 || targetIndex === -1) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ success: false, message: 'Pengguna tidak ditemukan.' }));
        return;
      }

      const currentUser = users[userIndex];
      const targetUser = users[targetIndex];
      const isFollowing = currentUser.following.includes(targetUserId);

      const updatedCurrentUser = {
        ...currentUser,
        following: isFollowing
          ? currentUser.following.filter(id => id !== targetUserId)
          : [...currentUser.following, targetUserId],
      };

      const updatedTargetUser = {
        ...targetUser,
        followers: isFollowing
          ? targetUser.followers.filter(id => id !== userId)
          : [...targetUser.followers, userId],
      };

      users = users.map(u => {
        if (u.id === updatedCurrentUser.id) return updatedCurrentUser;
        if (u.id === updatedTargetUser.id) return updatedTargetUser;
        return u;
      });

      sendEvent('USERS_UPDATED', users);

      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ success: true, users }));
      return;
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/posts') {
    const body = await readJsonBody(req);
    const { authorId, imageUrl, caption, locationTag } = body || {};
    if (!authorId || !imageUrl || !caption || !locationTag) {
      res.writeHead(400, jsonHeaders);
      res.end(JSON.stringify({ success: false, message: 'Data postingan tidak lengkap.' }));
      return;
    }

    const author = users.find(u => u.id === authorId);
    if (!author) {
      res.writeHead(400, jsonHeaders);
      res.end(JSON.stringify({ success: false, message: 'Penulis tidak ditemukan.' }));
      return;
    }

    const newPost = {
      id: `post_${Date.now()}_${randomUUID()}`,
      author,
      imageUrl,
      caption,
      locationTag,
      likes: [],
      isBookmarked: false,
      comments: [],
      views: [],
    };

    posts = [newPost, ...posts];
    sendEvent('POSTS_UPDATED', posts);

    res.writeHead(201, jsonHeaders);
    res.end(JSON.stringify({ success: true, post: newPost }));
    return;
  }

  if (segments[0] === 'api' && segments[1] === 'posts' && segments.length >= 3) {
    const postId = segments[2];

    if (req.method === 'PATCH' && segments.length === 3) {
      const body = await readJsonBody(req);
      const { caption, locationTag } = body || {};
      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex === -1) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ success: false, message: 'Postingan tidak ditemukan.' }));
        return;
      }

      const updatedPost = {
        ...posts[postIndex],
        ...(caption !== undefined ? { caption } : {}),
        ...(locationTag !== undefined ? { locationTag } : {}),
      };

      posts = posts.map(p => (p.id === postId ? updatedPost : p));
      sendEvent('POSTS_UPDATED', posts);

      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ success: true, post: updatedPost }));
      return;
    }

    if (req.method === 'DELETE' && segments.length === 3) {
      const prevLength = posts.length;
      posts = posts.filter(p => p.id !== postId);
      if (posts.length === prevLength) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ success: false, message: 'Postingan tidak ditemukan.' }));
        return;
      }

      sendEvent('POSTS_UPDATED', posts);
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (req.method === 'POST' && segments.length === 4) {
      const action = segments[3];
      const body = await readJsonBody(req);

      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex === -1) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ success: false, message: 'Postingan tidak ditemukan.' }));
        return;
      }

      const post = posts[postIndex];

      if (action === 'like') {
        const { userId } = body || {};
        if (!userId) {
          res.writeHead(400, jsonHeaders);
          res.end(JSON.stringify({ success: false, message: 'ID pengguna diperlukan.' }));
          return;
        }

        const hasLiked = post.likes.includes(userId);
        const updatedPost = {
          ...post,
          likes: hasLiked ? post.likes.filter(id => id !== userId) : [...post.likes, userId],
        };

        posts = posts.map(p => (p.id === postId ? updatedPost : p));
        sendEvent('POSTS_UPDATED', posts);

        res.writeHead(200, jsonHeaders);
        res.end(JSON.stringify({ success: true, post: updatedPost }));
        return;
      }

      if (action === 'bookmark') {
        const updatedPost = { ...post, isBookmarked: !post.isBookmarked };
        posts = posts.map(p => (p.id === postId ? updatedPost : p));
        sendEvent('POSTS_UPDATED', posts);
        res.writeHead(200, jsonHeaders);
        res.end(JSON.stringify({ success: true, post: updatedPost }));
        return;
      }

      if (action === 'view') {
        const { userId } = body || {};
        if (!userId) {
          res.writeHead(400, jsonHeaders);
          res.end(JSON.stringify({ success: false, message: 'ID pengguna diperlukan.' }));
          return;
        }

        if (!post.views.includes(userId)) {
          const updatedPost = { ...post, views: [...post.views, userId] };
          posts = posts.map(p => (p.id === postId ? updatedPost : p));
          sendEvent('POSTS_UPDATED', posts);
          res.writeHead(200, jsonHeaders);
          res.end(JSON.stringify({ success: true, post: updatedPost }));
          return;
        }

        res.writeHead(200, jsonHeaders);
        res.end(JSON.stringify({ success: true, post }));
        return;
      }

      if (action === 'comments') {
        const { userId, text } = body || {};
        if (!userId || !text) {
          res.writeHead(400, jsonHeaders);
          res.end(JSON.stringify({ success: false, message: 'Data komentar tidak lengkap.' }));
          return;
        }

        const author = users.find(u => u.id === userId);
        if (!author) {
          res.writeHead(400, jsonHeaders);
          res.end(JSON.stringify({ success: false, message: 'Penulis komentar tidak ditemukan.' }));
          return;
        }

        const newComment = {
          id: `comment_${Date.now()}_${randomUUID()}`,
          text,
          author,
        };

        const updatedPost = { ...post, comments: [...post.comments, newComment] };
        posts = posts.map(p => (p.id === postId ? updatedPost : p));
        sendEvent('POSTS_UPDATED', posts);

        res.writeHead(201, jsonHeaders);
        res.end(JSON.stringify({ success: true, comment: newComment, post: updatedPost }));
        return;
      }
    }
  }

  res.writeHead(404, jsonHeaders);
  res.end(JSON.stringify({ success: false, message: 'Endpoint tidak ditemukan.' }));
});

setInterval(() => {
  for (const client of sseClients) {
    client.write(':\n\n');
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`Realtime backend listening on http://localhost:${PORT}`);
});
