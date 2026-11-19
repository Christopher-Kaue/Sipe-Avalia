"use client";
import { useEffect, useRef } from "react";

/**
 * Elemento que publica a posição do mouse como variáveis CSS:
 * --px/--py (em %) para o brilho e --mx/--my (-1…1) para a paralaxe.
 */
export function Holofote({ as: Tag = "section", className, children }: {
  as?: "section" | "aside" | "header" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--px", `${x * 100}%`);
        el.style.setProperty("--py", `${y * 100}%`);
        el.style.setProperty("--mx", (x * 2 - 1).toFixed(3));
        el.style.setProperty("--my", (y * 2 - 1).toFixed(3));
      });
    };
    const sair = () => {
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", sair);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", sair);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Tag ref={ref as any} className={className}>{children}</Tag>;
}
