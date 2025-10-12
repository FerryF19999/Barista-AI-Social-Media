import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { Post, User } from '../types';
import { AuthContext } from './AuthContext';
import { api } from '../services/api';
import { realtimeClient } from '../services/realtimeClient';


// --- Mock Data for Initial Feed ---
const mockUser1: User = { id: 'user-123', name: 'KopiLover', avatarUrl: 'https://images.pexels.com/photos/1844547/pexels-photo-1844547.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'goresf19@gmail.com', bio: 'Pecinta kopi dan senja.', following: ['user-456'], followers: ['user-456'] };
const mockUser2: User = { id: 'user-456', name: 'Andi Pratama', avatarUrl: 'https://images.pexels.com/photos/837358/pexels-photo-837358.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'andi@example.com', bio: 'Barista & Roaster.', following: ['user-123'], followers: ['user-123'] };
const mockUser3: User = { id: 'user-789', name: 'CoffeeAddict', avatarUrl: 'https://images.pexels.com/photos/842980/pexels-photo-842980.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'addict@example.com', bio: 'Exploring beans.', following: [], followers: [] };

const MOCK_POSTS: Post[] = [
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

const getInitialPosts = (): Post[] => MOCK_POSTS;

interface PostContextType {
  posts: Post[];
  addPost: (postData: { imageUrl: string; caption: string; locationTag: string }) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  incrementPostView: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  updatePost: (postId: string, updatedData: { caption: string; locationTag: string }) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
}

export const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<Post[]>(getInitialPosts());
  const authContext = useContext(AuthContext);
  const { user, users } = authContext || {};

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      try {
        const remotePosts = await api.getPosts();
        if (isMounted) {
          setPosts(remotePosts);
        }
      } catch (error) {
        console.error('Failed to fetch posts from backend', error);
      }
    };

    fetchPosts();

    const unsubscribePosts = realtimeClient.subscribe('POSTS_UPDATED', updatedPosts => {
      setPosts(updatedPosts);
    });

    return () => {
      isMounted = false;
      unsubscribePosts();
    };
  }, []);

  useEffect(() => {
    if (!users || users.length === 0) return;
    const userMap = new Map<string, User>(users.map(u => [u.id, u]));

    setPosts(prevPosts => {
      let hasChanges = false;
      const updatedPosts = prevPosts.map(post => {
        const updatedAuthor = userMap.get(post.author.id);
        let nextPost = post;
        if (updatedAuthor && (post.author.name !== updatedAuthor.name || post.author.avatarUrl !== updatedAuthor.avatarUrl)) {
          const updatedComments = post.comments.map(comment => {
            const updatedCommentAuthor = userMap.get(comment.author.id);
            if (updatedCommentAuthor && (comment.author.name !== updatedCommentAuthor.name || comment.author.avatarUrl !== updatedCommentAuthor.avatarUrl)) {
              return { ...comment, author: updatedCommentAuthor };
            }
            return comment;
          });
          hasChanges = true;
          nextPost = { ...post, author: updatedAuthor, comments: updatedComments };
        }
        return nextPost;
      });
      return hasChanges ? updatedPosts : prevPosts;
    });
  }, [users]);


  const addPost = useCallback(async (postData: { imageUrl: string; caption: string; locationTag: string }) => {
    if (!user) return;
    try {
      await api.createPost({
        authorId: user.id,
        imageUrl: postData.imageUrl,
        caption: postData.caption,
        locationTag: postData.locationTag,
      });
    } catch (error) {
      console.error('Failed to add post', error);
    }
  }, [user]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return;
    try {
      await api.toggleLike(postId, user.id);
    } catch (error) {
      console.error('Failed to toggle like', error);
    }
  }, [user]);

  const toggleBookmark = useCallback(async (postId: string) => {
    try {
      await api.toggleBookmark(postId);
    } catch (error) {
      console.error('Failed to toggle bookmark', error);
    }
  }, []);

  const incrementPostView = useCallback(async (postId: string) => {
      if (!user) return;
      try {
        await api.incrementView(postId, user.id);
      } catch (error) {
        console.error('Failed to record post view', error);
      }
  }, [user]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      await api.deletePost(postId);
    } catch (error) {
      console.error('Failed to delete post', error);
    }
  }, []);

  const updatePost = useCallback(async (postId: string, updatedData: { caption: string; locationTag: string }) => {
    try {
      await api.updatePost(postId, updatedData);
    } catch (error) {
      console.error('Failed to update post', error);
    }
  }, []);

  const addComment = useCallback(async (postId: string, text: string) => {
    if (!user) return;
    try {
      await api.addComment(postId, user.id, text);
    } catch (error) {
      console.error('Failed to add comment', error);
    }
  }, [user]);


  const value = { posts, addPost, toggleLike, toggleBookmark, incrementPostView, deletePost, updatePost, addComment };

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  );
};