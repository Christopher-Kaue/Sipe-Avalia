import Link from "next/link";

type Valores = { q?: string; area?: string; sala?: string; status?: string };
type Situacao = { valor: string; rotulo: string };

/**
 * Barra de filtros padrão (Buscar · Área · Sala · Situação), igual em todas as listas.
 * `statusPadrao`: situação aplicada quando nada foi escolhido (ex.: Resultados mostra só avaliados).
 */
export function Filtros({
  valores,
  areas,
  salas,
  situacoes,
  limpar,
  statusPadrao,
}: {
  valores: Valores;
  areas: string[];
  salas: Array<{ id: number; nome: string }>;
  situacoes: readonly Situacao[];
  /** rota da própria página, usada pelo botão Limpar */
  limpar: string;
  statusPadrao?: string;
}) {
  const status = valores.status ?? statusPadrao ?? "";
  const filtrando = Boolean(valores.q || valores.area || valores.sala || (valores.status && valores.status !== (statusPadrao ?? "")));

  return (
    <form className="filtros" method="get">
      <label className="campo busca-texto">
        <span className="rotulo">Buscar</span>
        <input className="entrada" name="q" defaultValue={valores.q} placeholder="Código, título ou autor" />
      </label>
      <label className="campo">
        <span className="rotulo">Área</span>
        <select className="entrada" name="area" defaultValue={valores.area ?? ""}>
          <option value="">Todas</option>
          {areas.map((a) => <option key={a}>{a}</option>)}
        </select>
      </label>
      <label className="campo">
        <span className="rotulo">Sala</span>
        <select className="entrada" name="sala" defaultValue={valores.sala ?? ""}>
          <option value="">Todas</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </label>
      <label className="campo">
        <span className="rotulo">Situação</span>
        <select className="entrada" name="status" defaultValue={status}>
          <option value={statusPadrao ? "todas" : ""}>Todas</option>
          {situacoes.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
      </label>
      <button className="btn" type="submit">Filtrar</button>
      {filtrando && <Link href={limpar} className="btn btn-linha">Limpar</Link>}
    </form>
  );
}
