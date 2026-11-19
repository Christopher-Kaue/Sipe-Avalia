import { exigirUsuario, SENHA_MIN } from "@backend/auth";
import { Cabecalho } from "@frontend/componentes/Cabecalho";
import { FormMinhaSenha } from "@frontend/telas/conta/FormMinhaSenha";

export const metadata = { title: "Minha senha" };

export default async function Conta() {
  const u = await exigirUsuario();
  return (
    <>
      <Cabecalho
        rotulo={u.nome}
        titulo={<>Alterar minha <em>senha</em></>}
        descricao="Troque a senha recebida da coordenação por uma que só você conhece."
      />
      <div className="folha conta">
        <div className="folha-corpo">
          <FormMinhaSenha login={u.login} minimo={SENHA_MIN} />
        </div>
      </div>
    </>
  );
}
