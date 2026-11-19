"use client";
import { useEffect, useRef, useState } from "react";
import { Raios } from "@frontend/componentes/Raios";

/** Critérios reais da rubrica, com o nível que a demonstração vai marcando. */
const DEMO: Array<[string, number, 0 | 1 | 2]> = [
  ["Introdução", 1.5, 2],
  ["Objetivo", 1.0, 1],
  ["Metodologia", 2.0, 2],
  ["Resultados", 3.0, 2],
  ["Referências", 0.5, 2],
  ["Apresentação", 2.0, 2],
];

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Ficha que se preenche sozinha, em loop, para mostrar como a avaliação funciona. */
function FichaDemo() {
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPasso(DEMO.length);
      return;
    }
    let p = 0;
    const id = window.setInterval(() => {
      p = p >= DEMO.length + 4 ? 0 : p + 1; // pausa no fim antes de recomeçar
      setPasso(p);
    }, 650);
    return () => window.clearInterval(id);
  }, []);

  const feitos = Math.min(passo, DEMO.length);
  const total = DEMO.slice(0, feitos).reduce((s, [, peso, n]) => s + (peso * n) / 2, 0);

  return (
    <div className="demo" aria-hidden="true">
      <div className="demo-ficha">
        <div className="demo-cab">
          <span className="rotulo">Rubrica do pôster</span>
          <span className="carimbo"><small>Nº</small>1128</span>
        </div>
        <div className="demo-titulo"><i /><i /></div>
        {DEMO.map(([nome, , nivel], i) => (
          <div key={nome} className="demo-linha">
            <span>{nome}</span>
            <span className="demo-niveis">
              {[0, 1, 2].map((n) => (
                <span key={n} className={i < feitos && n === nivel ? `on${n === 2 ? " max" : ""}` : undefined} />
              ))}
            </span>
          </div>
        ))}
        <div className="demo-total">
          <span className="rotulo">{feitos} de 6</span>
          <span><strong>{fmt(total)}</strong> <small>/10</small></span>
        </div>
      </div>
      <div className="demo-selo s1"><span className="rotulo" style={{ color: "rgba(255,255,255,.55)" }}>Sala</span><b>204</b></div>
      <div className={`demo-selo s2${feitos === DEMO.length ? " visivel" : ""}`}><span className="ok">✓</span> Avaliação salva</div>
    </div>
  );
}

export function LadoArte({ passos = true, edicao }: { passos?: boolean; edicao: { ano: number; numero: string } }) {
  const ref = useRef<HTMLElement>(null);

  // holofote e paralaxe acompanham o mouse
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

  return (
    <aside className="login-arte" ref={ref}>
      <Raios quantidade={26} />

      <div className="login-topo">
        <img className="login-logo" src="/brand/fadergs-logo-branco.png" alt="FADERGS Centro Universitário" width={208} height={42} />
        <span className="login-chip"><i /> Avaliações abertas</span>
      </div>

      <div className="login-meio">
        <div className="login-titulo">
          <span className="rotulo">Salão de Iniciação Científica, Pesquisa e Extensão</span>
          <h1>
            <span className="linha"><span>Avaliação</span></span>
            <span className="linha"><span>de <em>pôsteres</em></span></span>
          </h1>
          <p>A rubrica oficial do SIPE, no celular ou no computador, em menos de um minuto por trabalho.</p>
          {passos && (
            <ol className="login-passos">
              {["Digite o código do pôster", "Confira os autores e a sala", "Marque a rubrica e salve"].map((t, i) => (
                <li key={t} style={{ "--i": i } as React.CSSProperties}><b>{i + 1}</b>{t}</li>
              ))}
            </ol>
          )}
        </div>
        <FichaDemo />
      </div>

      <div className="login-edicao">
        <div>Evento<b>SIPE</b></div>
        <div>Edição<b>{edicao.numero}</b></div>
        <div>Ano<b>{edicao.ano}</b></div>
      </div>
    </aside>
  );
}
