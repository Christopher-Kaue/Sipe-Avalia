"use client";
import { useActionState } from "react";
import { criarEdicao, type EstadoEdicao } from "@backend/acoes/edicoes";
import { Enviar } from "@frontend/componentes/Botao";

export function FormNovaEdicao({ ano, numero, anterior }: { ano: number; numero: number; anterior?: { ano: number; salas: number } }) {
  const [estado, acao] = useActionState<EstadoEdicao, FormData>(criarEdicao, {});
  return (
    <form action={acao} className="form-grade">
      <div className="form-duas">
        <label className="campo">
          <span>Ano</span>
          <input className="entrada" name="ano" type="number" min={2000} max={2100} defaultValue={ano} required />
        </label>
        <label className="campo">
          <span>Nº da edição</span>
          <input className="entrada" name="numero" type="number" min={1} max={200} defaultValue={numero} required />
          <small>Ex.: 14 → “XIV Edição”</small>
        </label>
      </div>
      {anterior && (
        <>
          <label className="marcar-linha">
            <input type="checkbox" className="marcar" name="copiar_salas" defaultChecked={anterior.salas > 0} disabled={anterior.salas === 0} />
            <span>Copiar as salas de {anterior.ano}{anterior.salas ? ` (${anterior.salas})` : " (nenhuma cadastrada)"}</span>
          </label>
          <label className="marcar-linha">
            <input type="checkbox" className="marcar" name="encerrar_anterior" defaultChecked />
            <span>Encerrar {anterior.ano}: as notas ficam congeladas e ninguém altera mais nada</span>
          </label>
        </>
      )}
      {estado.erro && <div className="aviso aviso-erro" role="alert">{estado.erro}</div>}
      <Enviar pendente="Criando…">Criar edição e abrir →</Enviar>
    </form>
  );
}
