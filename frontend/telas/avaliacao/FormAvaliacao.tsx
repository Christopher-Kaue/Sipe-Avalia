"use client";
import { useActionState, useState } from "react";
import { salvarAvaliacao, type EstadoAvaliacao } from "@backend/acoes/avaliacao";
import { Enviar } from "@frontend/componentes/Botao";

type Criterio = { id: number; nome: string; peso: number; desc_0: string; desc_1: string; desc_2: string };

const NOMES = ["Não atingiu", "Parcialmente", "Plenamente"];
const fmt = (n: number, casas = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function FormAvaliacao({ codigo, criterios, alunos, inicial, editando }: {
  codigo: string;
  criterios: Criterio[];
  alunos: string[];
  inicial: { apresentador: string; comentario: string; niveis: Record<number, number> };
  editando: boolean;
}) {
  const [estado, acao] = useActionState<EstadoAvaliacao, FormData>(salvarAvaliacao, {});
  const [niveis, setNiveis] = useState<Record<number, number>>(inicial.niveis);
  const [apresentador, setApresentador] = useState(inicial.apresentador || (alunos.length === 1 ? alunos[0] : ""));
  const [comentario, setComentario] = useState(inicial.comentario);

  const total = criterios.reduce((s, c) => s + (niveis[c.id] != null ? (c.peso * niveis[c.id]) / 2 : 0), 0);
  const feitos = criterios.filter((c) => niveis[c.id] != null).length;
  const completo = feitos === criterios.length;
  const pesoTotal = criterios.reduce((s, c) => s + c.peso, 0);

  return (
    <form action={acao}>
      <input type="hidden" name="codigo" value={codigo} />

      <fieldset className="apresentador">
        <legend className="sr-only">Apresentador(a)</legend>
        <div className="criterio-nome">
          <span className="idx" style={{ color: apresentador ? "var(--vermelho)" : undefined }}>00</span>
          <h3>Apresentador(a)</h3>
          <span className="peso">Quem apresentou o pôster · opcional</span>
        </div>
        <div className="chips">
          {alunos.map((a) => (
            <label key={a} className="chip">
              <input
                type="radio"
                name="apresentador"
                value={a}
                checked={apresentador === a}
                onChange={() => setApresentador(a)}
                // clicar de novo no nome marcado desmarca (o campo é opcional)
                onClick={() => { if (apresentador === a) setApresentador(""); }}
              />
              <span>{a}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {criterios.map((c, i) => (
        <fieldset key={c.id} className={`criterio${niveis[c.id] != null ? " feito" : ""}`}>
          <legend className="sr-only">{c.nome}</legend>
          <div className="criterio-nome">
            <span className="idx">{String(i + 1).padStart(2, "0")}</span>
            <h3>{c.nome}</h3>
            <span className="peso">vale até <b>{fmt(c.peso, 1)}</b> ponto{c.peso > 1 ? "s" : ""}</span>
          </div>
          <div className="niveis">
            {[0, 1, 2].map((n) => {
              const id = `c${c.id}-${n}`;
              return (
                <div key={n} className={`nivel n${n}`}>
                  <input
                    type="radio"
                    id={id}
                    name={`c${c.id}`}
                    value={n}
                    checked={niveis[c.id] === n}
                    onChange={() => setNiveis((v) => ({ ...v, [c.id]: n }))}
                    required
                  />
                  <label htmlFor={id}>
                    <span className="nv-topo">
                      <span className="nv-nome">{NOMES[n]}</span>
                      <span className="nv-pts">{fmt((c.peso * n) / 2)}</span>
                    </span>
                    <span className="nv-desc">{[c.desc_0, c.desc_1, c.desc_2][n]}</span>
                    <span className="barra" aria-hidden="true">
                      <i className={n >= 1 ? "on" : ""} /><i className={n >= 1 ? "on" : ""} /><i className={n >= 2 ? "on" : ""} /><i className={n >= 2 ? "on" : ""} />
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="comentario">
        <div className="criterio-nome">
          <span className="idx">✎</span>
          <h3>Comentário</h3>
          <span className="peso">Opcional · visível só para a coordenação</span>
        </div>
        <textarea className="entrada" name="comentario" maxLength={2000} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Observações sobre o trabalho ou a apresentação…" />
      </div>

      {estado.erro && <div className="aviso aviso-erro" role="alert" style={{ marginTop: 20 }}>{estado.erro}</div>}

      <div className="placar" role="status" aria-live="polite">
        <div className="placar-total">
          <strong>{fmt(total)}</strong>
          <span>/ {fmt(pesoTotal, 0)}</span>
        </div>
        <div className="placar-trilha">
          <span className="rotulo">{feitos} de {criterios.length} critérios</span>
          <div className="trilha">
            {criterios.map((c) => (
              <i key={c.id} style={{ flex: c.peso }}>
                <b style={{ width: niveis[c.id] != null ? `${niveis[c.id] * 50}%` : 0, opacity: niveis[c.id] === 0 ? 0 : 1 }} />
              </i>
            ))}
          </div>
        </div>
        <Enviar className="btn btn-primario btn-lg" disabled={!completo}>
          {editando ? "Atualizar" : "Salvar avaliação"}
        </Enviar>
      </div>
    </form>
  );
}
