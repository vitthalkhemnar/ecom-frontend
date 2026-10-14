import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { AuthResponse } from '../types';
import { registerUnauthorizedHandler, setApiToken } from '../api';
import toast from 'react-hot-toast';

interface AuthState {
  token: string | null;
  username: string | null;
  roles: string[];
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (data: AuthResponse) => void;
  logout: () => void;
  isLoginModalOpen: boolean;
  openLoginModal: (callback?: () => void) => void;
  closeLoginModal: () => void;
  requireAuth: (callback?: () => void) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'bazaar_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.token) {
          setApiToken(parsed.token);
          return parsed;
        }
      }
      const token = localStorage.getItem('token');
      if (token) {
        setApiToken(token);
        return { token, username: null, roles: [] };
      }
    } catch {
      // Ignore parse errors
    }
    return { token: null, username: null, roles: [] };
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const pendingCallbackRef = useRef<(() => void) | null>(null);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      setApiToken(null);
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('token');
      toast.error("Please log in to continue.");
      setAuthState({ token: null, username: null, roles: [] });
      window.location.href = '/login';
    });
  }, []);

  const openLoginModal = useCallback(() => {
    setIsLoginModalOpen(true);
    window.location.href = '/login';
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  const requireAuth = useCallback((callback?: () => void): boolean => {
    if (auth.token) {
      callback?.();
      return true;
    }
    window.location.href = '/login';
    return false;
  }, [auth.token]);

  function setAuth(data: AuthResponse) {
    loggingOutRef.current = false;
    const newState: AuthState = { token: data.token, username: data.username, roles: data.roles };
    setApiToken(data.token);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    localStorage.setItem('token', data.token);
    setAuthState(newState);

    if (pendingCallbackRef.current) {
      const cb = pendingCallbackRef.current;
      pendingCallbackRef.current = null;
      try {
        cb();
      } catch (err) {
        console.error("Error executing pending action after login:", err);
      }
    }
  }

  function logout() {
    setApiToken(null);
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('token');
    setAuthState({ token: null, username: null, roles: [] });
  }

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        isAuthenticated: !!auth.token,
        isAdmin: auth.roles.includes('ROLE_ADMIN'),
        setAuth,
        logout,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}