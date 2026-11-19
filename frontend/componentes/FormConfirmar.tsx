"use client";

/** Formulário que pede confirmação antes de enviar uma ação destrutiva. */
export function FormConfirmar({ action, mensagem, children }: {
  action: (fd: FormData) => void | Promise<void>;
  mensagem: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(mensagem)) e.preventDefault(); }}>
      {children}
    </form>
  );
}
