import Link from "next/link";
import { exigirCoordenacao } from "@backend/auth";
import { areas, criterios, nota, salas } from "@backend/dados";
import { resultados } from "@backend/resultados";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { edicaoSelecionada } from "@backend/edicao";
import { lerFiltros, qsFiltros, SITUACOES } from "@backend/filtros";
import { Filtros } from "@frontend/componentes/Filtros";

export const metadata = { title: "Resultados" };

export default async function Resultados({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  const f = lerFiltros(await searchParams);
  // sem situação escolhida, a classificação mostra só os avaliados
  const filtro = { ...f, status: f.status ?? "avaliados" };
  const linhas = resultados(e.id, filtro);
  const avaliados = linhas.filter((l) => l.avaliacoes > 0);
  const visiveis = linhas;
  const crit = criterios();
  const qs = qsFiltros(f);

  // posição com empate: mesma média = mesma posição
  let pos = 0;
  let anterior: number | null = null;
  const posicoes = avaliados.map((l, i) => {
    if (l.media !== anterior) pos = i + 1;
    anterior = l.media;
    return pos;
  });

  return (
    <>
      <Cabecalho
        rotulo={`Coordenação · SIPE ${e.ano}`}
        titulo={<><em>Resultados</em> e classificação</>}
        descricao="Nota final = média das avaliações de cada professor. Filtre por área para ver a classificação de cada categoria."
        acoes={<a className="btn btn-primario" href={`/resultados/exportar${qs}`}>Exportar para Excel ↓</a>}
      />

      <Filtros valores={f} areas={areas(e.id)} salas={salas(e.id)} situacoes={SITUACOES} limpar="/resultados" statusPadrao="avaliados" />

      <div className="folha">
        <div className="folha-cab">
          <h2>Classificação</h2>
          <span className="discreto pequeno">{avaliados.length} de {linhas.length} trabalho(s) avaliado(s)</span>
        </div>
        {visiveis.length === 0 ? (
          <div className="vazio"><strong>Nenhum trabalho encontrado</strong>Ajuste os filtros. A classificação aparece assim que os professores começarem a avaliar.</div>
        ) : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Trabalho</th>
                  <th>Sala</th>
                  {crit.map((c) => <th key={c.id} className="dir" title={c.nome}>{c.nome.split(/[ /]/)[0].slice(0, 5)}.</th>)}
                  <th className="dir">Aval.</th>
                  <th className="dir">Média</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l, i) => {
                  const p = l.avaliacoes ? posicoes[i] : null;
                  return (
                    <tr key={l.id}>
                      <td>{p ? <span className={`medalha${p <= 3 ? ` m${p}` : ""}`}>{p}</span> : <span className="discreto">—</span>}</td>
                      <td className="titulo-celula">
                        <span className="codigo-tag">{l.codigo}</span>{" "}
                        <Link href={`/projeto/${encodeURIComponent(l.codigo)}`}>{l.titulo}</Link>
                        <div className="pequeno discreto" style={{ marginTop: 3, fontWeight: 400 }}>{l.area}</div>
                      </td>
                      <td>{l.sala ?? <span className="discreto">—</span>}</td>
                      {l.porCriterio.map((v, j) => <td key={j} className="dir num pequeno">{nota(v)}</td>)}
                      <td className="dir num">{l.avaliacoes || "—"}</td>
                      <td className="dir"><span className="serif" style={{ fontSize: 22, color: p && p <= 3 ? "var(--vermelho-escuro)" : undefined }}>{nota(l.media)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
