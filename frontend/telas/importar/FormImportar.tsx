"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { importar, type EstadoImportacao } from "@backend/acoes/coordenacao";
import { Enviar } from "@frontend/componentes/Botao";

export function FormImportar() {
  const [estado, acao] = useActionState<EstadoImportacao, FormData>(importar, {});
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const r = estado.resultado;
  // o React limpa o formulário depois de cada envio; o nome exibido precisa acompanhar
  useEffect(() => setArquivo(null), [estado]);

  return (
    <form action={acao} className="form-grade">
      <label
        className={`soltar${arrastando ? " ativo" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const input = e.currentTarget.querySelector("input");
          if (input && e.dataTransfer.files.length) {
            input.files = e.dataTransfer.files;
            setArquivo(e.dataTransfer.files[0].name);
          }
        }}
      >
        <input type="file" name="planilha" accept=".xls,.xlsx,.csv" onChange={(e) => setArquivo(e.target.files?.[0]?.name ?? null)} />
        <span className="rotulo">Planilha do SIPE</span>
        <strong>{arquivo ? "Arquivo pronto para enviar" : "Arraste a planilha aqui"}</strong>
        {arquivo ? <span className="arquivo">{arquivo}</span> : <span className="pequeno discreto">ou clique para escolher · .xls, .xlsx ou .csv</span>}
      </label>

      {estado.erro && <div className="aviso aviso-erro" role="alert">{estado.erro}</div>}

      {r && (
        <div>
          <div className="aviso aviso-ok" role="status">Planilha <b>{estado.arquivo}</b> importada.</div>
          <div className="relatorio">
            <div><span className="rotulo">Lidos</span><strong>{r.lidos}</strong></div>
            <div><span className="rotulo">Novos</span><strong>{r.novos}</strong></div>
            <div><span className="rotulo">Atualizados</span><strong>{r.atualizados}</strong></div>
            <div><span className="rotulo">Removidos</span><strong>{r.removidos}</strong></div>
            <div><span className="rotulo">Sem pôster</span><strong>{r.semPoster}</strong></div>
          </div>
          {r.ignorados.length > 0 && (
            <details className="dobra">
              <summary>{r.ignorados.length} linha(s) ignorada(s)</summary>
              <ul className="pequeno discreto">
                {r.ignorados.map((i) => <li key={i.linha}>Linha {i.linha}: {i.motivo}</li>)}
              </ul>
            </details>
          )}
          <p style={{ marginTop: 16 }}><Link href="/trabalhos?status=sem-sala">Próximo passo: atribuir as salas →</Link></p>
        </div>
      )}

      <Enviar className="btn btn-primario btn-lg" pendente="Importando…" disabled={!arquivo}>Importar planilha</Enviar>
    </form>
  );
}
