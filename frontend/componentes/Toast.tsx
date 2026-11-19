"use client";
import { useEffect, useState } from "react";

/** Aviso flutuante que some sozinho e limpa o parâmetro da URL (para não reaparecer ao recarregar). */
export function Toast({ titulo, texto }: { titulo: string; texto?: React.ReactNode }) {
  const [saindo, setSaindo] = useState(false);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    // tira o ?salvo=1 da barra de endereço sem recarregar a página (senão o aviso some na hora)
    window.history.replaceState(null, "", window.location.pathname);
    const t1 = setTimeout(() => setSaindo(true), 4200);
    const t2 = setTimeout(() => setFechado(true), 4700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fechado) return null;
  return (
    <div className={`toast${saindo ? " saindo" : ""}`} role="status">
      <span className="toast-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
      </span>
      <div>
        <strong>{titulo}</strong>
        {texto && <p>{texto}</p>}
      </div>
      <button type="button" aria-label="Fechar" onClick={() => setSaindo(true)}>×</button>
      <i className="toast-tempo" aria-hidden="true" />
    </div>
  );
}
