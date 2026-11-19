"use client";
import { useFormStatus } from "react-dom";

/** Botão de envio que se desabilita enquanto o formulário está sendo processado. */
export function Enviar({ children, pendente = "Salvando…", className = "btn btn-primario", disabled }: {
  children: React.ReactNode;
  pendente?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendente : children}
    </button>
  );
}
