import { API_BASE_URL } from './config';
import { Post, User } from '../types';

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type JsonValue = Record<string, unknown> | null;

async function request<T>(path: string, method: RequestMethod, body?: JsonValue): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const error = await response.json();
      if (error?.message) {
        message = error.message;
      }
    } catch (err) {
      // ignore parse error
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getUsers: () => request<User[]>('/users', 'GET'),
  signup: (email: string, password: string) => request<{ success: boolean; user?: User; message?: string }>(
    '/auth/signup',
    'POST',
    { email, password }
  ),
  login: (email: string, password: string) => request<{ success: boolean; user?: User; message?: string }>(
    '/auth/login',
    'POST',
    { email, password }
  ),
  updateUser: (userId: string, data: Partial<User>) => request<{ success: boolean; user: User }>(
    `/users/${userId}`,
    'PATCH',
    data
  ),
  toggleFollow: (userId: string, targetUserId: string) => request<{ success: boolean; users: User[] }>(
    `/users/${userId}/follow`,
    'POST',
    { targetUserId }
  ),
  getPosts: () => request<Post[]>('/posts', 'GET'),
  createPost: (data: { authorId: string; imageUrl: string; caption: string; locationTag: string }) =>
    request<{ success: boolean; post: Post }>('/posts', 'POST', data),
  updatePost: (postId: string, data: { caption?: string; locationTag?: string }) =>
    request<{ success: boolean; post: Post }>(`/posts/${postId}`, 'PATCH', data),
  deletePost: (postId: string) => request<{ success: boolean }>(`/posts/${postId}`, 'DELETE'),
  toggleLike: (postId: string, userId: string) =>
    request<{ success: boolean; post: Post }>(`/posts/${postId}/like`, 'POST', { userId }),
  toggleBookmark: (postId: string) =>
    request<{ success: boolean; post: Post }>(`/posts/${postId}/bookmark`, 'POST'),
  incrementView: (postId: string, userId: string) =>
    request<{ success: boolean; post: Post }>(`/posts/${postId}/view`, 'POST', { userId }),
  addComment: (postId: string, userId: string, text: string) =>
    request<{ success: boolean; comment: { id: string }; post: Post }>(`/posts/${postId}/comments`, 'POST', {
      userId,
      text,
    }),
};
