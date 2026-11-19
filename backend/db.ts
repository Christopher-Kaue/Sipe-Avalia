import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.SIPE_DB_PATH ?? path.join(process.cwd(), "data", "sipe.db");

declare global {
  // reaproveita a conexão entre recargas do servidor de desenvolvimento
  var __sipeDb: DatabaseSync | undefined;
}

/* Salas e trabalhos pertencem a uma edição (ano) do SIPE; o mesmo código pode se repetir em anos diferentes. */
const ddlSalas = (t: string) => `
CREATE TABLE IF NOT EXISTS ${t} (
  id         INTEGER PRIMARY KEY,
  edicao_id  INTEGER NOT NULL REFERENCES edicoes(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL COLLATE NOCASE,
  local      TEXT,
  UNIQUE (edicao_id, nome)
);`;

const ddlProjetos = (t: string) => `
CREATE TABLE IF NOT EXISTS ${t} (
  id            INTEGER PRIMARY KEY,
  edicao_id     INTEGER NOT NULL REFERENCES edicoes(id) ON DELETE CASCADE,
  codigo        TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  area          TEXT,
  tipo          TEXT,
  resumo        TEXT,
  referencias   TEXT,
  link_resumo   TEXT,
  link_poster   TEXT,
  emails        TEXT,
  sala_id       INTEGER REFERENCES salas(id) ON DELETE SET NULL,
  importado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (edicao_id, codigo)
);`;

const COLS_PROJETO = "id, codigo, titulo, area, tipo, resumo, referencias, link_resumo, link_poster, emails, sala_id, importado_em";

/** O SIPE começou em 2014 (I edição); serve só de sugestão para o número da edição. */
export const numeroSugerido = (ano: number) => Math.max(1, ano - 2013);

const anoAtual = () => Number(new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date()));

/** Bancos criados antes das edições: tudo o que existe vira a edição do ano da primeira importação. */
function migrarParaEdicoes(d: DatabaseSync) {
  const { ano } = d.prepare("SELECT CAST(COALESCE(strftime('%Y', MIN(importado_em)), ?) AS INTEGER) AS ano FROM projetos").get(anoAtual()) as { ano: number };
  d.exec("PRAGMA foreign_keys = OFF");
  d.exec("BEGIN IMMEDIATE");
  try {
    const { id } = d.prepare("INSERT INTO edicoes (ano, numero) VALUES (?, ?) RETURNING id").get(ano, numeroSugerido(ano)) as { id: number };
    d.exec(ddlSalas("salas_nova"));
    d.prepare("INSERT INTO salas_nova (id, edicao_id, nome, local) SELECT id, ?, nome, local FROM salas").run(id);
    d.exec("DROP TABLE salas; ALTER TABLE salas_nova RENAME TO salas;");
    d.exec(ddlProjetos("projetos_nova"));
    d.prepare(`INSERT INTO projetos_nova (edicao_id, ${COLS_PROJETO}) SELECT ?, ${COLS_PROJETO} FROM projetos`).run(id);
    d.exec("DROP TABLE projetos; ALTER TABLE projetos_nova RENAME TO projetos;");
    const quebradas = d.prepare("PRAGMA foreign_key_check").all();
    if (quebradas.length) throw new Error("Migração de edições deixou referências quebradas.");
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  } finally {
    d.exec("PRAGMA foreign_keys = ON");
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id          INTEGER PRIMARY KEY,
  nome        TEXT NOT NULL,
  login       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash  TEXT NOT NULL,
  perfil      TEXT NOT NULL CHECK (perfil IN ('coordenacao', 'professor')),
  ativo       INTEGER NOT NULL DEFAULT 1,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash  TEXT PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS edicoes (
  id         INTEGER PRIMARY KEY,
  ano        INTEGER NOT NULL UNIQUE,
  numero     INTEGER NOT NULL,
  encerrada  INTEGER NOT NULL DEFAULT 0,
  criada_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

${ddlSalas("salas")}

${ddlProjetos("projetos")}

CREATE TABLE IF NOT EXISTS alunos (
  id          INTEGER PRIMARY KEY,
  projeto_id  INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  ordem       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alunos_projeto ON alunos(projeto_id);

CREATE TABLE IF NOT EXISTS criterios (
  id      INTEGER PRIMARY KEY,
  nome    TEXT NOT NULL,
  peso    REAL NOT NULL,
  ordem   INTEGER NOT NULL,
  desc_0  TEXT NOT NULL,
  desc_1  TEXT NOT NULL,
  desc_2  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id             INTEGER PRIMARY KEY,
  projeto_id     INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  avaliador_id   INTEGER NOT NULL REFERENCES usuarios(id),
  apresentador   TEXT NOT NULL,
  comentario     TEXT,
  total          REAL NOT NULL,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (projeto_id, avaliador_id)
);

CREATE TABLE IF NOT EXISTS avaliacao_itens (
  avaliacao_id  INTEGER NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
  criterio_id   INTEGER NOT NULL REFERENCES criterios(id),
  nivel         INTEGER NOT NULL CHECK (nivel IN (0, 1, 2)),
  PRIMARY KEY (avaliacao_id, criterio_id)
);
`;

/** Rubrica de Avaliação do Pôster — SIPE XIII. Níveis valem 0%, 50% e 100% do peso. */
const RUBRICA: Array<[string, number, string, string, string]> = [
  ["Introdução", 1.5, "Não trouxe introdução do tema", "Introduziu parcialmente o tema, parte deveria estar nos resultados", "Introduziu de forma plena, contemplando todo tema"],
  ["Objetivo", 1.0, "Não está relacionado aos resultados", "Ficou parcialmente relacionado com os resultados", "Ficou totalmente relacionado com o tema"],
  ["Metodologia", 2.0, "Não apresentou a metodologia", "Apresentou parcialmente a metodologia, ou não podendo ser replicada", "Apresentou elementos importantes da busca do tema"],
  ["Resultados / discussão", 3.0, "Não estava relacionado com o tema nem com o objetivo", "Parcialmente relacionada com o tema ou com o objetivo", "Plenamente relacionado com o tema e objetivo proposto"],
  ["Referências", 0.5, "Não referenciou", "Referências apresentadas de forma insatisfatória", "Plenamente satisfatória, apresentando no mínimo 2 referências"],
  ["Apresentação oral", 2.0, "Não apresentaram", "Apresentou lendo, sem domínio do assunto", "Apresentaram com domínio do assunto"],
];

function init(d: DatabaseSync) {
  d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  d.exec(SCHEMA);
  const colunas = (d.prepare("PRAGMA table_info(projetos)").all() as Array<{ name: string }>).map((c) => c.name);
  if (!colunas.includes("edicao_id")) migrarParaEdicoes(d);
  d.exec(`CREATE INDEX IF NOT EXISTS idx_projetos_edicao ON projetos(edicao_id);
          CREATE INDEX IF NOT EXISTS idx_salas_edicao ON salas(edicao_id);`);
  if (!d.prepare("SELECT 1 FROM edicoes").get()) {
    const ano = anoAtual();
    d.prepare("INSERT INTO edicoes (ano, numero) VALUES (?, ?)").run(ano, numeroSugerido(ano));
  }
  const { n } = d.prepare("SELECT COUNT(*) AS n FROM criterios").get() as { n: number };
  if (n === 0) {
    const ins = d.prepare("INSERT INTO criterios (nome, peso, ordem, desc_0, desc_1, desc_2) VALUES (?, ?, ?, ?, ?, ?)");
    RUBRICA.forEach(([nome, peso, d0, d1, d2], i) => ins.run(nome, peso, i + 1, d0, d1, d2));
  }
}

// a conexão sobrevive às recargas do dev server, mas este módulo é reavaliado: assim um esquema novo
// (migração) é aplicado sem precisar reiniciar o `npm run dev`. init() é idempotente.
let iniciado = false;

export function db(): DatabaseSync {
  if (!globalThis.__sipeDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    globalThis.__sipeDb = new DatabaseSync(DB_PATH);
  }
  if (!iniciado) {
    init(globalThis.__sipeDb);
    iniciado = true;
  }
  return globalThis.__sipeDb;
}

/** Executa fn dentro de uma transação. */
export function tx<T>(fn: (d: DatabaseSync) => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const r = fn(d);
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

// node:sqlite devolve objetos sem protótipo; o React não aceita passá-los a Client Components
const plano = <T>(row: unknown): T => ({ ...(row as object) }) as T;

export function all<T>(sql: string, ...params: Array<string | number | null>): T[] {
  return db().prepare(sql).all(...params).map((r) => plano<T>(r));
}

export function get<T>(sql: string, ...params: Array<string | number | null>): T | undefined {
  const r = db().prepare(sql).get(...params);
  return r === undefined ? undefined : plano<T>(r);
}

export function run(sql: string, ...params: Array<string | number | null>) {
  return db().prepare(sql).run(...params);
}
