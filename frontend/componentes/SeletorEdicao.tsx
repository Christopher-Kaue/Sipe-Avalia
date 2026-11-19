"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Opcao = { ano: number; numero: string; encerrada: boolean };

/**
 * Ano do SIPE ao lado da marca. Para a coordenação vira um menu: cada ano guarda os próprios
 * trabalhos, salas e avaliações. Professores só veem o selo da edição atual.
 */
export function SeletorEdicao({ atual, opcoes, trocar }: {
  atual: Opcao;
  opcoes?: Opcao[];
  trocar?: (fd: FormData) => Promise<void>;
}) {
  const caminho = usePathname();
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

  const selo = (
    <>
      <strong>SIPE <span className="ano">{atual.ano}</span></strong>
      <span>{atual.numero} Edição{atual.encerrada ? " · encerrada" : ""}</span>
    </>
  );

  if (!opcoes || !trocar) return <span className="marca-evento">{selo}</span>;

  return (
    <div className="seletor-edicao" ref={ref}>
      <button type="button" className="marca-evento seletor-gatilho" aria-expanded={aberto} aria-haspopup="menu" onClick={() => setAberto((a) => !a)} title="Trocar a edição (ano)">
        {selo}
        <svg className="seta-menu" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <div className={`menu-pop seletor-pop${aberto ? " aberto" : ""}`} role="menu">
        <span className="menu-pop-perfil">Edições do SIPE</span>
        <form action={trocar} onSubmit={() => setAberto(false)}>
          <input type="hidden" name="caminho" value={caminho} />
          <ul className="anos">
            {opcoes.map((o, i) => (
              <li key={o.ano}>
                <button type="submit" name="ano" value={o.ano} role="menuitemradio" aria-checked={o.ano === atual.ano} className={o.ano === atual.ano ? "atual" : undefined}>
                  <b>{o.ano}</b>
                  <span>{o.numero} Edição</span>
                  {i === 0 ? <em className="selo selo-ok">atual</em> : o.encerrada ? <em className="selo selo-liso">encerrada</em> : null}
                </button>
              </li>
            ))}
          </ul>
        </form>
        <Link href="/edicoes" className="seletor-gerenciar" onClick={() => setAberto(false)}>+ Nova edição · gerenciar anos</Link>
      </div>
    </div>
  );
}
