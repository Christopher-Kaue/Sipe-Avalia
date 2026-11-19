import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@backend/auth";
import { MAX_AVALIADORES, alunosDo, dataHora, nota, partesArea, projetoPorCodigo } from "@backend/dados";
import { all } from "@backend/db";
import { iniciais } from "@backend/texto";
import { Raios } from "@frontend/componentes/Raios";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { Toast } from "@frontend/componentes/Toast";
import { FormConfirmar } from "@frontend/componentes/FormConfirmar";
import { excluirAvaliacao } from "@backend/acoes/avaliacao";
import { edicaoSelecionada } from "@backend/edicao";

type Av = { id: number; avaliador_id: number; avaliador: string; apresentador: string; total: number; comentario: string | null; atualizado_em: string };

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return { title: `Trabalho ${decodeURIComponent(codigo)}` };
}

export default async function Projeto({ params, searchParams }: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  const u = await exigirUsuario();
  const { codigo } = await params;
  const { salvo } = await searchParams;
  const e = await edicaoSelecionada();
  const p = projetoPorCodigo(decodeURIComponent(codigo), e.id);
  if (!p) notFound();
  const encerrada = !!e.encerrada;

  const alunos = alunosDo(p.id);
  const avs = all<Av>(
    `SELECT a.id, a.avaliador_id, u.nome AS avaliador, a.apresentador, a.total, a.comentario, a.atualizado_em
       FROM avaliacoes a JOIN usuarios u ON u.id = a.avaliador_id
      WHERE a.projeto_id = ? ORDER BY a.atualizado_em`,
    p.id,
  );
  const minha = avs.find((a) => a.avaliador_id === u.id);
  const lotado = !minha && avs.length >= MAX_AVALIADORES;
  const coord = u.perfil === "coordenacao";
  const media = avs.length ? avs.reduce((s, a) => s + a.total, 0) / avs.length : null;
  const area = partesArea(p.area);
  const href = `/projeto/${encodeURIComponent(p.codigo)}/avaliar`;

  return (
    <>
      <Cabecalho
        voltar={{ href: "/avaliar", texto: "Buscar outro código" }}
        rotulo={<>{area.grande ? `${area.grande} · ` : ""}{area.curso}</>}
        titulo={p.titulo}
        acoes={
          <>
            <span className="carimbo carimbo-g"><small>Nº</small>{p.codigo}</span>
            {p.tipo && <span className="selo selo-liso">{p.tipo}</span>}
          </>
        }
      />

      <article className="ficha">
        <div className="folha ficha-principal">
          <section className="secao">
            <span className="rotulo">Autores · {alunos.length}</span>
            <ul className="autores">
              {alunos.map((a) => (
                <li key={a}><span className="ini" aria-hidden="true">{iniciais(a)}</span>{a}</li>
              ))}
            </ul>
          </section>

          {p.resumo && (
            <section className="secao">
              <span className="rotulo">Resumo</span>
              {p.resumo.length > 700 ? (
                <div className="resumo-bloco">
                  <div className="trecho resumo-texto">{p.resumo}</div>
                  <details className="dobra">
                    <summary className="ler-mais" />
                  </details>
                </div>
              ) : (
                <p className="resumo-texto">{p.resumo}</p>
              )}
            </section>
          )}

          {p.referencias && (
            <section className="secao">
              <details className="dobra">
                <summary style={{ marginTop: 0 }}>Referências do trabalho</summary>
                <p className="refs" style={{ marginTop: 14 }}>{p.referencias}</p>
              </details>
            </section>
          )}

          {coord && (
            <section className="secao">
              <span className="rotulo">Avaliações registradas · {avs.length} de {MAX_AVALIADORES}{media != null && ` · média ${nota(media)}`}</span>
              {avs.length === 0 ? (
                <p className="discreto">Nenhum professor avaliou este trabalho ainda.</p>
              ) : (
                <div className="tabela-wrap">
                  <table className="tabela">
                    <thead><tr><th>Avaliador(a)</th><th>Apresentou</th><th>Quando</th><th className="dir">Nota</th><th></th></tr></thead>
                    <tbody>
                      {avs.map((a) => (
                        <tr key={a.id}>
                          <td>{a.avaliador}{a.comentario && <div className="pequeno discreto" style={{ marginTop: 4 }}>“{a.comentario}”</div>}</td>
                          <td>{a.apresentador || <span className="discreto">—</span>}</td>
                          <td className="num">{dataHora(a.atualizado_em)}</td>
                          <td className="dir serif" style={{ fontSize: 20 }}>{nota(a.total)}</td>
                          <td className="dir">
                            {!encerrada && <FormConfirmar action={excluirAvaliacao} mensagem={`Excluir a avaliação de ${a.avaliador}? Isso não pode ser desfeito.`}>
                              <input type="hidden" name="id" value={a.id} />
                              <button className="btn btn-perigo btn-sm" type="submit">Excluir</button>
                            </FormConfirmar>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="lateral">
          <div className="folha cta-avaliar">
            <Raios origem="superior-direito" quantidade={16} />
            <div className="folha-corpo">
              {minha ? (
                <>
                  <span className="rotulo">Sua nota</span>
                  <div className="nota-grande">{nota(minha.total)}<small> /10</small></div>
                  <p>Avaliado em {dataHora(minha.atualizado_em)}{minha.apresentador ? ` · apresentado por ${minha.apresentador}` : ""}.</p>
                  {!encerrada && <Link href={href} className="btn btn-linha btn-bloco" style={{ color: "var(--papel)", borderColor: "rgba(255,255,255,.3)" }}>Revisar avaliação</Link>}
                </>
              ) : lotado ? (
                <>
                  <span className="rotulo">Avaliação completa</span>
                  <p>Este trabalho já foi avaliado por {MAX_AVALIADORES} professores, o máximo por trabalho. Procure outro pôster da sua sala.</p>
                  <Link href="/avaliar" className="btn btn-linha btn-bloco" style={{ color: "var(--papel)", borderColor: "rgba(255,255,255,.3)" }}>Buscar outro código</Link>
                </>
              ) : encerrada ? (
                <>
                  <span className="rotulo">SIPE {e.ano} · encerrado</span>
                  <p>Esta edição foi encerrada pela coordenação; não é mais possível avaliar.</p>
                </>
              ) : (
                <>
                  <span className="rotulo">Rubrica do pôster</span>
                  <p>6 critérios · nota de 0 a 10. Leva menos de um minuto.</p>
                  <Link href={href} className="btn btn-primario btn-lg btn-bloco">Avaliar <span className="seta">→</span></Link>
                </>
              )}
            </div>
          </div>

          <div className="folha">
            <div className="folha-corpo">
              <div className="dado">
                <span className="rotulo">Sala</span>
                {p.sala ? <span className="sala-grande">{p.sala}</span> : <b className="discreto">Ainda não definida</b>}
                {p.sala_local && <span className="pequeno discreto">{p.sala_local}</span>}
              </div>
              <div className="dado">
                <span className="rotulo">Material</span>
                <div className="links" style={{ marginTop: 6 }}>
                  {p.link_poster ? (
                    <a className="link-doc" href={p.link_poster} target="_blank" rel="noopener noreferrer">Ver pôster <span>↗</span></a>
                  ) : (
                    <span className="link-doc indisponivel">Pôster não enviado</span>
                  )}
                  {p.link_resumo ? (
                    <a className="link-doc" href={p.link_resumo} target="_blank" rel="noopener noreferrer">Ver resumo <span>↗</span></a>
                  ) : (
                    <span className="link-doc indisponivel">Resumo não enviado</span>
                  )}
                </div>
              </div>
              {!coord && avs.length > 1 && (
                <div className="dado"><span className="rotulo">Avaliações</span><b>{avs.length} professores já avaliaram</b></div>
              )}
            </div>
          </div>
        </aside>
      </article>
      {salvo && minha && <Toast titulo="Avaliação salva" texto={<>Nota registrada: <b>{nota(minha.total)}</b> de 10.</>} />}
    </>
  );
}
