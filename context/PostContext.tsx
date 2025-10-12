import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { Post, User, Comment } from '../types';
import { AuthContext } from './AuthContext';
import useSyncedLocalStorage from '../hooks/useSyncedLocalStorage';


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

const POSTS_DB_KEY = 'posts-db';

const getInitialPosts = (): Post[] => {
    // This function now only provides the initial fallback data.
    // The useSyncedLocalStorage hook will handle reading from storage.
    return MOCK_POSTS;
};

interface PostContextType {
  posts: Post[];
  addPost: (postData: { imageUrl: string; caption: string; locationTag: string }) => void;
  toggleLike: (postId: string) => void;
  toggleBookmark: (postId: string) => void;
  incrementPostView: (postId: string) => void;
  deletePost: (postId: string) => void;
  updatePost: (postId: string, updatedData: { caption: string; locationTag: string }) => void;
  addComment: (postId: string, text: string) => void;
}

export const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useSyncedLocalStorage<Post[]>(POSTS_DB_KEY, getInitialPosts);
  const authContext = useContext(AuthContext);
  const { user, users } = authContext || {};

  // Effect to synchronize post author data with the main users list from AuthContext.
  // This ensures that if a user updates their profile (e.g., name or avatar),
  // it reflects on all their existing posts. This logic remains important.
  useEffect(() => {
    if (users && users.length > 0) {
      const userMap = new Map<string, User>(users.map(u => [u.id, u]));
      
      setPosts(prevPosts => {
        let hasChanges = false;
        const updatedPosts = prevPosts.map(post => {
          const updatedAuthor = userMap.get(post.author.id);
          // Check if author data is stale before updating
          if (updatedAuthor && (post.author.name !== updatedAuthor.name || post.author.avatarUrl !== updatedAuthor.avatarUrl)) {
            hasChanges = true;
            // Also update author info in comments
            const updatedComments = post.comments.map(comment => {
              const updatedCommentAuthor = userMap.get(comment.author.id);
              if (updatedCommentAuthor && (comment.author.name !== updatedCommentAuthor.name || comment.author.avatarUrl !== updatedCommentAuthor.avatarUrl)) {
                return { ...comment, author: updatedCommentAuthor };
              }
              return comment;
            });
            return { ...post, author: updatedAuthor, comments: updatedComments };
          }
          return post;
        });

        // Only update state if there were actual changes to prevent infinite loops
        return hasChanges ? updatedPosts : prevPosts;
      });
    }
  }, [users, setPosts]);


  const addPost = useCallback((postData: { imageUrl: string; caption: string; locationTag: string }) => {
    if (!user) return;

    const newPost: Post = {
      id: `post_${Date.now()}`,
      author: user,
      imageUrl: postData.imageUrl,
      caption: postData.caption,
      locationTag: postData.locationTag,
      likes: [],
      isBookmarked: false,
      comments: [],
      views: [],
    };

    setPosts(prevPosts => [newPost, ...prevPosts]);
  }, [user, setPosts]);

  const toggleLike = useCallback((postId: string) => {
    if (!user) return;
    const userId = user.id;

    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          const isLiked = post.likes.includes(userId);
          const updatedLikes = isLiked
            ? post.likes.filter(id => id !== userId)
            : [...post.likes, userId];
          return { ...post, likes: updatedLikes };
        }
        return post;
      })
    );
  }, [user, setPosts]);

  const toggleBookmark = useCallback((postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return { ...post, isBookmarked: !post.isBookmarked };
        }
        return post;
      })
    );
  }, [setPosts]);
  
  const incrementPostView = useCallback((postId: string) => {
      if (!user) return;
      const userId = user.id;

      setPosts(prevPosts =>
          prevPosts.map(post => {
              if (post.id === postId) {
                  // Only add user to views array if they haven't viewed it before
                  if (!post.views.includes(userId)) {
                      return { ...post, views: [...post.views, userId] };
                  }
              }
              return post;
          })
      );
  }, [user, setPosts]);

  const deletePost = useCallback((postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  }, [setPosts]);

  const updatePost = useCallback((postId: string, updatedData: { caption: string; locationTag: string }) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, ...updatedData } : post
      )
    );
  }, [setPosts]);

  const addComment = useCallback((postId: string, text: string) => {
    if (!user) return;

    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      text,
      author: user,
    };

    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return { ...post, comments: [...post.comments, newComment] };
        }
        return post;
      })
    );
  }, [user, setPosts]);


  const value = { posts, addPost, toggleLike, toggleBookmark, incrementPostView, deletePost, updatePost, addComment };

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  );
};