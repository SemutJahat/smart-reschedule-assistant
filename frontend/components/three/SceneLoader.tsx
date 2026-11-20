"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";
import { Scene3DShimmer } from "@/components/shared/ShimmerSkeleton";
import { SceneFallback } from "./SceneFallback";

const GymMockupCanvas = dynamic(() => import("./GymMockupCanvas"), {
  ssr: false,
  loading: () => <Scene3DShimmer />,
});

export function SceneLoader() {
  const webGLSupported = useWebGLSupport();
  const reducedMotion = useReducedMotion();

  if (webGLSupported === null) {
    return <Scene3DShimmer />;
  }

  if (!webGLSupported || reducedMotion) {
    return <SceneFallback />;
  }

  return <GymMockupCanvas reducedMotion={reducedMotion} />;
}
