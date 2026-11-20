"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import type * as THREE from "three";

interface GymMockupModelProps {
  reducedMotion: boolean;
}

export function GymMockupModel({ reducedMotion }: GymMockupModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const dumbbellRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    if (rootRef.current) {
      rootRef.current.rotation.y += delta * 0.22;
      rootRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
    }
    if (dumbbellRef.current) {
      dumbbellRef.current.rotation.z += delta * 0.35;
    }
  });

  return (
    <Float
      speed={reducedMotion ? 0 : 1.6}
      rotationIntensity={reducedMotion ? 0 : 0.25}
      floatIntensity={reducedMotion ? 0 : 0.45}>
      <group ref={rootRef} position={[0, 0.05, 0]}>
        <RoundedBox args={[2.35, 3.6, 0.18]} radius={0.22} smoothness={4}>
          <meshStandardMaterial
            color="#1E293B"
            roughness={0.32}
            metalness={0.25}
          />
        </RoundedBox>

        <RoundedBox
          args={[2.12, 3.36, 0.04]}
          radius={0.16}
          smoothness={4}
          position={[0, 0, 0.09]}>
          <meshStandardMaterial
            color="#F8FAFC"
            roughness={0.4}
            metalness={0.05}
          />
        </RoundedBox>

        <RoundedBox
          args={[1.82, 0.44, 0.04]}
          radius={0.1}
          smoothness={3}
          position={[0, 1.24, 0.13]}>
          <meshStandardMaterial
            color="#65C466"
            roughness={0.3}
            metalness={0.05}
          />
        </RoundedBox>

        <RoundedBox
          args={[1.86, 0.92, 0.07]}
          radius={0.12}
          smoothness={3}
          position={[0.16, 0.34, 0.24]}>
          <meshStandardMaterial
            color="#FFFFFF"
            roughness={0.25}
            metalness={0.05}
          />
        </RoundedBox>

        <RoundedBox
          args={[0.1, 0.68, 0.03]}
          radius={0.04}
          smoothness={2}
          position={[-0.64, 0.34, 0.28]}>
          <meshStandardMaterial color="#65C466" roughness={0.3} />
        </RoundedBox>

        <RoundedBox
          args={[1.1, 0.12, 0.02]}
          radius={0.04}
          smoothness={2}
          position={[0.1, 0.5, 0.28]}>
          <meshStandardMaterial color="#1E293B" roughness={0.4} />
        </RoundedBox>
        <RoundedBox
          args={[0.8, 0.09, 0.02]}
          radius={0.03}
          smoothness={2}
          position={[-0.05, 0.25, 0.28]}>
          <meshStandardMaterial color="#94A3B8" roughness={0.5} />
        </RoundedBox>

        <RoundedBox
          args={[1.72, 0.64, 0.08]}
          radius={0.12}
          smoothness={3}
          position={[-0.22, -0.62, 0.32]}>
          <meshStandardMaterial
            color="#1E293B"
            roughness={0.3}
            metalness={0.15}
          />
        </RoundedBox>
        <RoundedBox
          args={[1.22, 0.1, 0.02]}
          radius={0.03}
          smoothness={2}
          position={[-0.32, -0.52, 0.37]}>
          <meshStandardMaterial color="#65C466" roughness={0.3} />
        </RoundedBox>
        <RoundedBox
          args={[0.96, 0.08, 0.02]}
          radius={0.03}
          smoothness={2}
          position={[-0.45, -0.72, 0.37]}>
          <meshStandardMaterial color="#E2E8F0" roughness={0.4} />
        </RoundedBox>

        <RoundedBox
          args={[1.64, 0.34, 0.05]}
          radius={0.1}
          smoothness={3}
          position={[0, -1.28, 0.16]}>
          <meshStandardMaterial
            color="#65C466"
            roughness={0.28}
            metalness={0.08}
          />
        </RoundedBox>

        <group
          ref={dumbbellRef}
          position={[1.55, 1.05, 0.45]}
          rotation={[0.4, -0.5, 0.55]}>

          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 1.05, 24]} />
            <meshStandardMaterial
              color="#94A3B8"
              metalness={0.6}
              roughness={0.25}
            />
          </mesh>

          <mesh position={[-0.46, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.34, 0.34, 0.2, 28]} />
            <meshStandardMaterial
              color="#1E293B"
              roughness={0.35}
              metalness={0.2}
            />
          </mesh>
          <mesh position={[-0.58, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.08, 28]} />
            <meshStandardMaterial color="#65C466" roughness={0.3} />
          </mesh>

          <mesh position={[0.46, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.34, 0.34, 0.2, 28]} />
            <meshStandardMaterial
              color="#1E293B"
              roughness={0.35}
              metalness={0.2}
            />
          </mesh>
          <mesh position={[0.58, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.08, 28]} />
            <meshStandardMaterial color="#65C466" roughness={0.3} />
          </mesh>
        </group>

        <mesh position={[-1.35, -1.15, -0.35]} rotation={[0.6, 0.4, 0]}>
          <torusGeometry args={[0.42, 0.1, 20, 48]} />
          <meshStandardMaterial
            color="#65C466"
            roughness={0.3}
            metalness={0.15}
          />
        </mesh>
      </group>
    </Float>
  );
}
