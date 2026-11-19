import "server-only";
import { all } from "./db";
import { criterios, pontos } from "./dados";
import { filtroSql, type Filtros } from "./filtros";

export type LinhaResultado = {
  id: number;
  codigo: string;
  titulo: string;
  area: string | null;
  tipo: string | null;
  sala: string | null;
  autores: string;
  avaliacoes: number;
  media: number | null;
  /** média de pontos por critério, na ordem de criterios() */
  porCriterio: Array<number | null>;
};

export function resultados(edicaoId: number, filtro: Filtros = {}): LinhaResultado[] {
  const f = filtroSql(filtro);
  const onde = ["p.edicao_id = ?", ...f.onde];
  const args = [edicaoId, ...f.args];

  const projetos = all<Omit<LinhaResultado, "porCriterio">>(
    `SELECT p.id, p.codigo, p.titulo, p.area, p.tipo, s.nome AS sala,
            COALESCE((SELECT group_concat(nome, ', ') FROM (SELECT nome FROM alunos al WHERE al.projeto_id = p.id ORDER BY ordem)), '') AS autores,
            COUNT(a.id) AS avaliacoes, AVG(a.total) AS media
       FROM projetos p
       LEFT JOIN salas s ON s.id = p.sala_id
       LEFT JOIN avaliacoes a ON a.projeto_id = p.id
      WHERE ${onde.join(" AND ")}
      GROUP BY p.id`,
    ...args,
  );

  const crit = criterios();
  const itens = all<{ projeto_id: number; criterio_id: number; nivel_medio: number }>(
    `SELECT a.projeto_id, i.criterio_id, AVG(i.nivel) AS nivel_medio
       FROM avaliacao_itens i JOIN avaliacoes a ON a.id = i.avaliacao_id JOIN projetos p ON p.id = a.projeto_id
      WHERE p.edicao_id = ?
      GROUP BY a.projeto_id, i.criterio_id`,
    edicaoId,
  );
  const mapa = new Map(itens.map((i) => [`${i.projeto_id}:${i.criterio_id}`, i.nivel_medio]));

  return projetos
    .map((p) => ({
      ...p,
      porCriterio: crit.map((c) => {
        const n = mapa.get(`${p.id}:${c.id}`);
        return n == null ? null : pontos(c.peso, n);
      }),
    }))
    .sort((a, b) => (b.media ?? -1) - (a.media ?? -1) || b.avaliacoes - a.avaliacoes || a.titulo.localeCompare(b.titulo, "pt-BR"));
}
