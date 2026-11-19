import Link from "next/link";
import { exigirCoordenacao } from "@backend/auth";
import { all, get } from "@backend/db";
import { dataHora, nota, partesArea } from "@backend/dados";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { primeiroNome } from "@backend/texto";
import { Anel } from "@frontend/componentes/Anel";
import { Contador } from "@frontend/componentes/Contador";
import { edicaoSelecionada, romano } from "@backend/edicao";

export const metadata = { title: "Painel" };

type Grupo = { nome: string | null; total: number; avaliados: number };

export default async function Painel() {
  const u = await exigirCoordenacao();
  const e = await edicaoSelecionada();
  const n = get<{ trabalhos: number; avaliados: number; avaliacoes: number; semSala: number; professores: number; ativos: number; media: number | null }>(
    `SELECT
       (SELECT COUNT(*) FROM projetos WHERE edicao_id = ?1) AS trabalhos,
       (SELECT COUNT(DISTINCT a.projeto_id) FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id WHERE p.edicao_id = ?1) AS avaliados,
       (SELECT COUNT(*) FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id WHERE p.edicao_id = ?1) AS avaliacoes,
       (SELECT COUNT(*) FROM projetos WHERE edicao_id = ?1 AND sala_id IS NULL) AS semSala,
       (SELECT COUNT(*) FROM usuarios WHERE perfil = 'professor' AND ativo = 1) AS professores,
       (SELECT COUNT(DISTINCT a.avaliador_id) FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id WHERE p.edicao_id = ?1) AS ativos,
       (SELECT AVG(a.total) FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id WHERE p.edicao_id = ?1) AS media`,
    e.id,
  )!;

  const porArea = all<Grupo>(
    `SELECT p.area AS nome, COUNT(*) AS total, SUM(EXISTS (SELECT 1 FROM avaliacoes a WHERE a.projeto_id = p.id)) AS avaliados
       FROM projetos p WHERE p.edicao_id = ? GROUP BY p.area ORDER BY total DESC`,
    e.id,
  );
  const porSala = all<Grupo>(
    `SELECT s.nome, COUNT(p.id) AS total, SUM(EXISTS (SELECT 1 FROM avaliacoes a WHERE a.projeto_id = p.id)) AS avaliados
       FROM salas s LEFT JOIN projetos p ON p.sala_id = s.id WHERE s.edicao_id = ? GROUP BY s.id ORDER BY s.nome COLLATE NOCASE`,
    e.id,
  );
  const ultimas = all<{ codigo: string; titulo: string; avaliador: string; total: number; atualizado_em: string }>(
    `SELECT p.codigo, p.titulo, u.nome AS avaliador, a.total, a.atualizado_em
       FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id JOIN usuarios u ON u.id = a.avaliador_id
      WHERE p.edicao_id = ?
      ORDER BY a.atualizado_em DESC LIMIT 8`,
    e.id,
  );

  const pct = n.trabalhos ? Math.round((n.avaliados / n.trabalhos) * 100) : 0;

  if (n.trabalhos === 0) {
    return (
      <>
        <Cabecalho rotulo={`Olá, ${primeiroNome(u.nome)} · SIPE ${e.ano}`} titulo={<>Vamos <em>começar</em></>} descricao={`Quatro passos para deixar o SIPE ${e.ano} (${romano(e.numero)} Edição) pronto para os professores avaliarem.`} />
        <div className="folha">
          <div className="folha-corpo form-grade" style={{ gap: 0 }}>
            {[
              ["01", "Importe a planilha de trabalhos", "/importar"],
              ["02", "Cadastre as salas do evento", "/salas"],
              ["03", "Atribua a sala de cada trabalho", "/trabalhos"],
              ["04", "Cadastre os professores e entregue as senhas", "/usuarios"],
            ].map(([i, t, h]) => (
              <Link key={i} href={h} className="secao" style={{ display: "flex", gap: 20, alignItems: "baseline", textDecoration: "none", color: "inherit" }}>
                <span className="serif" style={{ fontSize: 34, color: "var(--vermelho)", fontWeight: 300 }}>{i}</span>
                <span className="serif" style={{ fontSize: 22 }}>{t}</span>
                <span style={{ marginLeft: "auto" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Cabecalho
        rotulo={`Olá, ${primeiroNome(u.nome)} · SIPE ${e.ano} · ${romano(e.numero)} Edição`}
        titulo={<>Painel da <em>avaliação</em></>}
        descricao="Acompanhe em tempo real quantos pôsteres já foram avaliados, por área e por sala."
        acoes={
          <>
            <Anel pct={pct} rotulo="avaliados" />
            <div className="faixa-botoes">
              <Link href="/avaliar" className="btn btn-primario">Avaliar um trabalho →</Link>
              <Link href="/resultados" className="btn btn-linha">Ver resultados</Link>
            </div>
          </>
        }
      />

      <section className="numeros">
        <div className="destaque">
          <span className="numeros-ico" aria-hidden="true">✓</span>
          <span className="rotulo">Avaliados</span>
          <strong><Contador valor={n.avaliados} /></strong>
          <small>de {n.trabalhos} trabalhos</small>
        </div>
        <Link href="/trabalhos?status=pendentes">
          <span className="numeros-ico" aria-hidden="true">◷</span>
          <span className="rotulo">Pendentes</span>
          <strong><Contador valor={n.trabalhos - n.avaliados} /></strong>
          <small>ver lista →</small>
        </Link>
        <div>
          <span className="numeros-ico" aria-hidden="true">✎</span>
          <span className="rotulo">Avaliações</span>
          <strong><Contador valor={n.avaliacoes} /></strong>
          <small>{n.ativos} de {n.professores} professores já avaliaram</small>
        </div>
        <div>
          <span className="numeros-ico" aria-hidden="true">★</span>
          <span className="rotulo">Nota média</span>
          <strong>{n.media == null ? "—" : <Contador valor={n.media} casas={1} />}</strong>
          <small>escala de 0 a 10</small>
        </div>
      </section>

      {n.semSala > 0 && (
        <div className="aviso aviso-info" style={{ marginBottom: 32, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <span><b>{n.semSala}</b> trabalho(s) ainda sem sala definida.</span>
          <Link href="/trabalhos?status=sem-sala" className="btn btn-sm">Atribuir salas →</Link>
        </div>
      )}

      <div className="duas-colunas">
        <div className="folha">
          <div className="folha-cab"><h2>Progresso por área</h2></div>
          <div className="folha-corpo barras">
            {porArea.map((a) => {
              const { grande, curso } = partesArea(a.nome);
              return (
                <Link key={a.nome ?? "-"} href={`/trabalhos?area=${encodeURIComponent(a.nome ?? "")}`} className="barra-area" style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="nome">{curso} {grande && <small>· {grande}</small>}</span>
                  <span className="valor">{a.avaliados}/{a.total}</span>
                  <span className="trilho"><b style={{ width: `${(a.avaliados / a.total) * 100}%` }} /></span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="form-grade" style={{ gap: 32 }}>
          <div className="folha">
            <div className="folha-cab"><h2>Por sala</h2><Link href="/salas" className="pequeno">Gerenciar →</Link></div>
            <div className="folha-corpo barras">
              {porSala.length === 0 ? (
                <p className="discreto">Nenhuma sala cadastrada.</p>
              ) : (
                porSala.map((s) => (
                  <div key={s.nome} className="barra-area">
                    <span className="nome">{s.nome}</span>
                    <span className="valor">{s.avaliados ?? 0}/{s.total}</span>
                    <span className="trilho"><b style={{ width: s.total ? `${((s.avaliados ?? 0) / s.total) * 100}%` : 0 }} /></span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="folha">
            <div className="folha-cab"><h2>Últimas avaliações</h2></div>
            {ultimas.length === 0 ? (
              <div className="vazio" style={{ padding: 28 }}>Nenhuma avaliação registrada ainda.</div>
            ) : (
              <ul className="lista-linhas" style={{ borderTop: 0, padding: "0 20px" }}>
                {ultimas.map((a, i) => (
                  <li key={i} style={i === ultimas.length - 1 ? { borderBottom: 0 } : undefined}>
                    <Link href={`/projeto/${encodeURIComponent(a.codigo)}`} style={{ gridTemplateColumns: "1fr auto" }}>
                      <span><span className="t">{a.titulo}</span><span className="s">{a.avaliador} · {dataHora(a.atualizado_em)}</span></span>
                      <span className="n" style={{ fontSize: 22 }}>{nota(a.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
