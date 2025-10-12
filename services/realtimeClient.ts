import type { Post, User } from '../types';
import { api } from './api';
import { getSupabaseClient } from './supabaseClient';

export type EventType = 'USERS_UPDATED' | 'POSTS_UPDATED';

type Listener<T> = (payload: T) => void;

type EventPayloads = {
  USERS_UPDATED: User[];
  POSTS_UPDATED: Post[];
};

class RealtimeClient {
  private listeners: Map<EventType, Set<Listener<any>>> = new Map();
  private initialized = false;
  private pendingUsersFetch: Promise<void> | null = null;
  private pendingPostsFetch: Promise<void> | null = null;

  private async ensureSubscription() {
    if (this.initialized) {
      return;
    }

    const client = getSupabaseClient();
    if (!client || typeof window === 'undefined') {
      return;
    }

    const channel = client.channel('barista-realtime');

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        this.queueUsersDispatch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        this.queuePostsDispatch();
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          this.initialized = true;
        }
      });
  }

  private emit<T extends EventType>(type: T, payload: EventPayloads[T]) {
    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }

    listeners.forEach(listener => {
      try {
        (listener as Listener<EventPayloads[T]>)(payload);
      } catch (error) {
        console.error('Realtime listener error', error);
      }
    });
  }

  private queueUsersDispatch() {
    if (!this.listeners.has('USERS_UPDATED')) {
      return;
    }

    if (!this.pendingUsersFetch) {
      this.pendingUsersFetch = (async () => {
        try {
          const users = await api.getUsers();
          this.emit('USERS_UPDATED', users);
        } catch (error) {
          console.error('Failed to refresh users from Supabase', error);
        } finally {
          this.pendingUsersFetch = null;
        }
      })();
    }
  }

  private queuePostsDispatch() {
    if (!this.listeners.has('POSTS_UPDATED')) {
      return;
    }

    if (!this.pendingPostsFetch) {
      this.pendingPostsFetch = (async () => {
        try {
          const posts = await api.getPosts();
          this.emit('POSTS_UPDATED', posts);
        } catch (error) {
          console.error('Failed to refresh posts from Supabase', error);
        } finally {
          this.pendingPostsFetch = null;
        }
      })();
    }
  }

  subscribe<T extends EventType>(type: T, listener: Listener<EventPayloads[T]>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const listeners = this.listeners.get(type)!;
    listeners.add(listener as Listener<any>);

    this.ensureSubscription().catch(error => {
      console.error('Failed to start Supabase realtime subscription', error);
    });

    return () => {
      listeners.delete(listener as Listener<any>);
      if (listeners.size === 0) {
        this.listeners.delete(type);
      }
    };
  }
}

export const realtimeClient = new RealtimeClient();
