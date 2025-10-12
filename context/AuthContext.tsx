import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { realtimeClient } from '../services/realtimeClient';
import { fallbackSeeds } from '../services/fallbackStore';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => Promise<void>;
  toggleFollow: (targetUserId: string) => Promise<void>;
  switchUser: (userId: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'authUser';

const getInitialUsers = (): User[] => fallbackSeeds.getUsers();

const areArraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const areUsersEqual = (a: User, b: User) => {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.email === b.email &&
    a.avatarUrl === b.avatarUrl &&
    (a.bio || '') === (b.bio || '') &&
    areArraysEqual(a.following, b.following) &&
    areArraysEqual(a.followers, b.followers)
  );
};


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(getInitialUsers());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedUser = localStorage.getItem(AUTH_USER_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        const remoteUsers = await api.getUsers();
        if (isMounted) {
          setUsers(remoteUsers);
        }
      } catch (error) {
        console.error('Failed to fetch users from backend', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    const unsubscribeUsers = realtimeClient.subscribe('USERS_UPDATED', updatedUsers => {
      setUsers(updatedUsers);
    });

    return () => {
      isMounted = false;
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const matchedUser = users.find(u => u.id === user.id);
    if (!matchedUser) return;

    if (!areUsersEqual(user, matchedUser)) {
      setUser(matchedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(matchedUser));
      }
    }
  }, [users, user]);


  const signup = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.signup(email, password);
      if (!response.success || !response.user) {
        return { success: false, message: response.message ?? 'Gagal mendaftar.' };
      }

      setUser(response.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to sign up', error);
      return { success: false, message: error instanceof Error ? error.message : 'Terjadi kesalahan saat mendaftar.' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.login(email, password);
      if (!response.success || !response.user) {
        return { success: false, message: response.message ?? 'Email atau kata sandi salah.' };
      }

      setUser(response.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to login', error);
      return { success: false, message: error instanceof Error ? error.message : 'Terjadi kesalahan saat masuk.' };
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_USER_KEY);
    }
    setUser(null);
  };

  const updateUser = async (updatedData: Partial<User>) => {
    if (!user) return;
    try {
      const response = await api.updateUser(user.id, updatedData);
      const updatedUser = response.user;
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to update user', error);
    }
  };

  const switchUser = (userId: string) => {
    const userToSwitchTo = users.find(u => u.id === userId);
    if(userToSwitchTo) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userToSwitchTo));
        }
        setUser(userToSwitchTo);
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!user) return;
    try {
      await api.toggleFollow(user.id, targetUserId);
    } catch (error) {
      console.error('Failed to toggle follow', error);
    }
  };

  const value = { user, users, loading, login, signup, logout, updateUser, toggleFollow, switchUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};