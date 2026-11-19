import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { usuarioAtual } from "./auth";
import { all, get } from "./db";

export type Edicao = { id: number; ano: number; numero: number; encerrada: number };

export const COOKIE_EDICAO = "sipe_edicao";

export function edicoes(): Edicao[] {
  return all<Edicao>("SELECT id, ano, numero, encerrada FROM edicoes ORDER BY ano DESC");
}

/** A edição mais recente (maior ano) é a "atual": é nela que os professores avaliam. */
export function edicaoMaisRecente(): Edicao {
  return get<Edicao>("SELECT id, ano, numero, encerrada FROM edicoes ORDER BY ano DESC LIMIT 1")!;
}

export function edicaoPorAno(ano: number): Edicao | undefined {
  return get<Edicao>("SELECT id, ano, numero, encerrada FROM edicoes WHERE ano = ?", ano);
}

/**
 * Edição que a tela deve mostrar. A coordenação escolhe o ano no seletor do topo (fica gravado num cookie
 * da sessão do navegador); professores sempre trabalham na edição mais recente.
 */
export const edicaoSelecionada = cache(async (): Promise<Edicao> => {
  const u = await usuarioAtual();
  if (u?.perfil === "coordenacao") {
    const ano = Number((await cookies()).get(COOKIE_EDICAO)?.value);
    const e = ano ? edicaoPorAno(ano) : undefined;
    if (e) return e;
  }
  return edicaoMaisRecente();
});

export function romano(n: number): string {
  const tabela: Array<[number, string]> = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let r = "";
  for (const [v, s] of tabela) while (n >= v) { r += s; n -= v; }
  return r;
}
