import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ShimmerBlockProps {
  className?: string;
}

export function ShimmerBlock({ className }: ShimmerBlockProps) {
  return (
    <Skeleton
      className={cn("animate-none shimmer-surface rounded-md", className)}
    />
  );
}

export function PackageCardShimmer({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      aria-busy="true"
      aria-label="Memuat daftar paket latihan">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div>
            {/* Badge kategori */}
            <ShimmerBlock className="h-6 w-28 rounded-full" />

            {/* Judul paket */}
            <ShimmerBlock className="mt-4 h-7 w-3/4 rounded-lg" />

            {/* Deskripsi 2 baris */}
            <div className="mt-3 space-y-2">
              <ShimmerBlock className="h-4 w-full" />
              <ShimmerBlock className="h-4 w-5/6" />
            </div>

            {/* Blok harga & harga per sesi */}
            <div className="mt-6 border-y border-[#E2E8F0] py-4">
              <ShimmerBlock className="h-9 w-44 rounded-lg" />
              <ShimmerBlock className="mt-2 h-4 w-32" />
            </div>

            {/* Rincian sesi & masa berlaku */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <ShimmerBlock className="h-5 w-5 rounded-full shrink-0" />
                <ShimmerBlock className="h-4 w-36" />
              </div>
              <div className="flex items-center gap-2.5">
                <ShimmerBlock className="h-5 w-5 rounded-full shrink-0" />
                <ShimmerBlock className="h-4 w-44" />
              </div>
            </div>
          </div>

          {/* Tombol CTA */}
          <ShimmerBlock className="mt-6 h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function Scene3DShimmer() {
  return (
    <div
      className="relative w-full h-[380px] sm:h-[440px] lg:h-[480px] rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden shadow-sm"
      aria-busy="true"
      aria-label="Memuat tampilan mockup 3D">
      {/* Lapisan latar tipis bg-gymnasyum */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/bg-gymnasyum.webp')" }}
      />
      <div className="absolute inset-0 shimmer-surface opacity-70" />

      {/* Siluet mockup perangkat & kartu mengambang */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center p-6">
        <div className="w-56 sm:w-64 rounded-3xl border border-white/80 bg-white/70 p-4 shadow-md backdrop-blur-sm">
          <ShimmerBlock className="h-4 w-24 rounded-full" />
          <ShimmerBlock className="mt-3 h-24 w-full rounded-xl" />
          <div className="mt-3 space-y-2">
            <ShimmerBlock className="h-3.5 w-full" />
            <ShimmerBlock className="h-3.5 w-2/3" />
          </div>
          <ShimmerBlock className="mt-4 h-9 w-full rounded-lg" />
        </div>

        {/* Placeholder pil petunjuk interaksi */}
        <ShimmerBlock className="mt-6 h-7 w-40 rounded-full" />
      </div>
    </div>
  );
}
