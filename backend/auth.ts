import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { get, run } from "./db";

export type Perfil = "coordenacao" | "professor";
export type Usuario = { id: number; nome: string; login: string; perfil: Perfil };

const COOKIE = "sipe_sessao";
const DURACAO_MS = 12 * 60 * 60 * 1000; // 12 h — cobre um dia de evento

/* ---------- senhas ---------- */

export function hashSenha(senha: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function conferirSenha(senha: string, armazenado: string): boolean {
  const [alg, saltHex, hashHex] = armazenado.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const obtido = crypto.scryptSync(senha, Buffer.from(saltHex, "hex"), esperado.length);
  return crypto.timingSafeEqual(esperado, obtido);
}

export const SENHA_MIN = 8;

/** Regra única para senhas escolhidas por alguém (não geradas). Devolve a mensagem de erro ou null. */
export function problemaSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN) return `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  if (senha.length > 128) return "A senha pode ter no máximo 128 caracteres.";
  if (/^\s|\s$/.test(senha)) return "A senha não pode começar nem terminar com espaço.";
  return null;
}

/** Senha legível para entregar em papel: sem caracteres ambíguos (0/O, 1/l/I). Ex.: "k7mq-x4pr-c9ta". */
export function gerarSenha(): string {
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) {
    s += alfabeto[bytes[i] % alfabeto.length];
    if (i === 3 || i === 7) s += "-";
  }
  return s;
}

/* ---------- proteção simples contra tentativa e erro ---------- */

const falhas = new Map<string, { n: number; ate: number }>();

export function loginBloqueado(login: string): number {
  const f = falhas.get(login.toLowerCase());
  if (!f || f.ate < Date.now()) return 0;
  return Math.ceil((f.ate - Date.now()) / 1000);
}

export function registrarFalha(login: string) {
  const k = login.toLowerCase();
  const f = falhas.get(k);
  const n = f && f.ate > Date.now() - 15 * 60_000 ? f.n + 1 : 1;
  falhas.set(k, { n, ate: n >= 5 ? Date.now() + 60_000 * Math.min(n - 4, 15) : Date.now() });
}

export function limparFalhas(login: string) {
  falhas.delete(login.toLowerCase());
}

/* ---------- sessões ---------- */

const sha = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function criarSessao(usuarioId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expira = Date.now() + DURACAO_MS;
  run("DELETE FROM sessoes WHERE expira_em < ?", Date.now());
  run("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)", sha(token), usuarioId, expira);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.SIPE_HTTP !== "1",
    path: "/",
    expires: new Date(expira),
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run("DELETE FROM sessoes WHERE token_hash = ?", sha(token));
  jar.delete(COOKIE);
}

export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const u = get<Usuario>(
    `SELECT u.id, u.nome, u.login, u.perfil
       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = ? AND s.expira_em > ? AND u.ativo = 1`,
    sha(token),
    Date.now(),
  );
  return u ?? null;
});

export async function exigirUsuario(): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  return u;
}

export async function exigirCoordenacao(): Promise<Usuario> {
  const u = await exigirUsuario();
  if (u.perfil !== "coordenacao") redirect("/avaliar");
  return u;
}

export function existeUsuario(): boolean {
  return !!get("SELECT 1 FROM usuarios LIMIT 1");
}
