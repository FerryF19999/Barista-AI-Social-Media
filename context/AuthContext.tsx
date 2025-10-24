import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User as AuthUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  toggleFollow: (targetUserId: string) => void;
  switchUser: (userId: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    loadAllUsers();

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);

        const { data: followersData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', userId);

        const userProfile: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          avatarUrl: data.avatar_url,
          bio: data.bio || '',
          following: followingData?.map(f => f.following_id) || [],
          followers: followersData?.map(f => f.follower_id) || [],
        };

        setUser(userProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      if (profilesData) {
        const usersWithFollows = await Promise.all(
          profilesData.map(async (profile) => {
            const { data: followingData } = await supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', profile.id);

            const { data: followersData } = await supabase
              .from('follows')
              .select('follower_id')
              .eq('following_id', profile.id);

            return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              avatarUrl: profile.avatar_url,
              bio: profile.bio || '',
              following: followingData?.map(f => f.following_id) || [],
              followers: followersData?.map(f => f.follower_id) || [],
            };
          })
        );

        setUsers(usersWithFollows);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const signup = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        return { success: false, message: 'Email ini sudah terdaftar. Silakan masuk.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user.id);
        await loadAllUsers();
        return { success: true };
      }

      return { success: false, message: 'Signup failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Terjadi kesalahan' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user.id);
        return { success: true };
      }

      return { success: false, message: 'Login failed' };
    } catch (error: any) {
      return { success: false, message: 'Email atau kata sandi salah.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = async (updatedData: Partial<User>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updatedData.name,
          avatar_url: updatedData.avatarUrl,
          bio: updatedData.bio,
        })
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
      await loadAllUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const switchUser = async (userId: string) => {
    await loadUserProfile(userId);
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!user) return;

    const isFollowing = user.following.includes(targetUserId);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        if (error) throw error;
      }

      await loadUserProfile(user.id);
      await loadAllUsers();
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const value = { user, users, loading, login, signup, logout, updateUser, toggleFollow, switchUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
