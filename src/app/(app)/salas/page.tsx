import Link from "next/link";
import { exigirCoordenacao } from "@backend/auth";
import { salas } from "@backend/dados";
import { get } from "@backend/db";
import { FormSala, BotaoExcluirSala } from "@frontend/telas/salas/FormSala";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { edicaoSelecionada } from "@backend/edicao";

export const metadata = { title: "Salas" };

export default async function Salas() {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  const lista = salas(e.id);
  const semSala = get<{ n: number }>("SELECT COUNT(*) AS n FROM projetos WHERE edicao_id = ? AND sala_id IS NULL", e.id)!.n;

  return (
    <>
      <Cabecalho
        rotulo={`Coordenação · SIPE ${e.ano}`}
        titulo={<>Salas do <em>evento</em></>}
        descricao={<>Cadastre as salas do evento. Depois, em <Link href="/trabalhos">Trabalhos</Link>, selecione os pôsteres e atribua a sala de cada um.</>}
        acoes={semSala > 0 && <Link href="/trabalhos?status=sem-sala" className="btn btn-primario">{semSala} trabalho(s) sem sala →</Link>}
      />

      <div className="duas-colunas">
        <div className="folha">
          <div className="folha-cab"><h2>Salas cadastradas</h2><span className="discreto pequeno">{lista.length}</span></div>
          {lista.length === 0 ? (
            <div className="vazio"><strong>Nenhuma sala ainda</strong>Crie a primeira ao lado.</div>
          ) : (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Sala</th><th className="dir">Trabalhos</th><th></th></tr></thead>
                <tbody>
                  {lista.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <details className="dobra">
                          <summary style={{ marginTop: 0, color: "var(--texto)", fontSize: 15 }}>
                            <span className="serif" style={{ fontSize: 18 }}>{s.nome}</span>
                            {s.local && <span className="discreto pequeno" style={{ fontWeight: 400 }}> · {s.local}</span>}
                          </summary>
                          <div style={{ marginTop: 14 }}><FormSala sala={s} /></div>
                        </details>
                      </td>
                      <td className="dir num">
                        <Link href={`/trabalhos?sala=${s.id}`}>{s.trabalhos}</Link>
                      </td>
                      <td className="dir"><BotaoExcluirSala id={s.id} nome={s.nome} trabalhos={s.trabalhos} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="folha">
          <div className="folha-cab"><h2>Nova sala</h2></div>
          <div className="folha-corpo"><FormSala /></div>
        </div>
      </div>
    </>
  );
}
