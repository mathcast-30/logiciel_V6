import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';

export type UserRole = 'operateur' | 'chef' | 'admin';

export interface CurrentUser {
  id: number;
  nom: string;
  prenom: string;
  identifiant: string;
  role: UserRole;
  must_change_pwd: boolean;
  avatar_color: string;
}

type LoginResult =
  | { success: true; mustChangePwd: boolean }
  | { success: false; error: 'identifiants_incorrects' | 'compte_desactive' | 'erreur_reseau' };

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifiant: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('opticut_session_token');
    if (savedToken) {
      setToken(savedToken);
      apiClient('/auth/me')
        .then(res => {
          if (res.ok) {
            return res.json();
          } else {
            throw new Error('Invalid token');
          }
        })
        .then(userData => {
          setUser(userData);
          setIsLoading(false);
        })
        .catch(() => {
          sessionStorage.removeItem('opticut_session_token');
          setToken(null);
          setUser(null);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (identifiant: string, password: string): Promise<LoginResult> => {
    try {
      const res = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifiant, password }),
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('opticut_session_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, mustChangePwd: data.user.must_change_pwd };
      } else {
        const errorData = await res.json();
        return { success: false, error: errorData.detail || 'identifiants_incorrects' };
      }
    } catch (e) {
      return { success: false, error: 'erreur_reseau' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient('/auth/logout', { method: 'POST' });
      }
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      sessionStorage.removeItem('opticut_session_token');
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const changePassword = async (current: string, next: string): Promise<boolean> => {
    try {
      const res = await apiClient('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      if (res.ok) {
        if (user) {
          setUser({ ...user, must_change_pwd: false });
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiClient('/auth/me');
      if (res.ok) {
        setUser(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, changePassword, refreshUser }}>
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
