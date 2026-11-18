import { apiClient } from "./client";

export interface ServiceDTO {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mengambil daftar semua layanan
export async function getServices(signal?: AbortSignal): Promise<ServiceDTO[]> {
  return apiClient<ServiceDTO[]>("/services", { signal });
}

export async function getAllServices(
  signal?: AbortSignal,
): Promise<ServiceDTO[]> {
  return apiClient<ServiceDTO[]>("/services?includeInactive=true", { signal });
}

export interface ServiceInput {
  name: string;
  description?: string | null;
  active?: boolean;
}

export async function createService(data: ServiceInput): Promise<ServiceDTO> {
  return apiClient<ServiceDTO>("/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateService(
  id: string,
  data: Partial<ServiceInput>,
): Promise<ServiceDTO> {
  return apiClient<ServiceDTO>(`/services/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
