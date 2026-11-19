import Link from "next/link";
import { exigirCoordenacao } from "@backend/auth";
import { areas, nota, salas } from "@backend/dados";
import { relatorio } from "@backend/relatorio";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { edicaoSelecionada, romano } from "@backend/edicao";
import { lerFiltros, qsFiltros, SITUACOES_AVALIADOS } from "@backend/filtros";
import { Filtros } from "@frontend/componentes/Filtros";

export const metadata = { title: "Relatório" };

export default async function Relatorio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  const f = lerFiltros(await searchParams);
  const area = f.area;
  const filtrando = Boolean(f.q || f.area || f.sala || f.status);
  const linhas = relatorio(e.id, f);
  const href = `/relatorio/planilha${qsFiltros(f)}`;

  return (
    <>
      <Cabecalho
        rotulo={`Coordenação · SIPE ${e.ano} · ${romano(e.numero)} Edição`}
        titulo={<>Relatório dos <em>avaliados</em></>}
        descricao="Filtre os trabalhos e baixe a planilha do Excel com código, título, avaliador, alunos e nota de cada trabalho avaliado."
        acoes={<a className="btn btn-primario" href={href} download>Baixar planilha ↓</a>}
      />

      <Filtros valores={f} areas={areas(e.id)} salas={salas(e.id)} situacoes={SITUACOES_AVALIADOS} limpar="/relatorio" />

      <div className="folha">
        <div className="folha-cab">
          <h2>Prévia da planilha</h2>
          <span className="discreto pequeno">{linhas.length} trabalho(s) avaliado(s){area ? ` em ${area}` : ""}</span>
        </div>
        {linhas.length === 0 ? (
          <div className="vazio"><strong>Nenhum trabalho avaliado</strong>{filtrando ? "Nenhum trabalho avaliado com esses filtros." : "O relatório aparece assim que os professores começarem a avaliar."}</div>
        ) : (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Alunos</th>
                  <th>Avaliador 1</th>
                  <th className="dir">Nota 1</th>
                  <th>Avaliador 2</th>
                  <th className="dir">Nota 2</th>
                  <th className="dir">Média final</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const [a1, a2] = l.avaliadores;
                  return (
                    <tr key={l.id}>
                      <td><span className="codigo-tag">{l.codigo}</span></td>
                      <td className="titulo-celula">
                        <Link href={`/projeto/${encodeURIComponent(l.codigo)}`}>{l.titulo}</Link>
                        {!area && <div className="pequeno discreto" style={{ marginTop: 3, fontWeight: 400 }}>{l.area}</div>}
                      </td>
                      <td className="pequeno">{l.alunos.length ? l.alunos.map((n) => <div key={n}>{n}</div>) : <span className="discreto">—</span>}</td>
                      <td className="pequeno">{a1?.nome}</td>
                      <td className="dir num">{nota(a1?.nota)}</td>
                      <td className="pequeno">{a2 ? a2.nome : <span className="selo selo-alerta">aguardando</span>}</td>
                      <td className="dir num">{a2 ? nota(a2.nota) : <span className="discreto">—</span>}</td>
                      <td className="dir"><span className="serif" style={{ fontSize: 20, color: "var(--vermelho-escuro)" }}>{nota(l.nota)}</span></td>
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
