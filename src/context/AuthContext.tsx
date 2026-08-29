import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuthResponse } from '../types';
import { registerUnauthorizedHandler } from '../api';
import toast from 'react-hot-toast';

interface AuthState {
  token: string | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  setAuth: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'bazaar_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { token: null, username: null };
  });
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (auth.token) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      if(loggingOutRef.current) return;
      loggingOutRef.current = true;
      toast.error("Session expired. Please log in again.");
      logout();
    });
  }, []);

  function setAuth(data: AuthResponse) {
    loggingOutRef.current = false;
    setAuthState({ token: data.token, username: data.username });
  }

  function logout() {
    setAuthState({ token: null, username: null });
  }

  return (
    <AuthContext.Provider value={{ ...auth, isAuthenticated: !!auth.token, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}