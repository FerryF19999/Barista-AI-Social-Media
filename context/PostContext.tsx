import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Post, User, Comment } from '../types';
import { AuthContext } from './AuthContext';

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
  const [posts, setPosts] = useState<Post[]>([]);
  const authContext = useContext(AuthContext);
  const { user, users } = authContext || {};

  const fetchPosts = useCallback(async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(*),
          likes:post_likes(user_id),
          bookmarks:post_bookmarks(user_id),
          views:post_views(user_id),
          comments(*, author:profiles!comments_author_id_fkey(*))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (postsData) {
        const formattedPosts: Post[] = postsData.map((post: any) => ({
          id: post.id,
          author: {
            id: post.author.id,
            name: post.author.name,
            email: post.author.email,
            avatarUrl: post.author.avatar_url,
            bio: post.author.bio || '',
            following: [],
            followers: [],
          },
          imageUrl: post.image_url,
          caption: post.caption,
          locationTag: post.location_tag,
          likes: post.likes?.map((like: any) => like.user_id) || [],
          isBookmarked: user ? post.bookmarks?.some((b: any) => b.user_id === user.id) : false,
          views: post.views?.map((view: any) => view.user_id) || [],
          comments: post.comments?.map((comment: any) => ({
            id: comment.id,
            text: comment.text,
            author: {
              id: comment.author.id,
              name: comment.author.name,
              email: comment.author.email,
              avatarUrl: comment.author.avatar_url,
              bio: comment.author.bio || '',
              following: [],
              followers: [],
            },
          })) || [],
        }));

        setPosts(formattedPosts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPosts();

      const channel: RealtimeChannel = supabase
        .channel('posts-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          fetchPosts();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => {
          fetchPosts();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_bookmarks' }, () => {
          fetchPosts();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_views' }, () => {
          fetchPosts();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
          fetchPosts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchPosts]);

  const addPost = useCallback(async (postData: { imageUrl: string; caption: string; locationTag: string }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          image_url: postData.imageUrl,
          caption: postData.caption,
          location_tag: postData.locationTag,
        });

      if (error) throw error;

      await fetchPosts();
    } catch (error) {
      console.error('Error adding post:', error);
    }
  }, [user, fetchPosts]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.includes(user.id);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, [user, posts]);

  const toggleBookmark = useCallback(async (postId: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isBookmarked = post.isBookmarked;

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('post_bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_bookmarks')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) throw error;
      }

      await fetchPosts();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  }, [user, posts, fetchPosts]);

  const incrementPostView = useCallback(async (postId: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post || post.views.includes(user.id)) return;

    try {
      const { error } = await supabase
        .from('post_views')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error && error.code !== '23505') {
        throw error;
      }
    } catch (error) {
      console.error('Error incrementing view:', error);
    }
  }, [user, posts]);

  const deletePost = useCallback(async (postId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', user.id);

      if (error) throw error;

      await fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  }, [user, fetchPosts]);

  const updatePost = useCallback(async (postId: string, updatedData: { caption: string; locationTag: string }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          caption: updatedData.caption,
          location_tag: updatedData.locationTag,
        })
        .eq('id', postId)
        .eq('author_id', user.id);

      if (error) throw error;

      await fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
    }
  }, [user, fetchPosts]);

  const addComment = useCallback(async (postId: string, text: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          text,
        });

      if (error) throw error;

      await fetchPosts();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, [user, fetchPosts]);

  const value = { posts, addPost, toggleLike, toggleBookmark, incrementPostView, deletePost, updatePost, addComment };

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  );
};
