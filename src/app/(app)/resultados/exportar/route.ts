import { exportarResultados } from "@backend/api/exportar";

// GET /resultados/exportar → planilha .xlsx (a lógica fica no back)
export async function GET(req: Request) {
  return exportarResultados(req);
}
