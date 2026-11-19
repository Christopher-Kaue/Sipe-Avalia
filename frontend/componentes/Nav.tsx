"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

const ativoEm = (atual: string, href: string) =>
  atual === href || atual.startsWith(href + "/") || (href === "/avaliar" && atual.startsWith("/projeto/"));

/** Navegação com um indicador que desliza até o item ativo. */
export function Nav({ itens }: { itens: Array<{ href: string; rotulo: string }> }) {
  const atual = usePathname();
  const nav = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const medir = () => {
      const a = nav.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      setInd(a ? { x: a.offsetLeft, w: a.offsetWidth } : null);
      a?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    medir();
    window.addEventListener("resize", medir);
    document.fonts?.ready.then(medir);
    return () => window.removeEventListener("resize", medir);
  }, [atual]);

  return (
    <nav className="nav" aria-label="Principal" ref={nav}>
      {ind && <span className="nav-indicador" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} aria-hidden="true" />}
      {itens.map((i) => (
        <Link key={i.href} href={i.href} aria-current={ativoEm(atual, i.href) ? "page" : undefined}>
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}
