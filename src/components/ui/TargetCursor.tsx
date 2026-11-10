"use client";

import { motion, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";

const TARGETS = "a[href], button:not(:disabled), [role='radio'], input:not([type='hidden']), textarea, select";
const PAD = 6;
const SPRING = { stiffness: 520, damping: 42, mass: 0.5 };
const CORNER = "absolute w-2.5 h-2.5 border-sign-blue";

export function TargetCursor() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);
  const width = useSpring(0, SPRING);
  const height = useSpring(0, SPRING);

  useEffect(() => {
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

    function setShown(value: boolean) {
      shown.current = value;
      setVisible(value);
    }

    function onOver(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const el = e.target instanceof Element ? e.target.closest(TARGETS) : null;
      if (!el) return setShown(false);
      const r = el.getBoundingClientRect();
      const box: [typeof x, number][] = [
        [x, r.left - PAD],
        [y, r.top - PAD],
        [width, r.width + PAD * 2],
        [height, r.height + PAD * 2],
      ];
      box.forEach(([value, to]) => (shown.current ? value.set(to) : value.jump(to)));
      setShown(true);
    }

    function hide() {
      setShown(false);
    }

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerleave", hide);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("scroll", hide);
    };
  }, [reduceMotion, x, y, width, height]);

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-50 transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ x, y, width, height }}
    >
      <span className={`${CORNER} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${CORNER} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${CORNER} left-0 bottom-0 border-l-2 border-b-2`} />
      <span className={`${CORNER} right-0 bottom-0 border-r-2 border-b-2`} />
    </motion.div>
  );
}
