import { redirect } from "next/navigation";
import { existeUsuario } from "@backend/auth";
import { LadoArte } from "@frontend/telas/login/LadoArte";
import { edicaoMaisRecente, romano } from "@backend/edicao";
import { FormPrimeiroAcesso } from "@frontend/telas/login/FormPrimeiroAcesso";

// lê o banco a cada acesso; nunca pré-renderizar no build
export const dynamic = "force-dynamic";

export const metadata = { title: "Primeiro acesso" };

export default function PrimeiroAcesso() {
  if (existeUsuario()) redirect("/login");
  const e = edicaoMaisRecente();
  return (
    <main className="login">
      <LadoArte edicao={{ ano: e.ano, numero: romano(e.numero) }} />
      <section className="login-lado">
        <div className="login-caixa">
          <span className="rotulo rotulo-vermelho">Configuração inicial</span>
          <h2>Conta da coordenação</h2>
          <p>Nenhum usuário cadastrado ainda. Crie a conta da coordenação; depois você importa a planilha e cadastra os professores.</p>
          <FormPrimeiroAcesso />
        </div>
      </section>
    </main>
  );
}
