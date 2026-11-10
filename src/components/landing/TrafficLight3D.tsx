"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { Color, type Group, type MeshStandardMaterial } from "three";

type Palette = { housing: string; pole: string; red: string; yellow: string; green: string };

const LAMPS = [
  { key: "red", y: 0.9 },
  { key: "yellow", y: 0 },
  { key: "green", y: -0.9 },
] as const;

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return { housing: v("--housing"), pole: v("--line-strong"), red: v("--stop"), yellow: v("--warn"), green: v("--go") };
}

export function litLamp(progress: number) {
  return progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;
}

function Light({ progress, palette }: { progress: MotionValue<number>; palette: Palette }) {
  const group = useRef<Group>(null);
  const materials = useRef<MeshStandardMaterial[]>([]);
  const invalidate = useThree((s) => s.invalidate);
  const base = useMemo(() => LAMPS.map((lamp) => new Color(palette[lamp.key])), [palette]);

  useEffect(() => progress.on("change", () => invalidate()), [progress, invalidate]);

  useFrame(() => {
    const p = progress.get();
    if (group.current) group.current.rotation.y = -0.45 + p * Math.PI * 2;
    const lit = litLamp(p);
    materials.current.forEach((m, i) => {
      const on = i % 3 === lit;
      m.emissiveIntensity = on ? 1.4 : 0;
      m.color.copy(base[i % 3]).multiplyScalar(on ? 1 : 0.22);
    });
  });

  const faces = [0.36, -0.36];

  return (
    <group ref={group} position={[0, 0.5, 0]}>
      <mesh>
        <boxGeometry args={[1.05, 2.9, 0.62]} />
        <meshStandardMaterial color={palette.housing} roughness={0.55} metalness={0.2} />
      </mesh>
      {faces.map((z, f) =>
        LAMPS.map((lamp, i) => (
          <group key={`${f}-${lamp.key}`} position={[0, lamp.y, z]} rotation={[0, f ? Math.PI : 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.31, 32, 32]} />
              <meshStandardMaterial
                ref={(m) => {
                  if (m) materials.current[f * 3 + i] = m;
                }}
                color={palette[lamp.key]}
                emissive={palette[lamp.key]}
                emissiveIntensity={0}
                roughness={0.35}
              />
            </mesh>
            <mesh position={[0, 0.2, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.38, 0.38, 0.34, 32, 1, true, -Math.PI / 2, Math.PI]} />
              <meshStandardMaterial color={palette.housing} roughness={0.6} side={2} />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[0, -2.75, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 2.6, 24]} />
        <meshStandardMaterial color={palette.pole} roughness={0.7} metalness={0.3} />
      </mesh>
    </group>
  );
}

export function TrafficLight3D({ progress }: { progress: MotionValue<number> }) {
  const palette = useMemo(() => readPalette(), []);
  return (
    <Canvas frameloop="demand" dpr={[1, 1.75]} camera={{ position: [0, -0.6, 8.4], fov: 34 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} />
      <Light progress={progress} palette={palette} />
    </Canvas>
  );
}
