import { exigirCoordenacao } from "@backend/auth";
import { areas, salas } from "@backend/dados";
import { all } from "@backend/db";
import { TabelaTrabalhos, type LinhaTrabalho } from "@frontend/telas/trabalhos/TabelaTrabalhos";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { edicaoSelecionada } from "@backend/edicao";
import { filtroSql, lerFiltros, SITUACOES } from "@backend/filtros";
import { Filtros } from "@frontend/componentes/Filtros";

export const metadata = { title: "Trabalhos" };

export default async function Trabalhos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  const f = lerFiltros(await searchParams);
  const filtro = filtroSql(f);
  const onde = ["p.edicao_id = ?", ...filtro.onde];
  const args = [e.id, ...filtro.args];

  const linhas = all<LinhaTrabalho>(
    `SELECT p.id, p.codigo, p.titulo, p.area, p.link_poster IS NOT NULL AS tem_poster, s.nome AS sala,
            (SELECT COUNT(*) FROM avaliacoes a WHERE a.projeto_id = p.id) AS avaliacoes,
            (SELECT group_concat(nome, ', ') FROM (SELECT nome FROM alunos al WHERE al.projeto_id = p.id ORDER BY ordem)) AS autores
       FROM projetos p LEFT JOIN salas s ON s.id = p.sala_id
      WHERE ${onde.join(" AND ")}
      ORDER BY p.area, p.titulo COLLATE NOCASE`,
    ...args,
  );
  const listaSalas = salas(e.id);

  return (
    <>
      <Cabecalho
        rotulo={`Coordenação · SIPE ${e.ano}`}
        titulo={<>Trabalhos <em>inscritos</em></>}
        descricao="Marque os trabalhos e escolha a sala na barra que aparece embaixo. Dica: filtre por área para distribuir por sala mais rápido."
      />

      <Filtros valores={f} areas={areas(e.id)} salas={listaSalas} situacoes={SITUACOES} limpar="/trabalhos" />

      <TabelaTrabalhos linhas={linhas} salas={listaSalas.map(({ id, nome }) => ({ id, nome }))} />
    </>
  );
}
