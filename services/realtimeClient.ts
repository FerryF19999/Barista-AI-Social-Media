import type { Post, User } from '../types';
import { api } from './api';

export type EventType = 'USERS_UPDATED' | 'POSTS_UPDATED';

type Listener<T> = (payload: T) => void;

type EventPayloads = {
  USERS_UPDATED: User[];
  POSTS_UPDATED: Post[];
};

const POLL_INTERVAL_MS = 4000;

class RealtimeClient {
  private listeners: Map<EventType, Set<Listener<any>>> = new Map();
  private timers: Map<EventType, ReturnType<typeof setInterval>> = new Map();
  private lastPayloads: Map<EventType, string> = new Map();

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

  private async poll(type: EventType) {
    try {
      if (type === 'USERS_UPDATED') {
        const payload = await api.getUsers();
        const serialized = JSON.stringify(payload);
        if (this.lastPayloads.get(type) === serialized) {
          return;
        }

        this.lastPayloads.set(type, serialized);
        this.emit('USERS_UPDATED', payload);
        return;
      }

      const payload = await api.getPosts();
      const serialized = JSON.stringify(payload);
      if (this.lastPayloads.get(type) === serialized) {
        return;
      }

      this.lastPayloads.set(type, serialized);
      this.emit('POSTS_UPDATED', payload);
    } catch (error) {
      console.error('Failed to refresh data from Supabase', error);
    }
  }

  private ensurePolling(type: EventType) {
    if (this.timers.has(type)) {
      return;
    }

    const execute = () => {
      void this.poll(type);
    };

    execute();
    const timer = setInterval(execute, POLL_INTERVAL_MS);
    this.timers.set(type, timer);
  }

  private stopPolling(type: EventType) {
    const timer = this.timers.get(type);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(type);
    }
    this.lastPayloads.delete(type);
  }

  subscribe<T extends EventType>(type: T, listener: Listener<EventPayloads[T]>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const listeners = this.listeners.get(type)!;
    listeners.add(listener as Listener<any>);

    this.ensurePolling(type);

    return () => {
      listeners.delete(listener as Listener<any>);
      if (listeners.size === 0) {
        this.listeners.delete(type);
        this.stopPolling(type);
      }
    };
  }
}

export const realtimeClient = new RealtimeClient();
