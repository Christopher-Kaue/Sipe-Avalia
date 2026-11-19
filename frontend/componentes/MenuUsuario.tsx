"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function MenuUsuario({ nome, login, perfil, iniciais, sair }: {
  nome: string;
  login: string;
  perfil: string;
  iniciais: string;
  sair: () => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  return (
    <div className="menu-usuario" ref={ref}>
      <button type="button" className="menu-gatilho" aria-expanded={aberto} aria-haspopup="menu" onClick={() => setAberto((a) => !a)}>
        <span className="usuario-id"><strong>{nome}</strong><span>{perfil}</span></span>
        <span className="avatar" aria-hidden="true">{iniciais}</span>
        <svg className="seta-menu" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <div className={`menu-pop${aberto ? " aberto" : ""}`} role="menu">
        <div className="menu-pop-cab">
          <span className="avatar avatar-g" aria-hidden="true">{iniciais}</span>
          <div><strong>{nome}</strong><span className="mono">{login}</span></div>
        </div>
        <span className="menu-pop-perfil">{perfil}</span>
        <Link href="/conta" className="menu-item" role="menuitem" onClick={() => setAberto(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          Alterar minha senha
        </Link>
        <form action={sair}>
          <button type="submit" className="menu-sair" role="menuitem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" /></svg>
            Sair do sistema
          </button>
        </form>
      </div>
    </div>
  );
}
