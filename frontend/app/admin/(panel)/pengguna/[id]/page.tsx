"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireRole } from "@/features/auth/hooks/useRequireRole";
import { useMemberStore } from "@/features/members/store/useMemberStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { MemberDetail } from "@/features/members/components/MemberDetail";
import { MemberActivity } from "@/features/members/components/MemberActivity";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import type { MemberWithUserDTO } from "@/features/members/schemas";

export default function PenggunaDetailPage() {
  const { isAuthorized, isHydrated } = useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { members, fetchMembers, status } = useMemberStore();
  const [member, setMember] = useState<MemberWithUserDTO | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthorized) return;

    if (members.length === 0) {
      fetchMembers();
    } else {
      const found = members.find((m) => m.id === id);
      setMember(found || null);
    }
  }, [id, members, fetchMembers, isHydrated, isAuthorized]);

  if (!isAuthorized) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#1E293B]"
          onClick={() => router.push("/admin/pengguna")}>
          <ArrowLeft size={18} />
        </Button>
        <PageHeader
          title="Detail Pelanggan"
          description="Informasi profil, metrik fisik, dan riwayat aktivitas member."
        />
      </div>

      {status === "loading" && !member ? (
        <LoadingSkeleton variant="form" count={1} />
      ) : member ? (
        <>
          <MemberDetail memberData={member} />
          <MemberActivity memberId={member.id} />
        </>
      ) : (
        <div className="p-10 text-center text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl">
          Data pelanggan tidak ditemukan.
        </div>
      )}
    </div>
  );
}
