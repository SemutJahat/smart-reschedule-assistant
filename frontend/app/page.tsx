import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-8">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-[#E2E8F0]">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="relative w-20 h-20 mb-4">
            <Image
              src="/logo-gymnasyum.webp"
              alt="Gymnasyum Logo"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">
            Selamat Datang di Gymnasyum
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Masuk ke akun Anda atau daftar untuk mulai latihan
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants(),
              "w-full bg-[#65C466] hover:bg-[#52a653] text-white font-bold h-11 rounded-lg transition-colors",
            )}>
            Masuk
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full border-[#65C466] text-[#52A353] hover:bg-[#65C466]/10 font-bold h-11 rounded-lg transition-colors",
            )}>
            Daftar Akun Baru
          </Link>
        </div>
      </div>
    </div>
  );
}
