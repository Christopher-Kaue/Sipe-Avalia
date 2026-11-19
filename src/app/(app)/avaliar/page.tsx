import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@backend/auth";
import { normalizarCodigo, nota, projetoPorCodigo, dataHora } from "@backend/dados";
import { all, get } from "@backend/db";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { primeiroNome } from "@backend/texto";
import { edicaoSelecionada } from "@backend/edicao";

export const metadata = { title: "Avaliar" };

type Recente = { codigo: string; titulo: string; total: number; atualizado_em: string; sala: string | null };

export default async function Avaliar({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const u = await exigirUsuario();
  const e = await edicaoSelecionada();
  const { codigo } = await searchParams;

  let erro: string | null = null;
  if (codigo !== undefined) {
    const c = normalizarCodigo(codigo);
    if (!c) erro = "Digite o código do trabalho.";
    else {
      const p = projetoPorCodigo(c, e.id);
      if (p) redirect(`/projeto/${encodeURIComponent(p.codigo)}`);
      erro = `Nenhum trabalho com o código ${c} no SIPE ${e.ano}. Confira o número no pôster.`;
    }
  }

  const recentes = all<Recente>(
    `SELECT p.codigo, p.titulo, a.total, a.atualizado_em, s.nome AS sala
       FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id LEFT JOIN salas s ON s.id = p.sala_id
      WHERE a.avaliador_id = ? AND p.edicao_id = ? ORDER BY a.atualizado_em DESC LIMIT 5`,
    u.id,
    e.id,
  );
  const { n } = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM avaliacoes a JOIN projetos p ON p.id = a.projeto_id WHERE a.avaliador_id = ? AND p.edicao_id = ?",
    u.id,
    e.id,
  )!;
  const primeiro = primeiroNome(u.nome);

  return (
    <>
    <Cabecalho
      centro
      rotulo={`Olá, ${primeiro} · SIPE ${e.ano}`}
      titulo={<>Qual pôster você vai <em>avaliar</em>?</>}
      descricao="Digite o código que aparece no pôster ou na lista da sua sala."
    />
    <div className="busca">
      <form action="/avaliar" method="get" className="bilhete" role="search">
        <span className="bilhete-n" aria-hidden="true">Nº</span>
        <input
          name="codigo"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0000"
          aria-label="Código do trabalho"
          defaultValue={codigo ?? ""}
          autoFocus
          required
        />
        <button className="btn btn-primario" type="submit">
          <span className="txt">Buscar</span> <span className="seta">→</span>
        </button>
      </form>
      {erro && <div className="aviso aviso-erro" role="alert">{erro}</div>}

      <section className="recentes folha">
        <div className="recentes-cab">
          <h2>Suas últimas avaliações</h2>
          {n > 0 && <Link href="/minhas" className="pequeno">Ver todas ({n}) →</Link>}
        </div>
        {recentes.length === 0 ? (
          <div className="vazio">
            <strong>Nenhuma avaliação ainda</strong>
            Os trabalhos que você avaliar aparecem aqui.
          </div>
        ) : (
          <ul className="lista-linhas">
            {recentes.map((r) => (
              <li key={r.codigo}>
                <Link href={`/projeto/${encodeURIComponent(r.codigo)}`}>
                  <span className="codigo-tag">{r.codigo}</span>
                  <span>
                    <span className="t">{r.titulo}</span>
                    <span className="s">{r.sala ? `${r.sala} · ` : ""}avaliado em {dataHora(r.atualizado_em)}</span>
                  </span>
                  <span className="n">{nota(r.total)}<small>/10</small></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
    </>
  );
}
