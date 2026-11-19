import { exigirCoordenacao } from "@backend/auth";
import { get } from "@backend/db";
import { dataHora } from "@backend/dados";
import { FormImportar } from "@frontend/telas/importar/FormImportar";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { edicaoSelecionada, romano } from "@backend/edicao";
import Link from "next/link";

export const metadata = { title: "Importar planilha" };

export default async function Importar() {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  const info = get<{ n: number; ultima: string | null }>("SELECT COUNT(*) AS n, MAX(importado_em) AS ultima FROM projetos WHERE edicao_id = ?", e.id)!;
  return (
    <>
      <Cabecalho
        rotulo={`Coordenação · SIPE ${e.ano} · ${romano(e.numero)} Edição`}
        titulo={<>Importar <em>trabalhos</em></>}
        descricao={`Os trabalhos entram na edição ${e.ano}; as outras edições não são alteradas. ` + "Envie a planilha exportada do sistema de inscrições. Trabalhos novos são criados; os que já existem têm os dados atualizados, mantendo sala e avaliações. Itens da aba “Excluidos” saem do sistema, se ainda não tiverem sido avaliados."}
      />
      <div className="duas-colunas">
        <div className="folha"><div className="folha-corpo">
          {e.encerrada ? (
            <div className="aviso aviso-info">A edição {e.ano} está encerrada. Para importar, reabra-a em <Link href="/edicoes">Edições</Link> ou crie a edição do novo ano.</div>
          ) : <FormImportar />}
        </div></div>
        <div className="folha">
          <div className="folha-cab"><h2>Situação atual</h2></div>
          <div className="folha-corpo">
            <div className="dado"><span className="rotulo">Trabalhos em {e.ano}</span><span className="sala-grande">{info.n}</span></div>
            <div className="dado"><span className="rotulo">Última importação</span><b>{info.ultima ? dataHora(info.ultima) : "Nenhuma ainda"}</b></div>
            <div className="dado">
              <span className="rotulo">Colunas usadas</span>
              <p className="pequeno discreto" style={{ marginTop: 4 }}>
                <span className="mono">id</span> (código), <span className="mono">titulo</span>, <span className="mono">Autores</span>,{" "}
                <span className="mono">Área</span>, <span className="mono">resumo</span>, <span className="mono">referencias</span>,{" "}
                <span className="mono">Resumo Simples/Expandido</span>, <span className="mono">Link Resumo</span>,{" "}
                <span className="mono">Link Apresentação</span>, <span className="mono">e-mail</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
