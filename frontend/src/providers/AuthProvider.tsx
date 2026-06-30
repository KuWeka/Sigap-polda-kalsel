'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole = 'SATKER' | 'BIDTEKKOM' | 'PADAL' | 'TEKNISI';

export interface AuthUser {
  userId: string;
  nama: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOKEN_KEY = 'token';

// ─── JWT Helpers ────────────────────────────────────────────────────────────

interface JwtPayload {
  userId: string;
  nama: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Decode a JWT token payload without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Handle base64url encoding (replace - with +, _ with /)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const decoded = JSON.parse(jsonStr) as JwtPayload;

    // Validate required fields
    if (!decoded.userId || !decoded.nama || !decoded.email || !decoded.role) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token has expired.
 */
function isTokenExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return true;
  // exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= payload.exp * 1000;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const lastRefreshPath = useRef<string | null>(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (storedToken) {
      const payload = decodeToken(storedToken);

      if (payload && !isTokenExpired(payload)) {
        setToken(storedToken);
        setUser({
          userId: payload.userId,
          nama: payload.nama,
          email: payload.email,
          role: payload.role,
        });
      } else {
        // Token is invalid or expired — clear it
        localStorage.removeItem(TOKEN_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  // Periodically check token expiry (every 60 seconds)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      const payload = decodeToken(token);
      if (!payload || isTokenExpired(payload)) {
        // Token expired — auto-logout
        localStorage.removeItem(TOKEN_KEY);
        document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
        setToken(null);
        setUser(null);
        router.push('/login');
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [token, router]);

  /**
   * Re-fetch user profile from the server to get the latest role and info.
   * This ensures the sidebar updates if a Bidtekkom changes the user's role
   * while they are logged in (Req 28.7).
   */
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) return;

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        // If 401, token is invalid — logout
        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
        document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
        setToken(null);
        setUser(null);
        router.push('/login');
        }
        return;
      }

      const result = await response.json();
      const profile = result.data;

      if (profile && profile.role) {
        setUser((prev) => {
          if (!prev) return prev;
          // Only update if something actually changed
          if (
            prev.role !== profile.role ||
            prev.nama !== profile.nama ||
            prev.email !== profile.email
          ) {
            return {
              userId: prev.userId,
              nama: profile.nama || prev.nama,
              email: profile.email || prev.email,
              role: profile.role as UserRole,
            };
          }
          return prev;
        });
      }
    } catch {
      // Silently fail — user keeps current state
    }
  }, [router]);

  // Re-fetch user profile on navigation (route change) to detect role changes (Req 28.7)
  useEffect(() => {
    if (!token || !user || isLoading) return;
    // Only refresh on dashboard routes, not auth pages
    if (!pathname.startsWith('/dashboard')) return;
    // Only refresh when the path actually changes (not on initial mount)
    if (lastRefreshPath.current !== null && lastRefreshPath.current !== pathname) {
      refreshUser();
    }
    lastRefreshPath.current = pathname;
  }, [pathname, token, user, isLoading, refreshUser]);

  const login = useCallback((newToken: string) => {
    const payload = decodeToken(newToken);

    if (!payload || isTokenExpired(payload)) {
      // Invalid or already expired token — don't store
      return;
    }

    localStorage.setItem(TOKEN_KEY, newToken);
    // Also set cookie so middleware can read it (middleware can't access localStorage)
    document.cookie = `token=${newToken}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
    setToken(newToken);
    setUser({
      userId: payload.userId,
      nama: payload.nama,
      email: payload.email,
      role: payload.role,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    // Clear cookie too
    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


