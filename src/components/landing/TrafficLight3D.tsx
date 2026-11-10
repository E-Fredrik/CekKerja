"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  type Group,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PointLight,
  Shape,
  SphereGeometry,
} from "three";
import { litLamp } from "@/components/landing/signal.ts";

type Palette = { housing: string; pole: string; rim: string; red: string; yellow: string; green: string };

const BODY = { width: 1.12, height: 3.05, radius: 0.24, depth: 0.62, bevel: 0.05 };
const FACE_Z = BODY.depth / 2 + BODY.bevel;
const LENS_RADIUS = 0.3;
const HOOD = { radius: 0.37, length: 0.46, wrap: 0.34 };
const LAMPS = [
  { key: "red", y: 0.98 },
  { key: "yellow", y: 0 },
  { key: "green", y: -0.98 },
] as const;
const SWAY = 0.55;
const SETTLE_RATE = 9;

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    housing: token("--housing"),
    pole: token("--line-strong"),
    rim: token("--on-shell-soft"),
    red: token("--stop"),
    yellow: token("--warn"),
    green: token("--go"),
  };
}

function roundedRect(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,0.5)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.22)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

function damp(current: number, target: number, delta: number) {
  return current + (target - current) * (1 - Math.exp(-SETTLE_RATE * delta));
}

function SignalHead({ progress, palette }: { progress: MotionValue<number>; palette: Palette }) {
  const head = useRef<Group>(null);
  const lenses = useRef<MeshStandardMaterial[]>([]);
  const glows = useRef<MeshBasicMaterial[]>([]);
  const lampLight = useRef<PointLight>(null);
  const levels = useRef([1, 0, 0]);
  const invalidate = useThree((state) => state.invalidate);

  const base = useMemo(() => LAMPS.map((lamp) => new Color(palette[lamp.key])), [palette]);
  const body = useMemo(() => {
    const geometry = new ExtrudeGeometry(roundedRect(BODY.width, BODY.height, BODY.radius), {
      depth: BODY.depth,
      bevelEnabled: true,
      bevelThickness: BODY.bevel,
      bevelSize: BODY.bevel,
      bevelSegments: 6,
      curveSegments: 24,
    });
    geometry.center();
    return geometry;
  }, []);
  const lens = useMemo(() => new SphereGeometry(LENS_RADIUS, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), []);
  const hood = useMemo(
    () => new CylinderGeometry(HOOD.radius, HOOD.radius, HOOD.length, 48, 1, true, Math.PI / 2 - HOOD.wrap, Math.PI + HOOD.wrap * 2),
    [],
  );
  const glow = useMemo(() => glowTexture(), []);

  useEffect(() => progress.on("change", () => invalidate()), [progress, invalidate]);
  useFrame((_, delta) => {
    const p = progress.get();
    const lit = litLamp(p);
    let moving = false;

    if (head.current) {
      const target = -SWAY + p * SWAY * 2;
      head.current.rotation.y = damp(head.current.rotation.y, target, delta);
      if (Math.abs(head.current.rotation.y - target) > 0.0005) moving = true;
    }

    levels.current = levels.current.map((level, i) => {
      const target = i === lit ? 1 : 0;
      const next = damp(level, target, delta);
      if (Math.abs(next - target) > 0.002) moving = true;
      return next;
    });

    lenses.current.forEach((material, index) => {
      const i = index % 3;
      const level = levels.current[i];
      material.color.copy(base[i]).multiplyScalar(0.16 + level * 0.84);
      material.emissiveIntensity = level * 0.9;
    });
    glows.current.forEach((material, index) => {
      material.opacity = levels.current[index % 3] * 0.9;
    });
    if (lampLight.current) {
      lampLight.current.color.copy(base[lit]);
      lampLight.current.position.y = LAMPS[lit].y + HOOD.radius * 0.8;
      lampLight.current.intensity = levels.current[lit] * 1.4;
    }

    if (moving) invalidate();
  });

  return (
    <group position={[0, 0.55, 0]}>
      <group ref={head} rotation={[0, -SWAY, 0]}>
        <mesh geometry={body}>
          <meshStandardMaterial color={palette.housing} roughness={0.42} metalness={0.25} />
        </mesh>
        {[0, 1].map((side) => (
          <group key={side} rotation={[0, side * Math.PI, 0]}>
            {LAMPS.map((lamp, i) => (
              <group key={lamp.key} position={[0, lamp.y, FACE_Z]}>
                <mesh position={[0, 0, 0.002]}>
                  <circleGeometry args={[LENS_RADIUS + 0.03, 48]} />
                  <meshStandardMaterial color={palette.housing} roughness={0.95} />
                </mesh>
                <mesh position={[0, 0, 0.012]}>
                  <torusGeometry args={[LENS_RADIUS + 0.035, 0.03, 12, 48]} />
                  <meshStandardMaterial color={palette.housing} roughness={0.28} metalness={0.6} />
                </mesh>
                <mesh geometry={lens} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.38, 1]}>
                  <meshStandardMaterial
                    ref={(material) => {
                      if (material) lenses.current[side * 3 + i] = material;
                    }}
                    color={palette[lamp.key]}
                    emissive={palette[lamp.key]}
                    emissiveIntensity={0}
                    roughness={0.18}
                  />
                </mesh>
                <mesh position={[0, 0, 0.14]}>
                  <planeGeometry args={[1.5, 1.5]} />
                  <meshBasicMaterial
                    ref={(material) => {
                      if (material) glows.current[side * 3 + i] = material;
                    }}
                    map={glow}
                    color={palette[lamp.key]}
                    transparent
                    opacity={0}
                    depthWrite={false}
                    blending={AdditiveBlending}
                    toneMapped={false}
                  />
                </mesh>
                <mesh geometry={hood} position={[0, 0, HOOD.length / 2]} rotation={[Math.PI / 2, 0, 0]}>
                  <meshStandardMaterial color={palette.housing} roughness={0.5} metalness={0.2} side={DoubleSide} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        <pointLight ref={lampLight} position={[0, LAMPS[0].y + HOOD.radius * 0.8, FACE_Z + 0.3]} distance={2} decay={2} intensity={1.4} />
      </group>
      <mesh position={[0, -BODY.height / 2 - 0.12, 0]}>
        <boxGeometry args={[0.42, 0.24, 0.42]} />
        <meshStandardMaterial color={palette.housing} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, -BODY.height / 2 - 4.2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 8, 32]} />
        <meshStandardMaterial color={palette.pole} roughness={0.55} metalness={0.45} />
      </mesh>
    </group>
  );
}

export function TrafficLight3D({ progress }: { progress: MotionValue<number> }) {
  const palette = useMemo(() => readPalette(), []);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.35, 9.4], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
    >
      <hemisphereLight args={[palette.rim, palette.housing, 1.1]} />
      <directionalLight position={[4, 6, 6]} intensity={2.2} />
      <directionalLight position={[-5, 3, -4]} intensity={3} color={palette.rim} />
      <directionalLight position={[5, -1, -3]} intensity={1.4} color={palette.rim} />
      <SignalHead progress={progress} palette={palette} />
    </Canvas>
  );
}
