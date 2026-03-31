"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { loginRequest, logoutRequest, refreshRequest } from "@/api/auth";
import { parseApiResponse } from "@/api/client";
import { createRequestId } from "@/lib/utils";
import type { AuthPayload, AuthUser } from "@/lib/types";

const SESSION_STORAGE_KEY = "bugflow.session";

interface AuthContextValue {
  user: AuthUser | null;
  isReady: boolean;
  isAuthenticating: boolean;
  login: (
    input: { email: string; password: string },
    redirectTo?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  authorizedFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      accessToken: string;
      user: AuthUser;
    };

    if (!parsed.accessToken || !parsed.user) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(payload: AuthPayload | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!payload) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: payload.accessToken,
      user: payload.user,
    }),
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const commitSession = useCallback((payload: AuthPayload | null) => {
    accessTokenRef.current = payload?.accessToken ?? null;
    writeStoredSession(payload);

    startTransition(() => {
      setUser(payload?.user ?? null);
    });
  }, []);

  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = refreshRequest()
      .then((payload) => {
        commitSession(payload);
        return payload.accessToken;
      })
      .catch(() => {
        const storedSession = readStoredSession();

        if (storedSession) {
          accessTokenRef.current = storedSession.accessToken;
          setUser(storedSession.user);
          return storedSession.accessToken;
        }

        commitSession(null);
        return null;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
        setIsReady(true);
        setIsAuthenticating(false);
      });

    refreshPromiseRef.current = promise;
    return promise;
  }, [commitSession]);

  useEffect(() => {
    const storedSession = readStoredSession();

    if (storedSession) {
      accessTokenRef.current = storedSession.accessToken;
      setUser(storedSession.user);
      setIsReady(true);
      setIsAuthenticating(false);
    }

    void refreshSession();
  }, [refreshSession]);

  const authorizedFetch = useCallback(async <T,>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> => {
    const headers = new Headers(init.headers);
    headers.set("x-request-id", createRequestId());

    if (accessTokenRef.current) {
      headers.set("authorization", `Bearer ${accessTokenRef.current}`);
    }

    let response = await fetch(path, {
      ...init,
      credentials: "include",
      headers,
    });

    if (response.status === 401) {
      const refreshedAccessToken = await refreshSession();

      if (!refreshedAccessToken) {
        commitSession(null);

        if (pathname !== "/login") {
          router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
        }

        throw new Error("Your session has expired.");
      }

      headers.set("authorization", `Bearer ${refreshedAccessToken}`);
      response = await fetch(path, {
        ...init,
        credentials: "include",
        headers,
      });
    }

    return parseApiResponse<T>(response);
  }, [commitSession, pathname, refreshSession, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        isAuthenticating,
        login: async (input, redirectTo) => {
          setIsAuthenticating(true);

          try {
            const payload = await loginRequest(input);
            commitSession(payload);
            router.replace(redirectTo ?? "/dashboard");
          } finally {
            setIsReady(true);
            setIsAuthenticating(false);
          }
        },
        logout: async () => {
          try {
            await logoutRequest();
          } finally {
            commitSession(null);
            router.replace("/login");
          }
        },
        authorizedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
