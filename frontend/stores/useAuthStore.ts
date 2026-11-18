import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  waitForHydration: () => Promise<void>;

  login: (email: string, password: string, role: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<boolean>;
  setSession: (user: AuthUser, token: string, refreshToken?: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  clearError: () => void;
  getToken: () => string | undefined;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      waitForHydration: async () => {
        if (get()._hasHydrated) return;
        return new Promise<void>((resolve) => {
          const unsubscribe = useAuthStore.subscribe((state) => {
            if (state._hasHydrated) {
              unsubscribe();
              resolve();
            }
          });
        });
      },

      getToken: () => get().token || undefined,

      login: async (email, password, role) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role }),
          });

          if (!res.ok) {
            let errData: any;
            try {
              errData = await res.json();
            } catch {
              errData = { message: "Gagal login" };
            }
            throw new Error(
              errData.message || errData.error?.message || "Kredensial salah",
            );
          }

          const response = await res.json();
          get().setSession(
            response.user,
            response.accessToken,
            response.refreshToken,
          );
          return true;
        } catch (error: any) {
          set({ error: error.message || "Gagal masuk.", isLoading: false });
          return false;
        }
      },

      register: async (name, email, password, phone) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              password,
              phone: phone?.trim() || null,
            }),
          });

          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(
              data?.error?.message || data?.message || "Registrasi gagal",
            );
          }

          get().setSession(data.user, data.accessToken, data.refreshToken);
          return true;
        } catch (error: any) {
          set({
            error: error.message || "Terjadi kesalahan saat registrasi",
            isLoading: false,
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),

      setSession: (user, token, refreshToken) => {
        set({
          user,
          token,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        set({
          token: accessToken,
          refreshToken: refreshToken,
        });
      },

      logout: () => {
        const { refreshToken } = get();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
        if (refreshToken) {
          void fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            keepalive: true,
          }).catch(() => undefined);
        }
      },
    }),
    {
      name: "gymnasyum-auth",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            user: persistedState.user || null,
            token: persistedState.token || null,
            refreshToken: null,
            isAuthenticated: persistedState.isAuthenticated || false,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        setTimeout(() => state?.setHasHydrated(true), 50);
      },
    },
  ),
);
