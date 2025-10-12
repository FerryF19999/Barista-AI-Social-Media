import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
// FIX: Import the 'User' type to use for explicit type annotation.
import { Post, User, Comment } from '../types';
import { AuthContext } from './AuthContext';

const getInitialPosts = (): Post[] => {
    try {
        const storedPosts = localStorage.getItem('posts-db');
        if (storedPosts) {
            const parsedPosts: Post[] = JSON.parse(storedPosts);
            // Ensure views is an array for unique view tracking
            return parsedPosts.map(p => ({ ...p, views: p.views || [], likes: p.likes || [], comments: p.comments || [] }));
        }
    } catch (e) { console.error(e) }
    return [];
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
  const [posts, setPosts] = useState<Post[]>(getInitialPosts);
  const authContext = useContext(AuthContext);
  const { user, users } = authContext || {};

  useEffect(() => {
    localStorage.setItem('posts-db', JSON.stringify(posts));
  }, [posts]);

  // Effect to synchronize post author data with the main users list from AuthContext.
  // This ensures that if a user updates their profile (e.g., name or avatar),
  // it reflects on all their existing posts.
  useEffect(() => {
    if (users && users.length > 0) {
      setPosts(prevPosts => {
        // FIX: Explicitly type `userMap` to resolve type inference error on `updatedAuthor`.
        const userMap = new Map<string, User>(users.map(u => [u.id, u]));
        let hasChanges = false;
        
        const updatedPosts = prevPosts.map(post => {
          const updatedAuthor = userMap.get(post.author.id);
          // Check if author data (name or avatar) has changed to avoid unnecessary re-renders.
          if (updatedAuthor && (post.author.avatarUrl !== updatedAuthor.avatarUrl || post.author.name !== updatedAuthor.name)) {
            hasChanges = true;
            return { ...post, author: updatedAuthor };
          }
          return post;
        });

        return hasChanges ? updatedPosts : prevPosts;
      });
    }
  }, [users]);

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
      views: [], // Initialize views as an empty array for unique tracking
    };

    setPosts(prevPosts => [newPost, ...prevPosts]);
  }, [user]);

  const toggleLike = useCallback((postId: string) => {
    if (!user) return;
    const userId = user.id;

    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          const isLiked = post.likes.includes(userId);
          const updatedLikes = isLiked
            ? post.likes.filter(id => id !== userId)
            // @ts-ignore
            : [...post.likes, userId];
          return { ...post, likes: updatedLikes };
        }
        return post;
      })
    );
  }, [user]);

  const toggleBookmark = useCallback((postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return { ...post, isBookmarked: !post.isBookmarked };
        }
        return post;
      })
    );
  }, []);
  
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
  }, [user]);

  const deletePost = useCallback((postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  }, []);

  const updatePost = useCallback((postId: string, updatedData: { caption: string; locationTag: string }) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, ...updatedData } : post
      )
    );
  }, []);

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
          // @ts-ignore
          return { ...post, comments: [...post.comments, newComment] };
        }
        return post;
      })
    );
  }, [user]);


  const value = { posts, addPost, toggleLike, toggleBookmark, incrementPostView, deletePost, updatePost, addComment };

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  );
};