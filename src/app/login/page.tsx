import { redirect } from "next/navigation";
import { existeUsuario, usuarioAtual } from "@backend/auth";
import { FormLogin } from "@frontend/telas/login/FormLogin";
import { LadoArte } from "@frontend/telas/login/LadoArte";
import { edicaoMaisRecente, romano } from "@backend/edicao";

// lê o banco a cada acesso; nunca pré-renderizar no build
export const dynamic = "force-dynamic";

export const metadata = { title: "Entrar" };

function saudacao(): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function Login() {
  if (!existeUsuario()) redirect("/primeiro-acesso");
  if (await usuarioAtual()) redirect("/");
  const e = edicaoMaisRecente();
  return (
    <main className="login">
      <LadoArte edicao={{ ano: e.ano, numero: romano(e.numero) }} />
      <section className="login-lado">
        <div className="login-caixa">
          <img className="login-escudo" src="/brand/fadergs-escudo.png" alt="" width={44} height={44} />
          <span className="rotulo rotulo-vermelho">Acesso restrito · SIPE {e.ano}</span>
          <h2>{saudacao()}, <em>avaliador(a)</em></h2>
          <p>Entre com o usuário e a senha recebidos da coordenação.</p>
          <div>
            <FormLogin />
            <p className="login-ajuda">Esqueceu a senha? A coordenação gera uma nova para você.</p>
            <div className="login-rodape">
              <span>FADERGS Centro Universitário</span>
              <span>Uso restrito à coordenação e aos professores</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
