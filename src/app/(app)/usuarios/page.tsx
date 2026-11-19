import { exigirCoordenacao } from "@backend/auth";
import { all } from "@backend/db";
import { PainelUsuarios, type LinhaUsuario } from "@frontend/telas/usuarios/PainelUsuarios";
import { Cabecalho } from "@frontend/componentes/Cabecalho";

export const metadata = { title: "Usuários" };

export default async function Usuarios() {
  const eu = await exigirCoordenacao();
  const usuarios = all<LinhaUsuario>(
    `SELECT u.id, u.nome, u.login, u.perfil, u.ativo, COUNT(a.id) AS avaliacoes
       FROM usuarios u LEFT JOIN avaliacoes a ON a.avaliador_id = u.id
      GROUP BY u.id ORDER BY u.perfil, u.nome COLLATE NOCASE`,
  );
  return (
    <>
      <Cabecalho
        rotulo="Coordenação"
        titulo={<>Acessos e <em>senhas</em></>}
        descricao="Cadastre os professores avaliadores. Você pode definir a senha ou deixar o sistema gerar uma; anote e entregue à pessoa, ela só aparece uma vez. Cada um pode trocá-la depois em “Alterar minha senha”."
      />
      <PainelUsuarios usuarios={usuarios} euId={eu.id} />
    </>
  );
}
