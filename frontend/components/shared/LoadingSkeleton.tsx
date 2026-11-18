import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "card" | "table" | "form";
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = "card",
  count = 1,
  className,
}: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div
        className={cn(
          "rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden",
          className,
        )}>
        <div className="flex gap-4 px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6 ml-auto" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-[#E2E8F0] last:border-b-0">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("space-y-6", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-sm space-y-5">
            <Skeleton className="h-6 w-1/3" />
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col h-[300px]">
          <div className="flex justify-between items-start mb-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-4/5 mb-8" />

          <Skeleton className="h-8 w-1/3 mb-4" />

          <div className="mt-auto space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="flex justify-between mt-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>

          <Skeleton className="h-10 w-full mt-4" />
        </div>
      ))}
    </div>
  );
}
