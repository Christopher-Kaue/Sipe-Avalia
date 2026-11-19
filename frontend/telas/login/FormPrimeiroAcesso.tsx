"use client";
import { useActionState } from "react";
import { primeiroAcesso, type Estado } from "@backend/acoes/sessao";
import { Enviar } from "@frontend/componentes/Botao";

export function FormPrimeiroAcesso() {
  const [estado, acao] = useActionState<Estado, FormData>(primeiroAcesso, {});
  return (
    <form action={acao} className="form-grade">
      {estado.erro && <div className="aviso aviso-erro" role="alert">{estado.erro}</div>}
      <label className="campo"><span>Seu nome</span><input className="entrada" name="nome" required autoFocus /></label>
      <label className="campo">
        <span>Usuário</span>
        <input className="entrada" name="login" autoCapitalize="none" defaultValue={estado.login} required />
        <small>Ex.: seu e-mail institucional.</small>
      </label>
      <label className="campo"><span>Senha</span><input className="entrada" name="senha" type="password" minLength={8} autoComplete="new-password" required /></label>
      <label className="campo"><span>Confirmar senha</span><input className="entrada" name="confirmar" type="password" minLength={8} autoComplete="new-password" required /></label>
      <Enviar className="btn btn-primario btn-lg btn-bloco" pendente="Criando…">Criar conta da coordenação <span className="seta">→</span></Enviar>
    </form>
  );
}
