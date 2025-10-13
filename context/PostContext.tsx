import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { Post, User } from '../types';
import { AuthContext } from './AuthContext';
import { api } from '../services/api';
import { realtimeClient } from '../services/realtimeClient';

const getInitialPosts = (): Post[] => [];

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