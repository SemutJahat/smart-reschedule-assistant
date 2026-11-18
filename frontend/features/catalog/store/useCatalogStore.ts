import { create } from "zustand";
import { apiClient } from "@/lib/api/client";
import * as serviceApi from "@/lib/api/services";
import type { PackageDTO, PackageFormData, ServiceFormData } from "../schemas";

type FetchStatus = "idle" | "loading" | "success" | "error";

interface CatalogState {
  packages: PackageDTO[];
  packagesStatus: FetchStatus;
  packagesError: string | null;

  fetchPackages: (
    status?: PackageDTO["status"],
    signal?: AbortSignal,
  ) => Promise<void>;
  createPackage: (data: PackageFormData) => Promise<void>;
  updatePackage: (id: string, data: Partial<PackageFormData>) => Promise<void>;

  services: serviceApi.ServiceDTO[];
  fetchServices: (signal?: AbortSignal) => Promise<void>;

  adminServices: serviceApi.ServiceDTO[];
  adminServicesStatus: FetchStatus;
  adminServicesError: string | null;
  fetchAdminServices: (signal?: AbortSignal) => Promise<void>;
  createService: (data: ServiceFormData) => Promise<void>;
  updateService: (
    id: string,
    data: Partial<serviceApi.ServiceInput>,
  ) => Promise<void>;

  reset: () => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  packages: [],
  packagesStatus: "idle",
  packagesError: null,

  fetchPackages: async (status, signal) => {
    set({ packagesStatus: "loading", packagesError: null });
    try {
      const query = status ? `?status=${status}` : "";
      // Tidak perlu lagi memanggil localStorage di sini, apiClient akan mengurusnya
      const data = await apiClient<PackageDTO[]>(`/packages${query}`, {
        signal,
      });
      set({ packages: data, packagesStatus: "success" });
    } catch (error: any) {
      if (error.name === "AbortError") return;
      set({
        packagesError: error.message || "Gagal memuat paket",
        packagesStatus: "error",
      });
    }
  },

  createPackage: async (data) => {
    set({ packagesStatus: "loading", packagesError: null });
    try {
      await apiClient("/packages", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await get().fetchPackages();
    } catch (error: any) {
      set({
        packagesError: error.message || "Gagal menambah paket",
        packagesStatus: "error",
      });
      throw error;
    }
  },

  updatePackage: async (id, data) => {
    set({ packagesStatus: "loading", packagesError: null });
    try {
      await apiClient(`/packages/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      await get().fetchPackages();
    } catch (error: any) {
      set({
        packagesError: error.message || "Gagal memperbarui paket",
        packagesStatus: "error",
      });
      throw error;
    }
  },

  services: [],
  fetchServices: async (signal) => {
    try {
      const data = await serviceApi.getServices(signal);
      set({ services: data });
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.warn(
          "Gagal memuat daftar layanan (Endpoint mungkin belum tersedia). Menggunakan data kosong.",
        );
        // Berikan data kosong agar komponen UI tidak macet saat menunggu mapping
        set({ services: [] });
      }
    }
  },

  adminServices: [],
  adminServicesStatus: "idle",
  adminServicesError: null,

  fetchAdminServices: async (signal) => {
    set({ adminServicesStatus: "loading", adminServicesError: null });
    try {
      const data = await serviceApi.getAllServices(signal);
      set({ adminServices: data, adminServicesStatus: "success" });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;
      set({
        adminServicesError:
          error instanceof Error ? error.message : "Gagal memuat layanan",
        adminServicesStatus: "error",
      });
    }
  },

  createService: async (data) => {
    await serviceApi.createService({
      name: data.name,
      description: data.description?.trim() ? data.description.trim() : null,
      active: data.active,
    });
    await Promise.all([get().fetchAdminServices(), get().fetchServices()]);
  },

  updateService: async (id, data) => {
    const payload = { ...data };
    if (typeof payload.description === "string") {
      payload.description = payload.description.trim() || null;
    }
    await serviceApi.updateService(id, payload);
    await Promise.all([get().fetchAdminServices(), get().fetchServices()]);
  },

  reset: () =>
    set({
      packages: [],
      packagesStatus: "idle",
      packagesError: null,
      services: [],
      adminServices: [],
      adminServicesStatus: "idle",
      adminServicesError: null,
    }),
}));
