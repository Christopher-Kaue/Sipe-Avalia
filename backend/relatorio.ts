import "server-only";
import { all } from "./db";
import { filtroSql, type Filtros } from "./filtros";

export type LinhaRelatorio = {
  id: number;
  codigo: string;
  titulo: string;
  area: string;
  alunos: string[];
  avaliadores: Array<{ nome: string; nota: number }>;
  /** média das notas dos avaliadores */
  nota: number;
};

/** Trabalhos que já têm pelo menos uma avaliação, agrupados por área e ordenados pela nota. */
export function relatorio(edicaoId: number, filtro: Filtros = {}): LinhaRelatorio[] {
  const f = filtroSql(filtro);
  const projetos = all<{ id: number; codigo: string; titulo: string; area: string | null; nota: number }>(
    `SELECT p.id, p.codigo, p.titulo, p.area, AVG(a.total) AS nota
       FROM projetos p JOIN avaliacoes a ON a.projeto_id = p.id
      WHERE ${["p.edicao_id = ?", ...f.onde].join(" AND ")}
      GROUP BY p.id`,
    edicaoId,
    ...f.args,
  );
  if (projetos.length === 0) return [];

  const ids = projetos.map((p) => p.id);
  const marcas = ids.map(() => "?").join(",");
  const alunos = all<{ projeto_id: number; nome: string }>(
    `SELECT projeto_id, nome FROM alunos WHERE projeto_id IN (${marcas}) ORDER BY projeto_id, ordem`,
    ...ids,
  );
  const avals = all<{ projeto_id: number; nome: string; nota: number }>(
    `SELECT a.projeto_id, u.nome, a.total AS nota
       FROM avaliacoes a JOIN usuarios u ON u.id = a.avaliador_id
      WHERE a.projeto_id IN (${marcas}) ORDER BY a.criado_em, a.id`,
    ...ids,
  );

  const agrupar = <T extends { projeto_id: number }>(xs: T[]) => {
    const m = new Map<number, T[]>();
    for (const x of xs) (m.get(x.projeto_id) ?? m.set(x.projeto_id, []).get(x.projeto_id)!).push(x);
    return m;
  };
  const alunosPor = agrupar(alunos);
  const avalsPor = agrupar(avals);

  return projetos
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      titulo: p.titulo,
      area: p.area ?? "Sem área",
      nota: p.nota,
      alunos: (alunosPor.get(p.id) ?? []).map((a) => a.nome),
      avaliadores: (avalsPor.get(p.id) ?? []).map(({ nome, nota }) => ({ nome, nota })),
    }))
    .sort(
      (a, b) =>
        a.area.localeCompare(b.area, "pt-BR") ||
        b.nota - a.nota ||
        a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }),
    );
}
