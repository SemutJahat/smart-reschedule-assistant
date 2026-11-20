import { Suspense } from "react";
import type { Metadata } from "next";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { LandingPackagesBridge } from "@/components/layout/LandingPackagesBridge";
import { HeroSection } from "@/components/sections/HeroSection";
import { AudienceSection } from "@/components/sections/AudienceSection";
import { FeaturesBentoSection } from "@/components/sections/FeaturesBentoSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { CtaSection } from "@/components/sections/CtaSection";
import { PackageCardShimmer } from "@/components/shared/ShimmerSkeleton";
import { getPublicActivePackages } from "@/lib/api/public-packages";

export const metadata: Metadata = {
  title: "Gymnasyum — Gym, Private Coaching & Smart Reschedule Assistant",
  description:
    "Latihan bersama coach pribadi dengan jadwal tetap fleksibel. Pesan sesi, pantau sisa kuota paket, dan pindah jadwal cukup lewat chat.",
  metadataBase: new URL("https://pastiviral.com"),
  openGraph: {
    title: "Gymnasyum — Latihan Bersama Coach Pribadi, Jadwal Tetap Fleksibel",
    description:
      "Pesan sesi latihan, pantau sisa kuota paket secara transparan, dan ajukan pindah jadwal cukup lewat asisten chat.",
    url: "https://pastiviral.com",
    siteName: "Gymnasyum",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/bg-gymnasyum.webp",
        width: 1200,
        height: 630,
        alt: "Gymnasyum Studio & Smart Reschedule Assistant",
      },
    ],
  },
};

async function DynamicPackagesSection() {
  const packagesResult = await getPublicActivePackages();
  return <LandingPackagesBridge initialResult={packagesResult} />;
}

function PackagesFallback() {
  return (
    <section id="paket" className="scroll-mt-24 bg-[#F8FAFC] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <PackageCardShimmer count={3} />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      <PublicNavbar />

      <main>
        <HeroSection />
        <AudienceSection />
        <FeaturesBentoSection />
        <HowItWorksSection />
        <Suspense fallback={<PackagesFallback />}>
          <DynamicPackagesSection />
        </Suspense>
        <CtaSection />
      </main>

      <PublicFooter />
    </div>
  );
}
