"use client";
import { useActionState } from "react";
import { alterarMinhaSenha, type EstadoSenha } from "@backend/acoes/sessao";
import { Enviar } from "@frontend/componentes/Botao";

export function FormMinhaSenha({ login, minimo }: { login: string; minimo: number }) {
  const [estado, acao] = useActionState<EstadoSenha, FormData>(alterarMinhaSenha, {});
  return (
    // key: limpa os campos depois de salvar com sucesso
    <form action={acao} className="form-grade" key={estado.ok ? "ok" : "form"}>
      {/* ajuda o gerenciador de senhas do navegador a associar ao usuário certo */}
      <input type="text" name="usuario" autoComplete="username" defaultValue={login} hidden readOnly />
      {estado.ok && <div className="aviso aviso-ok" role="status">Senha alterada. Use a nova senha no próximo acesso; outros dispositivos conectados foram desconectados.</div>}
      {estado.erro && <div className="aviso aviso-erro" role="alert">{estado.erro}</div>}
      <label className="campo">
        <span>Senha atual</span>
        <input className="entrada" name="atual" type="password" autoComplete="current-password" required />
      </label>
      <label className="campo">
        <span>Nova senha</span>
        <input className="entrada" name="nova" type="password" minLength={minimo} autoComplete="new-password" required />
        <small>Pelo menos {minimo} caracteres. Dica: uma frase curta é fácil de lembrar e difícil de adivinhar.</small>
      </label>
      <label className="campo">
        <span>Confirmar nova senha</span>
        <input className="entrada" name="confirmar" type="password" minLength={minimo} autoComplete="new-password" required />
      </label>
      <Enviar pendente="Salvando…">Salvar nova senha</Enviar>
    </form>
  );
}
