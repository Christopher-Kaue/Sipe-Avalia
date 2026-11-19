import { exigirCoordenacao } from "@backend/auth";
import { all } from "@backend/db";
import { nota } from "@backend/dados";
import { edicaoSelecionada, romano } from "@backend/edicao";
import { alternarEncerrada, excluirEdicao, trocarEdicao } from "@backend/acoes/edicoes";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { FormConfirmar } from "@frontend/componentes/FormConfirmar";
import { FormNovaEdicao } from "@frontend/telas/edicoes/FormEdicao";

export const metadata = { title: "Edições" };

type Linha = { id: number; ano: number; numero: number; encerrada: number; trabalhos: number; avaliados: number; avaliacoes: number; salas: number; media: number | null };

export default async function Edicoes() {
  await exigirCoordenacao();
  const atual = await edicaoSelecionada();
  const lista = all<Linha>(
    `SELECT e.id, e.ano, e.numero, e.encerrada,
            (SELECT COUNT(*) FROM projetos p WHERE p.edicao_id = e.id) AS trabalhos,
            (SELECT COUNT(DISTINCT a.projeto_id) FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id WHERE p.edicao_id = e.id) AS avaliados,
            (SELECT COUNT(*) FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id WHERE p.edicao_id = e.id) AS avaliacoes,
            (SELECT COUNT(*) FROM salas s WHERE s.edicao_id = e.id) AS salas,
            (SELECT AVG(a.total) FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id WHERE p.edicao_id = e.id) AS media
       FROM edicoes e ORDER BY e.ano DESC`,
  );
  const recente = lista[0];

  return (
    <>
      <Cabecalho
        rotulo="Coordenação"
        titulo={<>Edições do <em>SIPE</em></>}
        descricao="Cada ano tem os próprios trabalhos, salas e avaliações. Os professores sempre avaliam na edição mais recente; os anos anteriores ficam guardados para consulta."
      />

      <div className="duas-colunas">
        <div className="folha">
          <div className="folha-cab"><h2>Linha do tempo</h2><span className="discreto pequeno">{lista.length} edição(ões)</span></div>
          <ol className="linha-tempo">
            {lista.map((e, i) => (
              <li key={e.id} className={e.id === atual.id ? "atual" : undefined}>
                <div className="lt-ano">
                  <b>{e.ano}</b>
                  <span>{romano(e.numero)} Edição</span>
                </div>
                <div className="lt-corpo">
                  <div className="lt-selos">
                    {i === 0 && <span className="selo selo-ok">mais recente</span>}
                    {e.encerrada ? <span className="selo selo-liso">encerrada</span> : <span className="selo selo-vermelho">aberta</span>}
                    {e.id === atual.id && <span className="selo selo-alerta">você está vendo</span>}
                  </div>
                  <p className="lt-numeros">
                    <span><b>{e.trabalhos}</b> trabalhos</span>
                    <span><b>{e.avaliados}</b> avaliados</span>
                    <span><b>{e.avaliacoes}</b> avaliações</span>
                    <span><b>{e.salas}</b> salas</span>
                    <span>média <b>{nota(e.media)}</b></span>
                  </p>
                  <div className="linha-acoes" style={{ justifyContent: "flex-start" }}>
                    {e.id !== atual.id && (
                      <form action={trocarEdicao}>
                        <input type="hidden" name="ano" value={e.ano} />
                        <input type="hidden" name="caminho" value="/painel" />
                        <button className="btn btn-sm" type="submit">Abrir {e.ano} →</button>
                      </form>
                    )}
                    <FormConfirmar
                      action={alternarEncerrada}
                      mensagem={e.encerrada
                        ? `Reabrir ${e.ano}? Avaliações e importações voltam a ser permitidas nesta edição.`
                        : `Encerrar ${e.ano}? As notas ficam congeladas: ninguém poderá avaliar, revisar ou importar nesta edição (dá para reabrir depois).`}
                    >
                      <input type="hidden" name="id" value={e.id} />
                      <button className="btn btn-linha btn-sm" type="submit">{e.encerrada ? "Reabrir" : "Encerrar"}</button>
                    </FormConfirmar>
                    {e.trabalhos === 0 && lista.length > 1 && (
                      <FormConfirmar action={excluirEdicao} mensagem={`Excluir a edição ${e.ano}? Ela não tem trabalhos; as salas cadastradas nela também saem.`}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="btn btn-perigo btn-sm" type="submit">Excluir</button>
                      </FormConfirmar>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="folha">
          <div className="folha-cab"><h2>Nova edição</h2></div>
          <div className="folha-corpo">
            <p className="pequeno discreto" style={{ marginTop: 0 }}>
              Crie a edição do próximo ano antes de importar a nova planilha. Os professores continuam com o mesmo login e senha.
            </p>
            <FormNovaEdicao
              ano={recente.ano + 1}
              numero={recente.numero + 1}
              anterior={{ ano: recente.ano, salas: recente.salas }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
