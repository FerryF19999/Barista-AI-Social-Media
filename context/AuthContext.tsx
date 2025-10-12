import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import useSyncedLocalStorage from '../hooks/useSyncedLocalStorage';

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

const MOCK_USERS_DB_KEY = 'mock-users-db';
const AUTH_USER_KEY = 'authUser';

// Initialize a few users for a more dynamic "follow" experience
const getInitialUsers = (): User[] => {
    const user1: User = { id: 'user-123', name: 'KopiLover', avatarUrl: 'https://images.pexels.com/photos/1844547/pexels-photo-1844547.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'goresf19@gmail.com', bio: 'Pecinta kopi dan senja.', following: [], followers: [] };
    const user2: User = { id: 'user-456', name: 'Andi Pratama', avatarUrl: 'https://images.pexels.com/photos/837358/pexels-photo-837358.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'andi@example.com', bio: 'Barista & Roaster.', following: [], followers: [] };
    const user3: User = { id: 'user-789', name: 'CoffeeAddict', avatarUrl: 'https://images.pexels.com/photos/842980/pexels-photo-842980.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1', email: 'addict@example.com', bio: 'Exploring beans.', following: [], followers: [] };
    
    // The useSyncedLocalStorage hook will handle reading from storage,
    // so this function now only provides the initial fallback data.
    return [user1, user2, user3];
};


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useSyncedLocalStorage<User[]>(MOCK_USERS_DB_KEY, getInitialUsers);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      try {
        const storedUser = localStorage.getItem(AUTH_USER_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Ensure user object from auth key is in sync with the main user list
          const syncedUser = users.find(u => u.id === parsedUser.id) || parsedUser;
          if (!syncedUser.following) syncedUser.following = [];
          if (!syncedUser.followers) syncedUser.followers = [];
          setUser(syncedUser);
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
      }
      setLoading(false);
    }, 1000);
  }, [users]); // Depend on users to re-sync on cross-tab updates


  const signup = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existingUser) {
                resolve({ success: false, message: 'Email ini sudah terdaftar. Silakan masuk.' });
                return;
            }

            const nameFromEmail = email.split('@')[0];
            const newUser: User = {
                id: `user_${Date.now()}`,
                name: nameFromEmail,
                email,
                avatarUrl: 'https://images.pexels.com/photos/1844547/pexels-photo-1844547.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
                bio: 'New coffee enthusiast!',
                following: [],
                followers: []
            };

            setUsers(prev => [...prev, newUser]);
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
            setUser(newUser);
            resolve({ success: true });
        }, 500);
    });
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const userToLogin = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            // We're not actually checking the password, just existence.
            if (!userToLogin) {
                resolve({ success: false, message: 'Email atau kata sandi salah.' });
                return;
            }

            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userToLogin));
            setUser(userToLogin);
            resolve({ success: true });
        }, 500);
    });
  };

  const logout = () => {
    localStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  };
  
  const updateUser = (updatedData: Partial<User>) => {
    if(!user) return;
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? updatedUser : u));
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
  };

  const switchUser = (userId: string) => {
    const userToSwitchTo = users.find(u => u.id === userId);
    if(userToSwitchTo) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userToSwitchTo));
        setUser(userToSwitchTo);
    }
  };
  
  const toggleFollow = (targetUserId: string) => {
    if (!user) return;

    let currentUserIsFollowing = user.following.includes(targetUserId);

    setUsers(currentUsers => currentUsers.map(u => {
        if (u.id === user.id) {
             const updatedFollowing = currentUserIsFollowing
                ? u.following.filter(id => id !== targetUserId)
                : [...u.following, targetUserId];
             const updatedUser = { ...user, following: updatedFollowing };
             setUser(updatedUser); // Update local active user state immediately
             localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser)); // Persist active user change
             return updatedUser;
        }
        if (u.id === targetUserId) {
            const updatedFollowers = currentUserIsFollowing
                ? u.followers.filter(id => id !== user.id)
                : [...u.followers, user.id];
            return { ...u, followers: updatedFollowers };
        }
        return u;
    }));
  };

  const value = { user, users, loading, login, signup, logout, updateUser, toggleFollow, switchUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};