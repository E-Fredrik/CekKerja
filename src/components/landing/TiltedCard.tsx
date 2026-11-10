"use client";

import { motion, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

const SPRING = { stiffness: 160, damping: 18, mass: 0.6 };

export function TiltedCard({ children, maxTilt = 8 }: { children: ReactNode; maxTilt?: number }) {
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(0, SPRING);
  const rotateY = useSpring(0, SPRING);

  function tilt(e: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width - 0.5;
    const y = (e.clientY - box.top) / box.height - 0.5;
    rotateX.set(-y * maxTilt * 2);
    rotateY.set(x * maxTilt * 2);
  }

  function reset() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      style={{ perspective: 1000, transformPerspective: 1000 }}
      initial={reduceMotion ? false : { opacity: 0, rotateX: 14, y: 24 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div onPointerMove={tilt} onPointerLeave={reset} style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
