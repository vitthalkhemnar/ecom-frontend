import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
  const loggingOutRef = useRef(false);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      setApiToken(null);
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('token');
      toast.error("Session expired. Please log in again.");
      setAuthState({ token: null, username: null, roles: [] });
    });
  }, []);

  function setAuth(data: AuthResponse) {
    loggingOutRef.current = false;
    const newState: AuthState = { token: data.token, username: data.username, roles: data.roles };
    setApiToken(data.token);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    localStorage.setItem('token', data.token);
    setAuthState(newState);
  }

  function logout() {
    setApiToken(null);
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('token');
    setAuthState({ token: null, username: null, roles: [] });
  }

  return (
    <AuthContext.Provider value={{ ...auth, isAuthenticated: !!auth.token, isAdmin: auth.roles.includes('ROLE_ADMIN'), setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}