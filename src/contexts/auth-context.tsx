'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AuthContextType = {
  isAuthenticated: boolean;
  login: (user: string, pass: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const hardcodedUser = 'admin';
const hardcodedPass = 'DEXfa@2025';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check session storage on initial load
    const storedAuth = sessionStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const login = (user: string, pass: string) => {
    if (user === hardcodedUser && pass === hardcodedPass) {
      sessionStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
    } else {
      throw new Error('Usuário ou senha inválidos.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
