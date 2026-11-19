"use client";
import { useActionState } from "react";
import { excluirSala, salvarSala, type EstadoSala } from "@backend/acoes/coordenacao";
import { Enviar } from "@frontend/componentes/Botao";

export function FormSala({ sala }: { sala?: { id: number; nome: string; local: string | null } }) {
  const [estado, acao] = useActionState<EstadoSala, FormData>(salvarSala, {});
  return (
    <form action={acao} className="form-grade" key={estado.ok}>
      {sala && <input type="hidden" name="id" value={sala.id} />}
      <label className="campo"><span>Nome</span><input className="entrada" name="nome" defaultValue={sala?.nome} placeholder="Sala 204" required /></label>
      <label className="campo"><span>Local <small>(opcional)</small></span><input className="entrada" name="local" defaultValue={sala?.local ?? ""} placeholder="Prédio B, 2º andar" /></label>
      {estado.erro && <div className="aviso aviso-erro" role="alert">{estado.erro}</div>}
      {estado.ok && !sala && <div className="aviso aviso-ok" role="status">{estado.ok}</div>}
      <div><Enviar>{sala ? "Salvar alterações" : "Criar sala"}</Enviar></div>
    </form>
  );
}

export function BotaoExcluirSala({ id, nome, trabalhos }: { id: number; nome: string; trabalhos: number }) {
  return (
    <form
      action={excluirSala}
      onSubmit={(e) => {
        const msg = trabalhos ? `Excluir “${nome}”? ${trabalhos} trabalho(s) ficarão sem sala.` : `Excluir “${nome}”?`;
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-perigo btn-sm" type="submit">Excluir</button>
    </form>
  );
}
