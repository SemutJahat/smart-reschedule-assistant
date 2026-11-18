"use client";

import { useEffect } from "react";
import { CalendarCheck, Inbox } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useRescheduleReviewStore } from "../store/useRescheduleReviewStore";
import { RescheduleRequestCard } from "./RescheduleRequestCard";

export function RescheduleQueue() {
  const { requests, status, error, fetchRequests } = useRescheduleReviewStore();

  useEffect(() => {
    const controller = new AbortController();
    fetchRequests(controller.signal);
    return () => controller.abort();
  }, [fetchRequests]);

  if (status === "loading" && requests.length === 0) {
    return <LoadingSkeleton variant="table" count={3} />;
  }

  if (status === "error") {
    return <ErrorState message={error ?? undefined} onRetry={() => fetchRequests()} />;
  }

  const open = requests.filter(
    (r) => r.status === "pending" || r.status === "held",
  );
  const reviewed = requests.filter(
    (r) => r.status !== "pending" && r.status !== "held",
  );

  return (
    <Tabs defaultValue="antrean" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
        <TabsTrigger value="antrean">Antrean ({open.length})</TabsTrigger>
        <TabsTrigger value="riwayat">Riwayat ({reviewed.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="antrean" className="space-y-4">
        {open.length === 0 ? (
          <EmptyState
            icon={<Inbox size={48} />}
            title="Tidak Ada Pengajuan"
            description="Belum ada pengajuan reschedule yang menunggu ditinjau."
          />
        ) : (
          open.map((r) => <RescheduleRequestCard key={r.id} request={r} />)
        )}
      </TabsContent>

      <TabsContent value="riwayat" className="space-y-4">
        {reviewed.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck size={48} />}
            title="Belum Ada Riwayat"
            description="Pengajuan yang sudah disetujui atau ditolak akan muncul di sini."
          />
        ) : (
          reviewed.map((r) => <RescheduleRequestCard key={r.id} request={r} />)
        )}
      </TabsContent>
    </Tabs>
  );
}
