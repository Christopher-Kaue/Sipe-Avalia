import "server-only";

/** Filtros padrão das listas de trabalhos (mesmos da tela Trabalhos). */
export type Filtros = { q?: string; area?: string; sala?: string; status?: string };

export const SITUACOES = [
  { valor: "sem-sala", rotulo: "Sem sala" },
  { valor: "pendentes", rotulo: "Não avaliados" },
  { valor: "avaliados", rotulo: "Avaliados" },
  { valor: "sem-poster", rotulo: "Pôster não enviado" },
] as const;

/** Situações que fazem sentido em listas que só têm trabalhos já avaliados. */
export const SITUACOES_AVALIADOS = SITUACOES.filter((s) => s.valor !== "pendentes" && s.valor !== "avaliados");

/** Lê os filtros de searchParams (página) ou de URLSearchParams (rota de download). */
export function lerFiltros(origem: URLSearchParams | Record<string, string | string[] | undefined>): Filtros {
  const pega = (k: string) => {
    const v = origem instanceof URLSearchParams ? origem.get(k) : origem[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s?.trim() || undefined;
  };
  return { q: pega("q"), area: pega("area"), sala: pega("sala"), status: pega("status") };
}

/** Query string com os filtros preenchidos (para links de exportação). */
export function qsFiltros(f: Filtros): string {
  const qs = new URLSearchParams(Object.entries(f).filter((e): e is [string, string] => Boolean(e[1]))).toString();
  return qs ? `?${qs}` : "";
}

/**
 * Condições SQL para a tabela de projetos com o apelido `p`.
 * O status "todas" (ou vazio) não filtra nada.
 */
export function filtroSql(f: Filtros): { onde: string[]; args: Array<string | number> } {
  const onde: string[] = [];
  const args: Array<string | number> = [];
  if (f.q) {
    const q = `%${f.q}%`;
    onde.push("(p.codigo LIKE ? OR p.titulo LIKE ? OR EXISTS (SELECT 1 FROM alunos fal WHERE fal.projeto_id = p.id AND fal.nome LIKE ?))");
    args.push(q, q, q);
  }
  if (f.area) { onde.push("p.area = ?"); args.push(f.area); }
  if (f.sala) { onde.push("p.sala_id = ?"); args.push(Number(f.sala)); }
  if (f.status === "sem-sala") onde.push("p.sala_id IS NULL");
  if (f.status === "avaliados") onde.push("EXISTS (SELECT 1 FROM avaliacoes fav WHERE fav.projeto_id = p.id)");
  if (f.status === "pendentes") onde.push("NOT EXISTS (SELECT 1 FROM avaliacoes fav WHERE fav.projeto_id = p.id)");
  if (f.status === "sem-poster") onde.push("p.link_poster IS NULL");
  return { onde, args };
}
