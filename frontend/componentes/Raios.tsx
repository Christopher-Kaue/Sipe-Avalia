/** Raios saindo do canto, como no escudo da FADERGS. Puramente decorativo. */
export function Raios({ origem = "inferior-esquerdo" as "inferior-esquerdo" | "superior-direito", quantidade = 22 }) {
  const linhas = Array.from({ length: quantidade }, (_, i) => {
    const t = i / (quantidade - 1);
    const ang = (-4 - t * 82) * (Math.PI / 180);
    const largura = 1 + ((i * 7) % 5) * 1.4;
    return { x: Math.cos(ang) * 2600, y: Math.sin(ang) * 2600, largura };
  });
  const [ox, oy, flip] = origem === "inferior-esquerdo" ? [0, 1000, 1] : [1000, 0, -1];
  return (
    <svg className="raios" viewBox="0 0 1000 1000" preserveAspectRatio="xMinYMax slice" aria-hidden="true">
      {linhas.map((l, i) => (
        <line key={i} x1={ox} y1={oy} x2={ox + l.x * flip} y2={oy + l.y * flip} strokeWidth={l.largura} style={{ "--i": i } as React.CSSProperties} />
      ))}
    </svg>
  );
}
