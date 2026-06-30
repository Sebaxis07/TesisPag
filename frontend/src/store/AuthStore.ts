import { create } from 'zustand';

export interface UserProfile {
  _id: string;
  name: string;
  rut: string;
  role: 'Admin' | 'Editor' | 'Viewer' | 'Creador';
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (rut: string, password: string) => Promise<boolean>;
  register: (name: string, rut: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initializeSession: () => Promise<boolean>;
  getAuthHeaders: () => { Authorization: string } | {};
}

const API_URL = 'http://localhost:5000/api';

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize from localStorage (only profile metadata, NOT tokens)
  const storedUser = localStorage.getItem('tf_user');

  return {
    token: null, // Access token is in-memory only
    user: storedUser ? JSON.parse(storedUser) : null,
    isAuthenticated: false, // Will be set to true upon silent refresh or login
    isLoading: true, // Start in loading state until session is verified
    error: null,

    login: async (rut, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rut, password }),
          credentials: 'include' // Allow receiving HttpOnly cookie
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Login fallido');
        }

        localStorage.setItem('tf_user', JSON.stringify(data.user));

        set({
          token: data.accessToken,
          user: data.user,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return false;
      }
    },

    register: async (name, rut, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, rut, password, role: 'Editor' }),
          credentials: 'include' // Allow receiving HttpOnly cookie
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registro fallido');
        }

        localStorage.setItem('tf_user', JSON.stringify(data.user));

        set({
          token: data.accessToken,
          user: data.user,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        return false;
      }
    },

    logout: async () => {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include' // Sends cookie to be cleared
        });
      } catch (err) {
        console.error('Logout error on backend:', err);
      } finally {
        localStorage.removeItem('tf_user');
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      }
    },

    initializeSession: async () => {
      set({ isLoading: true });
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include' // Sends cookie to be validated
        });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('tf_user', JSON.stringify(data.user));
          set({
            token: data.accessToken,
            user: data.user,
            isAuthenticated: true,
            isLoading: false
          });
          return true;
        } else {
          // No active session/cookie invalid
          localStorage.removeItem('tf_user');
          set({ token: null, user: null, isAuthenticated: false, isLoading: false });
          return false;
        }
      } catch (err) {
        console.error('Error verifying active session:', err);
        localStorage.removeItem('tf_user');
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
        return false;
      }
    },

    fetchProfile: async () => {
      const { token } = get();
      if (!token) return;
      
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('tf_user', JSON.stringify(data));
          set({ user: data });
        }
      } catch (err) {
        console.error('Fetch profile error:', err);
      }
    },

    getAuthHeaders: () => {
      const { token } = get();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
  };
});

export default useAuthStore;
