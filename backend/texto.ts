const PEQUENAS = new Set(["da", "de", "do", "das", "dos", "e"]);

/** "Ana Paula Dominski" → "AD" */
export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter((w) => !PEQUENAS.has(w.toLowerCase()));
  if (p.length === 0) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/**
 * Padroniza nomes digitados todos em minúsculas, todos em maiúsculas ou misturados:
 * "LETICIA RAMOS DA ROSA" / "gabriela korovisk santos" → "Leticia Ramos da Rosa" / "Gabriela Korovisk Santos".
 * Nomes já bem escritos ficam como estão.
 */
export function nomeProprio(nome: string): string {
  const palavras = nome.trim().split(/\s+/);
  const bemEscrito = palavras.every((w, i) =>
    i > 0 && PEQUENAS.has(w) ? true : /^[A-ZÀ-Ý][a-zà-ÿ'’.-]*$/.test(w) || /^[A-Z]\.?$/.test(w),
  );
  if (bemEscrito) return palavras.join(" ");
  return palavras
    .map((w, i) => {
      const l = w.toLowerCase();
      return i > 0 && PEQUENAS.has(l) ? l : l.charAt(0).toUpperCase() + l.slice(1);
    })
    .join(" ");
}

/** "Prof.ª Maria Teste" → "Maria"; pula títulos como Prof., Dr., Me., Dra. */
export function primeiroNome(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return p.find((w) => !/[.ªº]$/.test(w) && !/^(prof|profa|dr|dra|me|ma|msc)$/i.test(w)) ?? p[0];
}
