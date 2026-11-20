export interface PublicPackageDTO {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: string;
  totalSessions: number;
  validityDays: number;
  status: "active" | "inactive" | "archived";
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicPackagesResult {
  packages: PublicPackageDTO[];
  requiresAuth: boolean;
  error: string | null;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function getPublicActivePackages(
  signal?: AbortSignal,
): Promise<PublicPackagesResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/packages?status=active`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return {
        packages: [],
        requiresAuth: true,
        error: null,
      };
    }

    if (!res.ok) {
      return {
        packages: [],
        requiresAuth: false,
        error: "Daftar paket belum dapat dimuat saat ini.",
      };
    }

    const data = (await res.json()) as PublicPackageDTO[];
    const activeOnly = Array.isArray(data)
      ? data.filter((item) => item.status === "active")
      : [];

    return {
      packages: activeOnly,
      requiresAuth: false,
      error: null,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { packages: [], requiresAuth: false, error: null };
    }
    return {
      packages: [],
      requiresAuth: false,
      error: "Tidak dapat terhubung ke server untuk memuat katalog paket.",
    };
  }
}
