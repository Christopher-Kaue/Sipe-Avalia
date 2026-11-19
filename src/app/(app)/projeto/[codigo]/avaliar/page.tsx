import { notFound, redirect } from "next/navigation";
import { edicaoSelecionada } from "@backend/edicao";
import { exigirUsuario } from "@backend/auth";
import { MAX_AVALIADORES, alunosDo, criterios, projetoPorCodigo } from "@backend/dados";
import { all, get } from "@backend/db";
import { FormAvaliacao } from "@frontend/telas/avaliacao/FormAvaliacao";
import { Cabecalho } from "@frontend/componentes/Cabecalho";

export const metadata = { title: "Avaliação" };

export default async function PaginaAvaliacao({ params }: { params: Promise<{ codigo: string }> }) {
  const u = await exigirUsuario();
  const { codigo } = await params;
  const e = await edicaoSelecionada();
  const p = projetoPorCodigo(decodeURIComponent(codigo), e.id);
  if (!p) notFound();
  if (e.encerrada) redirect(`/projeto/${encodeURIComponent(p.codigo)}`);

  const atual = get<{ id: number; apresentador: string; comentario: string | null }>(
    "SELECT id, apresentador, comentario FROM avaliacoes WHERE projeto_id = ? AND avaliador_id = ?",
    p.id,
    u.id,
  );
  // sem avaliação própria e já com o máximo de avaliadores: volta para a ficha, que explica o motivo
  if (!atual && get<{ n: number }>("SELECT COUNT(*) AS n FROM avaliacoes WHERE projeto_id = ?", p.id)!.n >= MAX_AVALIADORES) {
    redirect(`/projeto/${encodeURIComponent(p.codigo)}`);
  }
  const niveis = atual
    ? Object.fromEntries(
        all<{ criterio_id: number; nivel: number }>("SELECT criterio_id, nivel FROM avaliacao_itens WHERE avaliacao_id = ?", atual.id).map(
          (i) => [i.criterio_id, i.nivel],
        ),
      )
    : {};

  return (
    <>
      <Cabecalho
        solta
        voltar={{ href: `/projeto/${encodeURIComponent(p.codigo)}`, texto: "Voltar ao trabalho" }}
        rotulo={`Rubrica de avaliação do pôster${p.sala ? ` · ${p.sala}` : ""}`}
        titulo={p.titulo}
        acoes={<span className="carimbo carimbo-g"><small>Nº</small>{p.codigo}</span>}
      />
      <FormAvaliacao
        codigo={p.codigo}
        criterios={criterios()}
        alunos={alunosDo(p.id)}
        inicial={{ apresentador: atual?.apresentador ?? "", comentario: atual?.comentario ?? "", niveis }}
        editando={!!atual}
      />
    </>
  );
}
