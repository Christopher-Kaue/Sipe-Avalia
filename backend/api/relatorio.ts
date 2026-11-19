import "server-only";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { usuarioAtual } from "@backend/auth";
import { relatorio, type LinhaRelatorio } from "@backend/relatorio";
import { edicaoSelecionada, romano, type Edicao } from "@backend/edicao";
import { lerFiltros } from "@backend/filtros";

/* Paleta do SIPE (mesma do site) */
const COR = {
  vermelho: "FFC02030",
  vermelhoEscuro: "FF9F1725",
  vinho: "FF2A1114",
  papel: "FFF7F3EE",
  papel2: "FFEFE8E0",
  rosa: "FFF8E9EC",
  linha: "FFE2D6CB",
  texto2: "FF6B5A56",
  branco: "FFFFFFFF",
};
const FONTE = "Calibri";
const COLUNAS = [
  { titulo: "Código", largura: 10 },
  { titulo: "Título do trabalho", largura: 50 },
  { titulo: "Alunos participantes", largura: 32 },
  { titulo: "Avaliador 1", largura: 24 },
  { titulo: "Nota 1", largura: 9 },
  { titulo: "Avaliador 2", largura: 24 },
  { titulo: "Nota 2", largura: 9 },
  { titulo: "Média final", largura: 12 },
];
const N = COLUNAS.length;
/** colunas (1 = A) centralizadas: código e notas */
const CENTRO = new Set([1, 5, 7, 8]);

const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const borda = (argb = COR.linha): Partial<ExcelJS.Borders> => {
  const b = { style: "thin" as const, color: { argb } };
  return { top: b, bottom: b, left: b, right: b };
};
const nota2 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Linhas que o texto ocupa numa coluna de `largura` caracteres (Excel não ajusta a altura sozinho). */
function linhasDe(texto: string, largura: number) {
  return texto.split("\n").reduce((s, l) => s + Math.max(1, Math.ceil(l.length / (largura * 1.05))), 0);
}

function faixaMesclada(ws: ExcelJS.Worksheet, linha: number, valor: string, estilo: Partial<ExcelJS.Style>, altura: number) {
  ws.mergeCells(linha, 1, linha, N);
  const c = ws.getCell(linha, 1);
  c.value = valor;
  Object.assign(c, estilo);
  for (let i = 1; i <= N; i++) ws.getCell(linha, i).fill = estilo.fill!;
  ws.getRow(linha).height = altura;
}

export async function montarPlanilha(linhas: LinhaRelatorio[], edicao: Edicao, area?: string): Promise<ExcelJS.Buffer> {
  const sipe = `SIPE ${romano(edicao.numero)} · ${edicao.ano}`;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIPE — FADERGS";
  wb.created = new Date();

  const ws = wb.addWorksheet("Relatório", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: "5:5",
    },
    headerFooter: { oddFooter: `&L&8${sipe} — FADERGS&R&8Página &P de &N` },
  });
  ws.columns = COLUNAS.map((c) => ({ width: c.largura }));

  /* ---------- cabeçalho ---------- */
  const agora = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  faixaMesclada(ws, 1, `${sipe} — Relatório de trabalhos avaliados`, {
    font: { name: FONTE, size: 18, bold: true, color: { argb: COR.branco } },
    fill: fill(COR.vermelhoEscuro),
    alignment: { vertical: "middle", horizontal: "left", indent: 1 },
  }, 38);
  faixaMesclada(ws, 2, "Salão de Iniciação Científica, Pesquisa e Extensão · FADERGS Centro Universitário", {
    font: { name: FONTE, size: 10, italic: true, color: { argb: COR.rosa } },
    fill: fill(COR.vermelhoEscuro),
    alignment: { vertical: "top", horizontal: "left", indent: 1 },
  }, 20);

  // logo à direita da faixa
  const logo = path.join(process.cwd(), "public", "brand", "fadergs-logo-branco.png");
  if (fs.existsSync(logo)) {
    const img = wb.addImage({ buffer: fs.readFileSync(logo) as unknown as ExcelJS.Buffer, extension: "png" });
    ws.addImage(img, { tl: { col: N - 2.3, row: 0.3 }, ext: { width: 160, height: 32 } });
  }

  const avaliacoes = linhas.reduce((s, l) => s + l.avaliadores.length, 0);
  faixaMesclada(
    ws,
    3,
    `Área: ${area || "Todas as áreas"}     ·     ${linhas.length} trabalho(s) avaliado(s)     ·     ${avaliacoes} avaliação(ões)     ·     Gerado em ${agora}`,
    {
      font: { name: FONTE, size: 10, color: { argb: COR.texto2 } },
      fill: fill(COR.papel2),
      alignment: { vertical: "middle", horizontal: "left", indent: 1 },
    },
    24,
  );
  ws.getRow(4).height = 8;

  /* ---------- títulos das colunas ---------- */
  const cab = ws.getRow(5);
  COLUNAS.forEach((c, i) => {
    const cel = cab.getCell(i + 1);
    cel.value = c.titulo.toUpperCase();
    cel.font = { name: FONTE, size: 10, bold: true, color: { argb: COR.branco } };
    cel.fill = fill(COR.vinho);
    const centro = CENTRO.has(i + 1);
    cel.alignment = { vertical: "middle", horizontal: centro ? "center" : "left", indent: centro ? 0 : 1, wrapText: true };
    cel.border = borda(COR.vinho);
    if (i === N - 1) cel.fill = fill(COR.vermelhoEscuro);
  });
  cab.height = 26;

  /* ---------- dados, em blocos por área ---------- */
  let r = 6;
  if (linhas.length === 0) {
    faixaMesclada(ws, r, "Nenhum trabalho avaliado" + (area ? " nesta área." : "."), {
      font: { name: FONTE, size: 11, italic: true, color: { argb: COR.texto2 } },
      fill: fill(COR.papel),
      alignment: { vertical: "middle", horizontal: "center" },
    }, 30);
    r += 2;
  }

  const porArea = new Map<string, LinhaRelatorio[]>();
  for (const l of linhas) (porArea.get(l.area) ?? porArea.set(l.area, []).get(l.area)!).push(l);

  for (const [nomeArea, itens] of porArea) {
    const media = itens.reduce((s, l) => s + l.nota, 0) / itens.length;
    faixaMesclada(ws, r, `${nomeArea}   —   ${itens.length} trabalho(s) · média ${nota2(media)}`, {
      font: { name: FONTE, size: 11, bold: true, color: { argb: COR.vermelhoEscuro } },
      fill: fill(COR.rosa),
      alignment: { vertical: "middle", horizontal: "left", indent: 1 },
      border: { left: { style: "thick", color: { argb: COR.vermelho } }, bottom: { style: "thin", color: { argb: COR.linha } } },
    }, 24);
    r++;

    itens.forEach((l, i) => {
      const [a1, a2] = l.avaliadores;
      const alunos = l.alunos.length ? l.alunos.join("\n") : "—";
      const r2 = (n: number) => Math.round(n * 100) / 100;
      const row = ws.getRow(r);
      row.values = [l.codigo, l.titulo, alunos, a1?.nome ?? "—", a1 ? r2(a1.nota) : "—", a2?.nome ?? "—", a2 ? r2(a2.nota) : "—", r2(l.nota)];

      const fundo = i % 2 ? COR.papel : COR.branco;
      for (let c = 1; c <= N; c++) {
        const cel = row.getCell(c);
        cel.font = { name: FONTE, size: 10, color: { argb: COR.vinho } };
        cel.fill = fill(fundo);
        cel.border = borda();
        cel.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
      }
      row.getCell(1).font = { name: "Consolas", size: 10, bold: true, color: { argb: COR.vermelhoEscuro } };
      row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(2).font = { name: FONTE, size: 10, bold: true, color: { argb: COR.vinho } };
      for (const c of [5, 7]) {
        const cel = row.getCell(c);
        cel.numFmt = "0.00";
        cel.alignment = { vertical: "middle", horizontal: "center" };
        cel.font = { name: FONTE, size: 11, color: { argb: typeof cel.value === "number" ? COR.vinho : COR.texto2 } };
      }
      if (!a2) row.getCell(6).font = { name: FONTE, size: 10, italic: true, color: { argb: COR.texto2 } };
      const media = row.getCell(8);
      media.numFmt = "0.00";
      media.font = { name: FONTE, size: 12, bold: true, color: { argb: COR.vermelhoEscuro } };
      media.fill = fill(COR.rosa);
      media.alignment = { vertical: "middle", horizontal: "center" };

      const celulas: Array<[string, number]> = [[l.titulo, 2], [alunos, 3], [a1?.nome ?? "", 4], [a2?.nome ?? "", 6]];
      const alturas = celulas.map(([t, c]) => linhasDe(t, COLUNAS[c - 1].largura));
      row.height = Math.max(22, Math.max(...alturas) * 14 + 8);
      r++;
    });
    ws.getRow(r).height = 8; // respiro entre áreas
    r++;
  }

  /* ---------- rodapé ---------- */
  if (linhas.length) {
    const geral = linhas.reduce((s, l) => s + l.nota, 0) / linhas.length;
    ws.mergeCells(r, 1, r, N - 1);
    const rot = ws.getCell(r, 1);
    rot.value = "MÉDIA GERAL";
    const val = ws.getCell(r, N);
    val.value = Math.round(geral * 100) / 100;
    val.numFmt = "0.00";
    for (let c = 1; c <= N; c++) {
      const cel = ws.getCell(r, c);
      cel.fill = fill(COR.vinho);
      cel.font = { name: FONTE, size: 11, bold: true, color: { argb: COR.branco } };
      cel.alignment = { vertical: "middle", horizontal: c === N ? "center" : "right", indent: c === N ? 0 : 1 };
    }
    ws.getRow(r).height = 26;
    r += 2;
  }
  const nota = ws.getCell(r, 1);
  ws.mergeCells(r, 1, r, N);
  nota.value = "Notas de 0 a 10. Média final = (Nota 1 + Nota 2) ÷ 2; com um só avaliador, a média é a própria nota. Cada trabalho tem no máximo 2 avaliadores.";
  nota.font = { name: FONTE, size: 9, italic: true, color: { argb: COR.texto2 } };

  return wb.xlsx.writeBuffer();
}

/** GET /relatorio/planilha?area=… — só a coordenação. */
export async function baixarRelatorio(req: Request): Promise<Response> {
  const u = await usuarioAtual();
  if (!u || u.perfil !== "coordenacao") return new Response("Não autorizado", { status: 401 });

  const filtro = lerFiltros(new URL(req.url).searchParams);
  const area = filtro.area;
  const edicao = await edicaoSelecionada();
  const buf = await montarPlanilha(relatorio(edicao.id, filtro), edicao, area);

  const hoje = new Date().toISOString().slice(0, 10);
  const sufixo = area
    ? "-" + area.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()
    : "";
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sipe-${edicao.ano}-relatorio${sufixo}-${hoje}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
