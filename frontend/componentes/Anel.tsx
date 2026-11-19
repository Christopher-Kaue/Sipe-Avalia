import { Contador } from "./Contador";

/** Anel de progresso (0–100). */
export function Anel({ pct, rotulo, detalhe }: { pct: number; rotulo: string; detalhe?: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="anel" role="img" aria-label={`${rotulo}: ${pct}%`}>
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={r} className="anel-fundo" />
        <circle
          cx="64"
          cy="64"
          r={r}
          className="anel-valor"
          style={{ strokeDasharray: c, "--fim": c * (1 - Math.min(100, Math.max(0, pct)) / 100) } as React.CSSProperties}
        />
      </svg>
      <div className="anel-centro">
        <strong><Contador valor={pct} sufixo="%" /></strong>
        <span>{rotulo}</span>
      </div>
      {detalhe && <small>{detalhe}</small>}
    </div>
  );
}
