"use server";
import { redirect } from "next/navigation";
import { get, run, tx } from "@backend/db";
import {
  conferirSenha, criarSessao, encerrarSessao, existeUsuario, exigirUsuario, hashSenha,
  limparFalhas, loginBloqueado, problemaSenha, registrarFalha,
} from "@backend/auth";

export type Estado = { erro?: string; login?: string };

export async function entrar(_: Estado, fd: FormData): Promise<Estado> {
  const login = String(fd.get("login") ?? "").trim();
  const senha = String(fd.get("senha") ?? "");
  if (!login || !senha) return { erro: "Informe usuário e senha.", login };

  const espera = loginBloqueado(login);
  if (espera) return { erro: `Muitas tentativas. Tente novamente em ${espera} s.`, login };

  const u = get<{ id: number; senha_hash: string; ativo: number; perfil: string }>(
    "SELECT id, senha_hash, ativo, perfil FROM usuarios WHERE login = ?",
    login,
  );
  if (!u || !conferirSenha(senha, u.senha_hash)) {
    registrarFalha(login);
    return { erro: "Usuário ou senha incorretos.", login };
  }
  if (!u.ativo) return { erro: "Este acesso foi desativado pela coordenação.", login };

  limparFalhas(login);
  await criarSessao(u.id);
  redirect(u.perfil === "coordenacao" ? "/painel" : "/avaliar");
}

export type EstadoSenha = { erro?: string; ok?: boolean };

/** Qualquer usuário troca a própria senha, informando a atual. Outras sessões abertas são encerradas. */
export async function alterarMinhaSenha(_: EstadoSenha, fd: FormData): Promise<EstadoSenha> {
  const eu = await exigirUsuario();
  const atual = String(fd.get("atual") ?? "");
  const nova = String(fd.get("nova") ?? "");
  const conf = String(fd.get("confirmar") ?? "");

  const espera = loginBloqueado(eu.login);
  if (espera) return { erro: `Muitas tentativas. Tente novamente em ${espera} s.` };
  const { senha_hash } = get<{ senha_hash: string }>("SELECT senha_hash FROM usuarios WHERE id = ?", eu.id)!;
  if (!conferirSenha(atual, senha_hash)) {
    registrarFalha(eu.login);
    return { erro: "A senha atual está incorreta." };
  }
  const problema = problemaSenha(nova);
  if (problema) return { erro: problema };
  if (nova !== conf) return { erro: "A nova senha e a confirmação não conferem." };
  if (nova === atual) return { erro: "A nova senha precisa ser diferente da atual." };

  limparFalhas(eu.login);
  tx((d) => {
    d.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").run(hashSenha(nova), eu.id);
    d.prepare("DELETE FROM sessoes WHERE usuario_id = ?").run(eu.id);
  });
  await criarSessao(eu.id); // continua conectado neste navegador
  return { ok: true };
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}

/** Cria a primeira conta da coordenação. Só funciona enquanto não existe nenhum usuário. */
export async function primeiroAcesso(_: Estado, fd: FormData): Promise<Estado> {
  if (existeUsuario()) redirect("/login");
  const nome = String(fd.get("nome") ?? "").trim();
  const login = String(fd.get("login") ?? "").trim();
  const senha = String(fd.get("senha") ?? "");
  const conf = String(fd.get("confirmar") ?? "");
  if (!nome || !login) return { erro: "Preencha nome e usuário.", login };
  const problema = problemaSenha(senha);
  if (problema) return { erro: problema, login };
  if (senha !== conf) return { erro: "As senhas não conferem.", login };

  const r = run("INSERT INTO usuarios (nome, login, senha_hash, perfil) VALUES (?, ?, ?, 'coordenacao')", nome, login, hashSenha(senha));
  await criarSessao(Number(r.lastInsertRowid));
  redirect("/importar");
}
