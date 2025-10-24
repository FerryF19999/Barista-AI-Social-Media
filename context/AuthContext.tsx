import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { createDemoUsers } from '../services/demoData';

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
  const supabaseClient = supabase;

  useEffect(() => {
    if (!supabaseClient) {
      const demoUsers = createDemoUsers();
      setUsers(demoUsers);
      setUser(demoUsers[0]);
      setLoading(false);
      return;
    }

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
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
    if (!supabaseClient) return;

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const { data: followingData } = await supabaseClient
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);

        const { data: followersData } = await supabaseClient
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
    if (!supabaseClient) {
      setUsers(createDemoUsers());
      return;
    }

    try {
      const { data: profilesData, error } = await supabaseClient
        .from('profiles')
        .select('*');

      if (error) throw error;

      if (profilesData) {
        const usersWithFollows = await Promise.all(
          profilesData.map(async (profile) => {
            const { data: followingData } = await supabaseClient
              .from('follows')
              .select('following_id')
              .eq('follower_id', profile.id);

            const { data: followersData } = await supabaseClient
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
    if (!supabaseClient) {
      return { success: false, message: 'Fitur daftar memerlukan konfigurasi Supabase.' };
    }

    try {
      const { data: existingUser } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        return { success: false, message: 'Email ini sudah terdaftar. Silakan masuk.' };
      }

      const { data, error } = await supabaseClient.auth.signUp({
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
    if (!supabaseClient) {
      return { success: false, message: 'Fitur masuk memerlukan konfigurasi Supabase.' };
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
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
    if (!supabaseClient) {
      console.warn('Supabase belum dikonfigurasi. Logout dinonaktifkan dalam mode demo.');
      return;
    }

    await supabaseClient.auth.signOut();
    setUser(null);
  };

  const updateUser = async (updatedData: Partial<User>) => {
    if (!user) return;

    if (!supabaseClient) {
      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, ...updatedData } : u)));
      return;
    }

    try {
      const { error } = await supabaseClient
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
    if (!supabaseClient) {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
        setUser({ ...targetUser });
      }
      return;
    }

    await loadUserProfile(userId);
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!user) return;

    if (!supabaseClient) {
      const isFollowing = user.following.includes(targetUserId);
      const updatedFollowing = isFollowing
        ? user.following.filter(id => id !== targetUserId)
        : [...user.following, targetUserId];

      setUser(prev => (prev ? { ...prev, following: updatedFollowing } : prev));
      setUsers(prev =>
        prev.map(u => {
          if (u.id === user.id) {
            return { ...u, following: updatedFollowing };
          }

          if (u.id === targetUserId) {
            const updatedFollowers = isFollowing
              ? u.followers.filter(id => id !== user.id)
              : [...u.followers, user.id];

            return { ...u, followers: updatedFollowers };
          }

          return u;
        })
      );

      return;
    }

    const isFollowing = user.following.includes(targetUserId);

    try {
      if (isFollowing) {
        const { error } = await supabaseClient
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
      } else {
        const { error } = await supabaseClient
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
