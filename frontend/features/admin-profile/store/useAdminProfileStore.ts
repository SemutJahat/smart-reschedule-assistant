import { create } from "zustand";
import * as userApi from "@/lib/api/users";
import { useAuthStore } from "@/stores/useAuthStore";

interface AdminProfileState {
  isUpdatingProfile: boolean;
  isUpdatingPassword: boolean;

  updateProfile: (data: { name: string }) => Promise<boolean>;
  updatePassword: (data: any) => Promise<boolean>;
}

export const useAdminProfileStore = create<AdminProfileState>((set) => ({
  isUpdatingProfile: false,
  isUpdatingPassword: false,

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const { user, token, refreshToken, setSession } =
        useAuthStore.getState();
      if (!user) throw new Error("Tidak ada sesi admin");

      const updatedUser = await userApi.updateAdminProfile(user.id, data);

      setSession(
        {
          id: updatedUser.id ?? user.id,
          name: updatedUser.name ?? user.name,
          email: updatedUser.email ?? user.email,
          role: updatedUser.role ?? user.role,
        },
        token!,
        refreshToken ?? undefined,
      );

      return true;
    } catch (error: any) {
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  updatePassword: async (data) => {
    set({ isUpdatingPassword: true });
    try {
      await userApi.updateAdminPassword(data);
      return true;
    } catch (error: any) {
      throw error;
    } finally {
      set({ isUpdatingPassword: false });
    }
  },
}));
