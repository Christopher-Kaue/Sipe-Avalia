"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { atribuirSala } from "@backend/acoes/coordenacao";
import { Enviar } from "@frontend/componentes/Botao";

export type LinhaTrabalho = {
  id: number;
  codigo: string;
  titulo: string;
  area: string | null;
  tem_poster: number;
  sala: string | null;
  avaliacoes: number;
  autores: string | null;
};

export function TabelaTrabalhos({ linhas, salas }: { linhas: LinhaTrabalho[]; salas: Array<{ id: number; nome: string }> }) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  // ao trocar o filtro, mantém só o que continua visível
  useEffect(() => {
    setSel((s) => new Set([...s].filter((id) => linhas.some((l) => l.id === id))));
  }, [linhas]);

  const todos = linhas.length > 0 && sel.size === linhas.length;
  const alternar = (id: number) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (linhas.length === 0) {
    return <div className="folha"><div className="vazio"><strong>Nenhum trabalho encontrado</strong>Ajuste os filtros ou importe a planilha.</div></div>;
  }

  return (
    <>
      <div className="folha">
        <div className="folha-cab">
          <h2>{linhas.length} trabalho{linhas.length > 1 ? "s" : ""}</h2>
          <span className="discreto pequeno">{sel.size ? `${sel.size} selecionado(s)` : "Nenhum selecionado"}</span>
        </div>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    className="marcar"
                    aria-label="Selecionar todos"
                    checked={todos}
                    onChange={() => setSel(todos ? new Set() : new Set(linhas.map((l) => l.id)))}
                  />
                </th>
                <th>Código</th>
                <th>Trabalho</th>
                <th>Sala</th>
                <th>Pôster</th>
                <th className="dir">Avaliações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className={sel.has(l.id) ? "selecionada" : undefined} onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a,input")) return;
                  alternar(l.id);
                }} style={{ cursor: "pointer" }}>
                  <td><input type="checkbox" className="marcar" aria-label={`Selecionar ${l.codigo}`} checked={sel.has(l.id)} onChange={() => alternar(l.id)} /></td>
                  <td><span className="codigo-tag">{l.codigo}</span></td>
                  <td className="titulo-celula">
                    <Link href={`/projeto/${encodeURIComponent(l.codigo)}`}>{l.titulo}</Link>
                    <div className="pequeno discreto" style={{ marginTop: 3, fontWeight: 400 }}>{l.area} · {l.autores}</div>
                  </td>
                  <td>{l.sala ? <span style={{ fontWeight: 600 }}>{l.sala}</span> : <span className="selo selo-alerta">Sem sala</span>}</td>
                  <td>{l.tem_poster ? <span className="selo selo-ok">Enviado</span> : <span className="selo">Não enviado</span>}</td>
                  <td className="dir num">{l.avaliacoes ? <b>{l.avaliacoes}</b> : <span className="discreto">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sel.size > 0 && (
        <form className="barra-acoes" action={async (fd) => { await atribuirSala(fd); setSel(new Set()); }}>
          {[...sel].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <span className="qtd">{sel.size} trabalho(s) selecionado(s)</span>
          {salas.length === 0 ? (
            <Link href="/salas" className="btn btn-primario">Cadastre uma sala primeiro →</Link>
          ) : (
            <>
              <select className="entrada" name="sala_id" defaultValue={salas[0].id} aria-label="Sala">
                {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                <option value="">— Remover sala —</option>
              </select>
              <Enviar pendente="Atribuindo…">Atribuir sala</Enviar>
            </>
          )}
          <button type="button" className="btn btn-sm" style={{ background: "transparent", color: "var(--papel)" }} onClick={() => setSel(new Set())}>Cancelar</button>
        </form>
      )}
    </>
  );
}
