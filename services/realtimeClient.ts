import { EVENTS_URL } from './config';
import { Post, User } from '../types';

type EventType = 'INIT' | 'USERS_UPDATED' | 'POSTS_UPDATED';

type Listener<T> = (payload: T) => void;

type EventPayloads = {
  INIT: { users?: User[]; posts?: Post[] };
  USERS_UPDATED: User[];
  POSTS_UPDATED: Post[];
};

class RealtimeClient {
  private source: EventSource | null = null;
  private listeners: Map<EventType, Set<Listener<any>>> = new Map();
  private reconnectTimeout: number | null = null;

  constructor(private url: string) {}

  private connect() {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.source) {
      return;
    }

    this.source = new EventSource(this.url);

    this.source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: EventType; payload: EventPayloads[EventType] };
        this.emit(data.type, data.payload);
      } catch (error) {
        console.error('Failed to parse realtime event', error);
      }
    };

    this.source.onerror = () => {
      this.cleanup();
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout !== null) {
      return;
    }

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }

  private cleanup() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
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

  subscribe<T extends EventType>(type: T, listener: Listener<EventPayloads[T]>) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const listeners = this.listeners.get(type)!;
    listeners.add(listener as Listener<any>);

    this.connect();

    return () => {
      listeners.delete(listener as Listener<any>);
      if (listeners.size === 0) {
        this.listeners.delete(type);
      }
    };
  }
}

export const realtimeClient = new RealtimeClient(EVENTS_URL);
