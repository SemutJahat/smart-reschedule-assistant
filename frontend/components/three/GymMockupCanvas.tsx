"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { MoveHorizontal } from "lucide-react";
import { GymMockupModel } from "./GymMockupModel";

interface GymMockupCanvasProps {
  reducedMotion: boolean;
}

export default function GymMockupCanvas({
  reducedMotion,
}: GymMockupCanvasProps) {
  return (
    <div className="relative h-[380px] sm:h-[440px] lg:h-[480px] w-full overflow-hidden rounded-3xl border border-[#E2E8F0] bg-gradient-to-br from-white via-[#F8FAFC] to-[#65C466]/10 shadow-xl shadow-slate-200/70">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('/bg-gymnasyum.webp')" }}
      />

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 6.2], fov: 38 }}
        gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.85} />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 0.7]} />
        <directionalLight position={[5, 7, 5]} intensity={1.35} />
        <pointLight position={[-4, -2, 4]} intensity={0.55} color="#65C466" />

        <Suspense fallback={null}>
          <GymMockupModel reducedMotion={reducedMotion} />
          <ContactShadows
            position={[0, -2.15, 0]}
            opacity={0.28}
            scale={7}
            blur={2.4}
            far={4}
            color="#1E293B"
          />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={(Math.PI * 2) / 3}
        />
      </Canvas>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] shadow-sm backdrop-blur-sm">
          <MoveHorizontal className="h-3.5 w-3.5 text-[#52A353]" />
          Geser untuk memutar model 3D
        </div>
      </div>
    </div>
  );
}
