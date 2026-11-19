"use client";
import { useActionState, useEffect, useRef } from "react";
import { alternarAtivo, excluirUsuario, gerenciarUsuario, type EstadoUsuarios } from "@backend/acoes/coordenacao";
import { Enviar } from "@frontend/componentes/Botao";
import { Raios } from "@frontend/componentes/Raios";

export type LinhaUsuario = { id: number; nome: string; login: string; perfil: "coordenacao" | "professor"; ativo: number; avaliacoes: number };

export function PainelUsuarios({ usuarios, euId }: { usuarios: LinhaUsuario[]; euId: number }) {
  const [estado, acao] = useActionState<EstadoUsuarios, FormData>(gerenciarUsuario, {});
  const topo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (estado.credencial) topo.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [estado]);

  const c = estado.credencial;
  const professores = usuarios.filter((u) => u.perfil === "professor").length;

  return (
    <div className="form-grade" style={{ gap: 28 }}>
      <div ref={topo}>
        {c && (
          <div className="credencial">
            <Raios origem="superior-direito" quantidade={14} />
            <span className="rotulo">{c.nova ? "Acesso criado" : c.definida ? "Senha alterada" : "Nova senha gerada"} · {c.nome}</span>
            <div className="par">
              <div><span className="rotulo">Usuário</span><div className="valor">{c.login}</div></div>
              <div><span className="rotulo">Senha</span><div className="valor senha">{c.senha}</div></div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: "var(--papel)", color: "var(--vinho)" }}
                onClick={() => navigator.clipboard?.writeText(`Usuário: ${c.login}\nSenha: ${c.senha}`)}
              >
                Copiar usuário e senha
              </button>
              <p>Esta senha não será exibida de novo. Se perder, defina ou gere outra. A pessoa pode trocá-la depois em “Alterar minha senha”.</p>
            </div>
          </div>
        )}
        {estado.erro && <div className="aviso aviso-erro" role="alert">{estado.erro}</div>}
      </div>

      <div className="folha">
        <div className="folha-cab"><h2>Novo acesso</h2></div>
        <form action={acao} className="folha-corpo">
          <input type="hidden" name="op" value="criar" />
          <div className="form-linha">
            <label className="campo"><span>Nome</span><input className="entrada" name="nome" placeholder="Prof.ª Maria Silva" required /></label>
            <label className="campo"><span>Usuário</span><input className="entrada" name="login" placeholder="maria.silva" autoCapitalize="none" required /></label>
            <label className="campo">
              <span>Perfil</span>
              <select className="entrada" name="perfil" defaultValue="professor">
                <option value="professor">Professor(a) avaliador(a)</option>
                <option value="coordenacao">Coordenação</option>
              </select>
            </label>
            <label className="campo">
              <span>Senha <small>(opcional)</small></span>
              <input className="entrada" name="senha" type="text" minLength={8} autoComplete="off" spellCheck={false} placeholder="Vazio = gerar uma aleatória" />
            </label>
            <Enviar pendente="Cadastrando…">Cadastrar</Enviar>
          </div>
        </form>
      </div>

      <div className="folha">
        <div className="folha-cab">
          <h2>Acessos cadastrados</h2>
          <span className="discreto pequeno">{professores} professor(es) · {usuarios.length - professores} da coordenação</span>
        </div>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th className="dir">Avaliações</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 500 }}>{u.nome}{u.id === euId && <span className="discreto pequeno"> (você)</span>}</td>
                  <td className="mono pequeno">{u.login}</td>
                  <td>{u.perfil === "coordenacao" ? "Coordenação" : "Professor(a)"}</td>
                  <td className="dir num">{u.avaliacoes}</td>
                  <td>{u.ativo ? <span className="selo selo-ok">Ativo</span> : <span className="selo">Desativado</span>}</td>
                  <td>
                    <div className="linha-acoes">
                      <details className="senha-pop">
                        <summary className="btn btn-linha btn-sm">Senha</summary>
                        <form
                          action={acao}
                          className="senha-pop-corpo"
                          onSubmit={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); }}
                        >
                          <input type="hidden" name="op" value="senha" />
                          <input type="hidden" name="id" value={u.id} />
                          <span className="rotulo">Senha de {u.nome.split(" ")[0]}</span>
                          <input className="entrada" name="senha" type="text" autoComplete="off" spellCheck={false} placeholder="Digite a nova senha (mín. 8)" />
                          <div className="senha-pop-botoes">
                            <button className="btn btn-primario btn-sm" type="submit" name="modo" value="definir">Definir esta senha</button>
                            <button className="btn btn-linha btn-sm" type="submit" name="modo" value="gerar">Gerar aleatória</button>
                          </div>
                          <small>A pessoa é desconectada e passa a entrar com a nova senha.</small>
                        </form>
                      </details>
                      {u.id !== euId && (
                        <form action={alternarAtivo}>
                          <input type="hidden" name="id" value={u.id} />
                          <button className="btn btn-linha btn-sm" type="submit">{u.ativo ? "Desativar" : "Reativar"}</button>
                        </form>
                      )}
                      {u.id !== euId && u.avaliacoes === 0 && (
                        <form action={excluirUsuario} onSubmit={(e) => { if (!confirm(`Excluir o acesso de ${u.nome}?`)) e.preventDefault(); }}>
                          <input type="hidden" name="id" value={u.id} />
                          <button className="btn btn-perigo btn-sm" type="submit">Excluir</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
