"use server";
import { revalidatePath } from "next/cache";
import { criarSessao, exigirCoordenacao, gerarSenha, hashSenha, problemaSenha } from "@backend/auth";
import { get, run, tx } from "@backend/db";
import { importarPlanilha, type ResultadoImportacao } from "@backend/importar";
import { edicaoSelecionada } from "@backend/edicao";

const atualizar = () => revalidatePath("/", "layout");

/* ---------------- usuários ---------------- */

export type EstadoUsuarios = {
  erro?: string;
  credencial?: { nome: string; login: string; senha: string; nova: boolean; definida: boolean };
};

/** Senha digitada pela coordenação ou, se o campo vier vazio / o botão for "gerar", uma aleatória. */
function senhaEscolhida(fd: FormData): { senha: string; definida: boolean } | { erro: string } {
  const modo = fd.get("modo");
  const digitada = modo === "gerar" ? "" : String(fd.get("senha") ?? "");
  if (!digitada && modo === "definir") return { erro: "Digite a senha que deseja definir, ou use “Gerar aleatória”." };
  if (!digitada) return { senha: gerarSenha(), definida: false };
  const problema = problemaSenha(digitada);
  return problema ? { erro: problema } : { senha: digitada, definida: true };
}

/** Cria um usuário ou troca a senha (definida pela coordenação ou gerada). A senha é mostrada uma única vez. */
export async function gerenciarUsuario(_: EstadoUsuarios, fd: FormData): Promise<EstadoUsuarios> {
  const eu = await exigirCoordenacao();
  const op = String(fd.get("op"));

  if (op === "criar") {
    const nome = String(fd.get("nome") ?? "").trim();
    const login = String(fd.get("login") ?? "").trim().toLowerCase();
    const perfil = fd.get("perfil") === "coordenacao" ? "coordenacao" : "professor";
    if (!nome || !login) return { erro: "Preencha nome e usuário." };
    if (!/^[a-z0-9._@+-]{3,80}$/.test(login)) return { erro: "Usuário deve ter ao menos 3 caracteres, sem espaços (letras, números, ponto, @, - ou _)." };
    if (get("SELECT 1 FROM usuarios WHERE login = ?", login)) return { erro: `Já existe um usuário “${login}”.` };
    const s = senhaEscolhida(fd);
    if ("erro" in s) return { erro: s.erro };
    run("INSERT INTO usuarios (nome, login, senha_hash, perfil) VALUES (?, ?, ?, ?)", nome, login, hashSenha(s.senha), perfil);
    atualizar();
    return { credencial: { nome, login, senha: s.senha, nova: true, definida: s.definida } };
  }

  if (op === "senha") {
    const id = Number(fd.get("id"));
    const u = get<{ nome: string; login: string }>("SELECT nome, login FROM usuarios WHERE id = ?", id);
    if (!u) return { erro: "Usuário não encontrado." };
    const s = senhaEscolhida(fd);
    if ("erro" in s) return { erro: `${u.nome}: ${s.erro}` };
    tx((d) => {
      d.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").run(hashSenha(s.senha), id);
      d.prepare("DELETE FROM sessoes WHERE usuario_id = ?").run(id); // derruba sessões abertas com a senha antiga
    });
    if (id === eu.id) await criarSessao(eu.id); // quem trocou a própria senha continua conectado aqui
    return { credencial: { ...u, senha: s.senha, nova: false, definida: s.definida } };
  }

  return { erro: "Operação inválida." };
}

export async function alternarAtivo(fd: FormData) {
  const eu = await exigirCoordenacao();
  const id = Number(fd.get("id"));
  if (id === eu.id) return;
  tx((d) => {
    d.prepare("UPDATE usuarios SET ativo = 1 - ativo WHERE id = ?").run(id);
    d.prepare("DELETE FROM sessoes WHERE usuario_id = ?").run(id);
  });
  atualizar();
}

export async function excluirUsuario(fd: FormData) {
  const eu = await exigirCoordenacao();
  const id = Number(fd.get("id"));
  if (id === eu.id) return;
  // quem já avaliou não pode ser excluído (as notas dependem dele) — use "Desativar"
  run("DELETE FROM usuarios WHERE id = ? AND NOT EXISTS (SELECT 1 FROM avaliacoes WHERE avaliador_id = ?)", id, id);
  atualizar();
}

/* ---------------- salas ---------------- */

export type EstadoSala = { erro?: string; ok?: string };

export async function salvarSala(_: EstadoSala, fd: FormData): Promise<EstadoSala> {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  const id = Number(fd.get("id") || 0);
  const nome = String(fd.get("nome") ?? "").trim();
  const local = String(fd.get("local") ?? "").trim() || null;
  if (!nome) return { erro: "Informe o nome da sala." };
  const dup = get<{ id: number }>("SELECT id FROM salas WHERE edicao_id = ? AND nome = ?", e.id, nome);
  if (dup && dup.id !== id) return { erro: `Já existe a sala “${nome}” em ${e.ano}.` };
  if (id) run("UPDATE salas SET nome = ?, local = ? WHERE id = ? AND edicao_id = ?", nome, local, id, e.id);
  else run("INSERT INTO salas (edicao_id, nome, local) VALUES (?, ?, ?)", e.id, nome, local);
  atualizar();
  return { ok: id ? "Sala atualizada." : `Sala “${nome}” criada.` };
}

export async function excluirSala(fd: FormData) {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  run("DELETE FROM salas WHERE id = ? AND edicao_id = ?", Number(fd.get("id")), e.id);
  atualizar();
}

/** Atribui (ou remove, com sala vazia) a sala de vários trabalhos de uma vez. */
export async function atribuirSala(fd: FormData) {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  const ids = fd.getAll("ids").map(Number).filter(Boolean);
  const sala = Number(fd.get("sala_id") || 0) || null;
  if (ids.length === 0) return;
  // sala e trabalhos precisam ser da mesma edição
  if (sala && !get("SELECT 1 FROM salas WHERE id = ? AND edicao_id = ?", sala, e.id)) return;
  tx((d) => {
    const up = d.prepare("UPDATE projetos SET sala_id = ? WHERE id = ? AND edicao_id = ?");
    for (const id of ids) up.run(sala, id, e.id);
  });
  atualizar();
}

/* ---------------- importação ---------------- */

export type EstadoImportacao = { erro?: string; resultado?: ResultadoImportacao; arquivo?: string };

export async function importar(_: EstadoImportacao, fd: FormData): Promise<EstadoImportacao> {
  await exigirCoordenacao();
  const e = await edicaoSelecionada();
  if (e.encerrada) return { erro: `A edição ${e.ano} está encerrada. Reabra-a em “Edições” para importar.` };
  const f = fd.get("planilha");
  if (!(f instanceof File) || f.size === 0) return { erro: "Escolha o arquivo da planilha." };
  if (!/\.(xlsx?|csv)$/i.test(f.name)) return { erro: "Formato não suportado. Envie .xls, .xlsx ou .csv." };
  try {
    const resultado = importarPlanilha(await f.arrayBuffer(), e.id);
    atualizar();
    return { resultado, arquivo: f.name };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível ler a planilha." };
  }
}
