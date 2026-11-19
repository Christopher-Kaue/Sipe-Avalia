import "server-only";
import * as XLSX from "xlsx";
import { usuarioAtual } from "@backend/auth";
import { criterios } from "@backend/dados";
import { all } from "@backend/db";
import { resultados } from "@backend/resultados";
import { edicaoSelecionada } from "@backend/edicao";
import { filtroSql, lerFiltros } from "@backend/filtros";

const r2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

/** Gera a planilha de resultados (.xlsx). Só a coordenação pode baixar. */
export async function exportarResultados(req: Request): Promise<Response> {
  const u = await usuarioAtual();
  if (!u || u.perfil !== "coordenacao") return new Response("Não autorizado", { status: 401 });

  const url = new URL(req.url);
  const filtro = lerFiltros(url.searchParams);
  if (!filtro.status) filtro.status = "avaliados"; // mesmo padrão da tela Resultados
  const sql = filtroSql(filtro);
  const crit = criterios();
  const edicao = await edicaoSelecionada();

  const classificacao = resultados(edicao.id, filtro).map((l) => ({
    Código: l.codigo,
    Título: l.titulo,
    Área: l.area,
    Tipo: l.tipo,
    Sala: l.sala,
    Autores: l.autores,
    Avaliações: l.avaliacoes,
    ...Object.fromEntries(crit.map((c, i) => [`${c.nome} (${c.peso})`, r2(l.porCriterio[i])])),
    "Nota final": r2(l.media),
  }));

  const detalhadas = all<Record<string, string | number | null> & { id: number }>(
    `SELECT a.id, p.codigo AS "Código", p.titulo AS "Título", p.area AS "Área", s.nome AS "Sala",
            u.nome AS "Avaliador(a)", NULLIF(a.apresentador, '') AS "Apresentador(a)", a.total AS "Nota", a.comentario AS "Comentário",
            a.atualizado_em AS "Data (UTC)"
       FROM avaliacoes a
       JOIN projetos p ON p.id = a.projeto_id
       JOIN usuarios u ON u.id = a.avaliador_id
       LEFT JOIN salas s ON s.id = p.sala_id
      WHERE ${["p.edicao_id = ?", ...sql.onde].join(" AND ")}
      ORDER BY p.codigo, u.nome`,
    edicao.id,
    ...sql.args,
  );
  const itens = all<{ avaliacao_id: number; criterio_id: number; nivel: number }>(
    `SELECT i.avaliacao_id, i.criterio_id, i.nivel FROM avaliacao_itens i
       JOIN avaliacoes a ON a.id = i.avaliacao_id JOIN projetos p ON p.id = a.projeto_id WHERE p.edicao_id = ?`,
    edicao.id,
  );
  const porAv = new Map<number, Map<number, number>>();
  for (const i of itens) {
    if (!porAv.has(i.avaliacao_id)) porAv.set(i.avaliacao_id, new Map());
    porAv.get(i.avaliacao_id)!.set(i.criterio_id, i.nivel);
  }
  const avaliacoes = detalhadas.map(({ id, ...a }) => {
    const m = porAv.get(id);
    const { Nota, Comentário, ["Data (UTC)"]: data, ...resto } = a;
    return {
      ...resto,
      ...Object.fromEntries(crit.map((c) => [`${c.nome} (${c.peso})`, m?.has(c.id) ? (c.peso * m.get(c.id)!) / 2 : null])),
      Nota,
      Comentário,
      "Data (UTC)": data,
    };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classificacao), "Classificação");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(avaliacoes.length ? avaliacoes : [{ Aviso: "Nenhuma avaliação registrada" }]), "Avaliações");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const hoje = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sipe-${edicao.ano}-resultados-${hoje}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
