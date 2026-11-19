"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirCoordenacao } from "@backend/auth";
import { get, run, tx } from "@backend/db";
import { COOKIE_EDICAO, edicaoMaisRecente, edicaoPorAno } from "@backend/edicao";

/** Cookie de sessão do navegador: ao entrar de novo, a coordenação volta para a edição mais recente. */
async function selecionar(ano: number) {
  (await cookies()).set(COOKIE_EDICAO, String(ano), { httpOnly: true, sameSite: "lax", path: "/" });
}

/** Troca o ano exibido e volta para a mesma tela (a ficha de um trabalho não existe em outro ano). */
export async function trocarEdicao(fd: FormData) {
  await exigirCoordenacao();
  const e = edicaoPorAno(Number(fd.get("ano")));
  if (!e) return;
  await selecionar(e.ano);
  let caminho = String(fd.get("caminho") ?? "/painel");
  if (!caminho.startsWith("/") || caminho.startsWith("//") || caminho.startsWith("/projeto/")) caminho = "/painel";
  revalidatePath("/", "layout");
  redirect(caminho);
}

export type EstadoEdicao = { erro?: string };

export async function criarEdicao(_: EstadoEdicao, fd: FormData): Promise<EstadoEdicao> {
  await exigirCoordenacao();
  const ano = Number(fd.get("ano"));
  const numero = Number(fd.get("numero"));
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return { erro: "Informe um ano válido." };
  if (!Number.isInteger(numero) || numero < 1 || numero > 200) return { erro: "Informe o número da edição (ex.: 14)." };
  if (edicaoPorAno(ano)) return { erro: `Já existe a edição de ${ano}.` };
  if (get("SELECT 1 FROM edicoes WHERE numero = ?", numero)) return { erro: `Já existe uma edição com o número ${numero}.` };

  const anterior = edicaoMaisRecente();
  tx((d) => {
    const { id } = d.prepare("INSERT INTO edicoes (ano, numero) VALUES (?, ?) RETURNING id").get(ano, numero) as { id: number };
    if (fd.get("copiar_salas") && anterior) {
      d.prepare("INSERT INTO salas (edicao_id, nome, local) SELECT ?, nome, local FROM salas WHERE edicao_id = ?").run(id, anterior.id);
    }
    if (fd.get("encerrar_anterior") && anterior && anterior.ano < ano) {
      d.prepare("UPDATE edicoes SET encerrada = 1 WHERE id = ?").run(anterior.id);
    }
  });
  await selecionar(ano);
  revalidatePath("/", "layout");
  redirect("/painel");
}

export async function alternarEncerrada(fd: FormData) {
  await exigirCoordenacao();
  run("UPDATE edicoes SET encerrada = 1 - encerrada WHERE id = ?", Number(fd.get("id")));
  revalidatePath("/", "layout");
}

/** Só edições vazias (sem trabalhos importados) podem ser excluídas; o histórico nunca se perde. */
export async function excluirEdicao(fd: FormData) {
  await exigirCoordenacao();
  const id = Number(fd.get("id"));
  const total = get<{ n: number }>("SELECT COUNT(*) AS n FROM edicoes")!.n;
  if (total <= 1) return;
  run("DELETE FROM edicoes WHERE id = ? AND NOT EXISTS (SELECT 1 FROM projetos WHERE edicao_id = ?)", id, id);
  revalidatePath("/", "layout");
}
