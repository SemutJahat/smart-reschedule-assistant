import { apiClient } from "./client";
import type { PackageDTO } from "@/features/catalog/schemas";
import type {
  PaymentRecordDTO,
  SubscriptionRecordDTO,
} from "@/features/my-package/schemas";

export async function getMySubscriptions(signal?: AbortSignal) {
  return apiClient<SubscriptionRecordDTO[]>("/subscriptions/me", { signal });
}

export async function getMyPayments(signal?: AbortSignal) {
  return apiClient<PaymentRecordDTO[]>("/payments/me", { signal });
}

export async function getAllPackages(signal?: AbortSignal) {
  const lists = await Promise.all(
    (["active", "inactive", "archived"] as const).map((status) =>
      apiClient<PackageDTO[]>(`/packages?status=${status}`, { signal }),
    ),
  );
  return lists.flat();
}
