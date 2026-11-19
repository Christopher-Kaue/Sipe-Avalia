import Link from "next/link";
import { Holofote } from "./Holofote";
import { Raios } from "./Raios";

/**
 * Faixa vermelha no topo de cada página (mesma linguagem do login).
 * Por padrão o primeiro bloco depois dela sobe e se sobrepõe à faixa; use `solta` para não sobrepor.
 */
export function Cabecalho({ rotulo, titulo, descricao, acoes, voltar, solta, centro, children }: {
  rotulo?: React.ReactNode;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  voltar?: { href: string; texto: string };
  solta?: boolean;
  centro?: boolean;
  children?: React.ReactNode;
}) {
  const longo = typeof titulo === "string" && titulo.length > 60;
  const cls = ["faixa", solta && "faixa-solta", centro && "faixa-centro", longo && "faixa-longa"].filter(Boolean).join(" ");
  return (
    <Holofote className={cls}>
      <Raios quantidade={24} />
      <div className="faixa-inner">
        <div className="faixa-texto">
          {voltar && <Link href={voltar.href} className="faixa-voltar">← {voltar.texto}</Link>}
          {rotulo && <span className="rotulo">{rotulo}</span>}
          <h1>{titulo}</h1>
          {descricao && <p>{descricao}</p>}
        </div>
        {acoes && <div className="faixa-acoes">{acoes}</div>}
      </div>
      {children}
    </Holofote>
  );
}
