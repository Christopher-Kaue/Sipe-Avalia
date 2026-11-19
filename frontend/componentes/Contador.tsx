"use client";
import { useEffect, useState } from "react";

/** Número que conta de 0 até o valor ao aparecer na tela. */
export function Contador({ valor, casas = 0, sufixo = "" }: { valor: number; casas?: number; sufixo?: string }) {
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || valor === 0) {
      setAtual(valor);
      return;
    }
    const dur = 1100;
    const ini = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - ini) / dur);
      const suave = 1 - Math.pow(1 - k, 4);
      setAtual(valor * suave);
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    setAtual(0);
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);

  return (
    <>
      {atual.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}
      {sufixo}
    </>
  );
}
