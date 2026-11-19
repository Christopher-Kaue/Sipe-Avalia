"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { entrar, type Estado } from "@backend/acoes/sessao";

const IcoUsuario = () => (
  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
const IcoCadeado = () => (
  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);
const IcoOlho = ({ aberto }: { aberto: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    {!aberto && <path d="M4 4l16 16" />}
  </svg>
);

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primario btn-bloco btn-entrar" disabled={pending}>
      {pending ? <><span className="giro" aria-hidden="true" /> Entrando…</> : <>Entrar <span className="seta">→</span></>}
    </button>
  );
}

export function FormLogin() {
  const [estado, acao] = useActionState<Estado, FormData>(entrar, {});
  const [ver, setVer] = useState(false);
  const [caps, setCaps] = useState(false);
  const [tremer, setTremer] = useState(false);
  const senha = useRef<HTMLInputElement>(null);

  // erro: sacode o formulário e volta o foco para a senha
  useEffect(() => {
    if (!estado.erro) return;
    setTremer(true);
    senha.current?.focus();
    const t = setTimeout(() => setTremer(false), 450);
    return () => clearTimeout(t);
  }, [estado]);

  const verCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);

  return (
    <form action={acao} className={`form-grade${tremer ? " treme" : ""}`}>
      {estado.erro && <div className="aviso aviso-erro" role="alert">{estado.erro}</div>}

      <label className="flutuante">
        <input
          name="login"
          placeholder=" "
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={estado.login}
          required
          autoFocus
        />
        <span className="rot">Usuário</span>
        <IcoUsuario />
      </label>

      <label className="flutuante">
        <input
          ref={senha}
          name="senha"
          className="mono-senha"
          type={ver ? "text" : "password"}
          placeholder=" "
          autoComplete="current-password"
          required
          onKeyDown={verCaps}
          onKeyUp={verCaps}
          onBlur={() => setCaps(false)}
        />
        <span className="rot">Senha</span>
        <IcoCadeado />
        <button
          type="button"
          className="olho"
          onClick={() => { setVer((v) => !v); senha.current?.focus(); }}
          aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={ver}
        >
          <IcoOlho aberto={!ver} />
        </button>
      </label>
      {caps && <div className="dica-caps" role="status">⇪ Caps Lock está ativado</div>}

      <BotaoEntrar />
    </form>
  );
}
