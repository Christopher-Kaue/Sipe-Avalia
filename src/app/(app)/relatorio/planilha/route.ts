import { baixarRelatorio } from "@backend/api/relatorio";

// GET /relatorio/planilha?area=… → planilha .xlsx formatada (a lógica fica no back)
export async function GET(req: Request) {
  return baixarRelatorio(req);
}
