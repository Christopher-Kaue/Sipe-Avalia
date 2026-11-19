import "server-only";
import * as XLSX from "xlsx";
import { tx } from "./db";
import { nomeProprio } from "./texto";

export type ResultadoImportacao = {
  lidos: number;
  novos: number;
  atualizados: number;
  removidos: number;
  semPoster: number;
  ignorados: Array<{ linha: number; motivo: string }>;
};

/** "Link Apresentação" → "link apresentacao" */
const chave = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const texto = (v: unknown): string => {
  if (v == null) return "";
  const s = String(v).trim();
  return s.toUpperCase() === "NULL" ? "" : s;
};

/** O sistema de inscrições deixa o link terminando em "/posters/" quando o aluno não enviou o arquivo. */
const linkValido = (v: unknown): string | null => {
  const s = texto(v);
  if (!/^https?:\/\//i.test(s)) return null;
  if (/\/(posters|resumos)\/?$/i.test(s)) return null;
  return s;
};

const codigoDe = (v: unknown): string => {
  if (typeof v === "number") return String(Math.trunc(v));
  return texto(v).replace(/\.0+$/, "");
};

const separarAutores = (s: string) =>
  s.split(/[,;]/).map((a) => a.replace(/\s+/g, " ").trim()).filter(Boolean).map(nomeProprio);

/** Importa os trabalhos para a edição indicada; outras edições nunca são tocadas. */
export function importarPlanilha(buf: ArrayBuffer, edicaoId: number): ResultadoImportacao {
  const wb = XLSX.read(buf, { type: "array" });
  const nomeExcluidos = wb.SheetNames.find((n) => chave(n).startsWith("exclu"));
  const nomePrincipal = wb.SheetNames.find((n) => n !== nomeExcluidos);
  if (!nomePrincipal) throw new Error("A planilha não tem nenhuma aba com trabalhos.");

  const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[nomePrincipal], { defval: null });
  if (linhas.length === 0) throw new Error("A aba de trabalhos está vazia.");

  const registros = linhas.map((l) => Object.fromEntries(Object.entries(l).map(([k, v]) => [chave(k), v])));
  const cols = Object.keys(registros[0]);
  for (const obrig of ["id", "titulo", "autores"]) {
    if (!cols.includes(obrig)) throw new Error(`Coluna obrigatória "${obrig}" não encontrada na aba "${nomePrincipal}".`);
  }

  const excluidos = nomeExcluidos
    ? XLSX.utils
        .sheet_to_json<Record<string, unknown>>(wb.Sheets[nomeExcluidos], { defval: null })
        .map((l) => codigoDe(Object.entries(l).find(([k]) => chave(k) === "id")?.[1]))
        .filter(Boolean)
    : [];

  const r: ResultadoImportacao = { lidos: registros.length, novos: 0, atualizados: 0, removidos: 0, semPoster: 0, ignorados: [] };

  tx((d) => {
    const existe = d.prepare("SELECT id FROM projetos WHERE edicao_id = ? AND codigo = ?");
    const upsert = d.prepare(`
      INSERT INTO projetos (edicao_id, codigo, titulo, area, tipo, resumo, referencias, link_resumo, link_poster, emails, importado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (edicao_id, codigo) DO UPDATE SET
        titulo = excluded.titulo, area = excluded.area, tipo = excluded.tipo, resumo = excluded.resumo,
        referencias = excluded.referencias, link_resumo = excluded.link_resumo, link_poster = excluded.link_poster,
        emails = excluded.emails, importado_em = excluded.importado_em
      RETURNING id`);
    const limparAlunos = d.prepare("DELETE FROM alunos WHERE projeto_id = ?");
    const addAluno = d.prepare("INSERT INTO alunos (projeto_id, nome, ordem) VALUES (?, ?, ?)");

    registros.forEach((l, i) => {
      const linha = i + 2; // 1 = cabeçalho
      const codigo = codigoDe(l["id"]);
      const titulo = texto(l["titulo"]);
      const autores = separarAutores(texto(l["autores"]));
      if (!codigo) return void r.ignorados.push({ linha, motivo: "sem id" });
      if (!titulo) return void r.ignorados.push({ linha, motivo: `trabalho ${codigo} sem título` });
      if (autores.length === 0) return void r.ignorados.push({ linha, motivo: `trabalho ${codigo} sem autores` });

      const tipo = Number(l["resumo expandido"]) === 1 ? "Resumo expandido" : Number(l["resumo simples"]) === 1 ? "Resumo simples" : null;
      const poster = linkValido(l["link apresentacao"]);
      if (!poster) r.semPoster++;

      const jaExistia = !!existe.get(edicaoId, codigo);
      const { id } = upsert.get(
        edicaoId,
        codigo,
        titulo,
        texto(l["area"]) || null,
        tipo,
        texto(l["resumo"]) || null,
        texto(l["referencias"]) || null,
        linkValido(l["link resumo"]),
        poster,
        texto(l["e-mail"]) || null,
      ) as { id: number };
      jaExistia ? r.atualizados++ : r.novos++;

      limparAlunos.run(id);
      autores.forEach((nome, ordem) => addAluno.run(id, nome, ordem));
    });

    // trabalhos da aba "Excluidos" saem do sistema, a menos que já tenham avaliação
    const remover = d.prepare(
      "DELETE FROM projetos WHERE edicao_id = ? AND codigo = ? AND NOT EXISTS (SELECT 1 FROM avaliacoes a WHERE a.projeto_id = projetos.id)",
    );
    for (const c of excluidos) r.removidos += Number(remover.run(edicaoId, c).changes);
  });

  return r;
}
