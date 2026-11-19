"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirCoordenacao, exigirUsuario } from "@backend/auth";
import { MAX_AVALIADORES, alunosDo, criterios, pontos, projetoPorCodigo } from "@backend/dados";
import { get, run, tx } from "@backend/db";
import { edicaoSelecionada } from "@backend/edicao";

export type EstadoAvaliacao = { erro?: string };

export async function salvarAvaliacao(_: EstadoAvaliacao, fd: FormData): Promise<EstadoAvaliacao> {
  const u = await exigirUsuario();
  const e = await edicaoSelecionada();
  if (e.encerrada) return { erro: `A edição ${e.ano} está encerrada; as avaliações não podem mais ser alteradas.` };
  const codigo = String(fd.get("codigo") ?? "");
  const p = projetoPorCodigo(codigo, e.id);
  if (!p) return { erro: "Trabalho não encontrado." };

  const apresentador = String(fd.get("apresentador") ?? "").trim();
  // opcional: vazio é aceito; se vier preenchido, tem de ser um dos alunos do trabalho
  if (apresentador && !alunosDo(p.id).includes(apresentador)) return { erro: "Apresentador(a) inválido para este trabalho." };

  const crit = criterios();
  const niveis: Array<[number, number]> = [];
  for (const c of crit) {
    const v = fd.get(`c${c.id}`);
    const n = Number(v);
    if (v == null || ![0, 1, 2].includes(n)) return { erro: `Escolha um nível para “${c.nome}”.` };
    niveis.push([c.id, n]);
  }
  const total = crit.reduce((s, c, i) => s + pontos(c.peso, niveis[i][1]), 0);
  const comentario = String(fd.get("comentario") ?? "").trim().slice(0, 2000) || null;

  // a checagem fica dentro da transação: dois professores salvando ao mesmo tempo não passam do limite
  const lotado = tx((d) => {
    const minha = d.prepare("SELECT 1 FROM avaliacoes WHERE projeto_id = ? AND avaliador_id = ?").get(p.id, u.id);
    const { n } = d.prepare("SELECT COUNT(*) AS n FROM avaliacoes WHERE projeto_id = ?").get(p.id) as { n: number };
    if (!minha && n >= MAX_AVALIADORES) return true;

    const { id } = d
      .prepare(
        `INSERT INTO avaliacoes (projeto_id, avaliador_id, apresentador, comentario, total)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (projeto_id, avaliador_id) DO UPDATE SET
           apresentador = excluded.apresentador, comentario = excluded.comentario,
           total = excluded.total, atualizado_em = datetime('now')
         RETURNING id`,
      )
      .get(p.id, u.id, apresentador, comentario, total) as { id: number };
    d.prepare("DELETE FROM avaliacao_itens WHERE avaliacao_id = ?").run(id);
    const ins = d.prepare("INSERT INTO avaliacao_itens (avaliacao_id, criterio_id, nivel) VALUES (?, ?, ?)");
    for (const [cid, n] of niveis) ins.run(id, cid, n);
    return false;
  });
  if (lotado) return { erro: `Este trabalho já tem ${MAX_AVALIADORES} avaliações registradas, o máximo por trabalho. Sua avaliação não foi salva.` };

  revalidatePath("/", "layout");
  redirect(`/projeto/${encodeURIComponent(p.codigo)}?salvo=1`);
}

/** Coordenação pode remover uma avaliação lançada por engano. */
export async function excluirAvaliacao(fd: FormData) {
  await exigirCoordenacao();
  const id = Number(fd.get("id"));
  const a = get<{ codigo: string; encerrada: number }>(
    `SELECT p.codigo, e.encerrada FROM avaliacoes a
       JOIN projetos p ON p.id = a.projeto_id JOIN edicoes e ON e.id = p.edicao_id
      WHERE a.id = ?`,
    id,
  );
  if (!a || a.encerrada) return;
  run("DELETE FROM avaliacoes WHERE id = ?", id);
  revalidatePath("/", "layout");
  redirect(`/projeto/${encodeURIComponent(a.codigo)}`);
}
