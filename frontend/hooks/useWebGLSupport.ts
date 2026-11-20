"use client";

import { useSyncExternalStore } from "react";

let cachedSupport: boolean | null = null;

function subscribe() {
  return () => {};
}

function getSnapshot(): boolean | null {
  if (cachedSupport !== null) return cachedSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    cachedSupport = Boolean(gl);
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}

function getServerSnapshot(): boolean | null {
  return null;
}

export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
