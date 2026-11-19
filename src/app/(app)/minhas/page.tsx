import Link from "next/link";
import { exigirUsuario } from "@backend/auth";
import { all } from "@backend/db";
import { areas, dataHora, nota, salas } from "@backend/dados";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { edicaoSelecionada, romano } from "@backend/edicao";
import { filtroSql, lerFiltros, SITUACOES_AVALIADOS } from "@backend/filtros";
import { Filtros } from "@frontend/componentes/Filtros";

export const metadata = { title: "Minhas avaliações" };

export default async function Minhas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await exigirUsuario();
  const e = await edicaoSelecionada();
  const f = lerFiltros(await searchParams);
  const filtro = filtroSql(f);
  const lista = all<{ codigo: string; titulo: string; area: string | null; sala: string | null; apresentador: string; total: number; atualizado_em: string }>(
    `SELECT p.codigo, p.titulo, p.area, s.nome AS sala, a.apresentador, a.total, a.atualizado_em
       FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id LEFT JOIN salas s ON s.id = p.sala_id
      WHERE ${["a.avaliador_id = ?", "p.edicao_id = ?", ...filtro.onde].join(" AND ")} ORDER BY a.atualizado_em DESC`,
    u.id,
    e.id,
    ...filtro.args,
  );
  const filtrando = Boolean(f.q || f.area || f.sala || f.status);
  return (
    <>
      <Cabecalho
        rotulo={`${u.nome} · SIPE ${e.ano} · ${romano(e.numero)} Edição`}
        titulo={<>Minhas <em>avaliações</em></>}
        descricao={e.encerrada ? "Esta edição foi encerrada pela coordenação; as notas ficam registradas, mas não podem mais ser alteradas." : "Abra um trabalho para revisar a nota. Você pode alterar sua avaliação enquanto o evento estiver em andamento."}
        acoes={<Link href="/avaliar" className="btn btn-primario">Avaliar outro trabalho →</Link>}
      />
      <Filtros valores={f} areas={areas(e.id)} salas={salas(e.id)} situacoes={SITUACOES_AVALIADOS} limpar="/minhas" />

      <div className="folha">
        {lista.length === 0 ? (
          filtrando
            ? <div className="vazio"><strong>Nenhuma avaliação encontrada</strong>Ajuste os filtros.</div>
            : <div className="vazio"><strong>Nenhuma avaliação ainda</strong><Link href="/avaliar">Buscar um trabalho pelo código →</Link></div>
        ) : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Código</th><th>Trabalho</th><th>Sala</th><th>Apresentou</th><th>Quando</th><th className="dir">Nota</th></tr></thead>
              <tbody>
                {lista.map((a) => (
                  <tr key={a.codigo}>
                    <td><span className="codigo-tag">{a.codigo}</span></td>
                    <td className="titulo-celula">
                      <Link href={`/projeto/${encodeURIComponent(a.codigo)}`}>{a.titulo}</Link>
                      <div className="pequeno discreto" style={{ marginTop: 3, fontWeight: 400 }}>{a.area}</div>
                    </td>
                    <td>{a.sala ?? "—"}</td>
                    <td>{a.apresentador || <span className="discreto">—</span>}</td>
                    <td className="num pequeno">{dataHora(a.atualizado_em)}</td>
                    <td className="dir serif" style={{ fontSize: 22 }}>{nota(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
