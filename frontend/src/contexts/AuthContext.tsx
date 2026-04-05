import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getGoogleToken, setGoogleToken, removeGoogleToken, isJwtExpired, decodeJwt } from '../lib/auth';

export interface User {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = getGoogleToken();
    if (storedToken) {
      if (isJwtExpired(storedToken)) {
        removeGoogleToken();
        setUser(null);
        setLoading(false);
      } else {
        handleToken(storedToken);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const handleToken = (token: string) => {
    setGoogleToken(token);
    setTokenState(token);
    
    const decoded = decodeJwt(token);
    if (decoded) {
      setUser({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        sub: decoded.sub,
      });
    }
    setLoading(false);
  };

  const login = (token: string) => {
    handleToken(token);
  };

  const logout = () => {
    removeGoogleToken();
    setTokenState(null);
    setUser(null);
    fetch('/api/auth/logout', { method: 'POST' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
