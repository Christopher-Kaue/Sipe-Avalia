import "server-only";
import { all, get } from "./db";

export type Criterio = { id: number; nome: string; peso: number; ordem: number; desc_0: string; desc_1: string; desc_2: string };

export type Projeto = {
  id: number;
  edicao_id: number;
  codigo: string;
  titulo: string;
  area: string | null;
  tipo: string | null;
  resumo: string | null;
  referencias: string | null;
  link_resumo: string | null;
  link_poster: string | null;
  sala_id: number | null;
  sala: string | null;
  sala_local: string | null;
};

export type Sala = { id: number; nome: string; local: string | null };

export function criterios(): Criterio[] {
  return all<Criterio>("SELECT * FROM criterios ORDER BY ordem");
}

/** Cada trabalho recebe no máximo 2 avaliações; a nota final é a média delas. */
export const MAX_AVALIADORES = 2;

export function pontos(peso: number, nivel: number): number {
  return (peso * nivel) / 2;
}

/** Aceita "1128", " 1128 ", "#1128", "nº 1128". */
export function normalizarCodigo(c: string): string {
  return c.replace(/[^0-9a-zA-Z-]/g, "").replace(/^n[oº]?/i, "").trim();
}

export function projetoPorCodigo(codigo: string, edicaoId: number): Projeto | undefined {
  return get<Projeto>(
    `SELECT p.*, s.nome AS sala, s.local AS sala_local
       FROM projetos p LEFT JOIN salas s ON s.id = p.sala_id
      WHERE p.edicao_id = ? AND p.codigo = ?`,
    edicaoId,
    normalizarCodigo(codigo),
  );
}

export function alunosDo(projetoId: number): string[] {
  return all<{ nome: string }>("SELECT nome FROM alunos WHERE projeto_id = ? ORDER BY ordem", projetoId).map((a) => a.nome);
}

export function salas(edicaoId: number): Array<Sala & { trabalhos: number }> {
  return all(
    `SELECT s.id, s.nome, s.local, COUNT(p.id) AS trabalhos
       FROM salas s LEFT JOIN projetos p ON p.sala_id = s.id
      WHERE s.edicao_id = ?
      GROUP BY s.id ORDER BY s.nome COLLATE NOCASE`,
    edicaoId,
  );
}

export function areas(edicaoId: number): string[] {
  return all<{ area: string }>("SELECT DISTINCT area FROM projetos WHERE edicao_id = ? AND area IS NOT NULL ORDER BY area", edicaoId).map((a) => a.area);
}

/* ---------- formatação ---------- */

export const nota = (n: number | null | undefined, casas = 2) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const peso = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function dataHora(sqlite: string): string {
  const d = new Date(sqlite.replace(" ", "T") + "Z");
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

/** Área "Ciências da Saúde: Biomedicina" → { grande: "Ciências da Saúde", curso: "Biomedicina" } */
export function partesArea(area: string | null) {
  if (!area) return { grande: "", curso: "Sem área" };
  const i = area.indexOf(":");
  return i < 0 ? { grande: "", curso: area } : { grande: area.slice(0, i).trim(), curso: area.slice(i + 1).trim() };
}
