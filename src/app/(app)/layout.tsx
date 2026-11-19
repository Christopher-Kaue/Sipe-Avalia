import Link from "next/link";
import { exigirUsuario } from "@backend/auth";
import { iniciais } from "@backend/texto";
import { Nav } from "@frontend/componentes/Nav";
import { MenuUsuario } from "@frontend/componentes/MenuUsuario";
import { sair } from "@backend/acoes/sessao";
import { trocarEdicao } from "@backend/acoes/edicoes";
import { edicaoMaisRecente, edicaoSelecionada, edicoes, romano, type Edicao } from "@backend/edicao";
import { SeletorEdicao } from "@frontend/componentes/SeletorEdicao";
import { Enviar } from "@frontend/componentes/Botao";

const opcao = (e: Edicao) => ({ ano: e.ano, numero: romano(e.numero), encerrada: !!e.encerrada });

const ITENS_COORD = [
  { href: "/painel", rotulo: "Painel" },
  { href: "/avaliar", rotulo: "Avaliar" },
  { href: "/trabalhos", rotulo: "Trabalhos" },
  { href: "/salas", rotulo: "Salas" },
  { href: "/usuarios", rotulo: "Usuários" },
  { href: "/resultados", rotulo: "Resultados" },
  { href: "/relatorio", rotulo: "Relatório" },
  { href: "/importar", rotulo: "Importar" },
];
const ITENS_PROF = [
  { href: "/avaliar", rotulo: "Avaliar" },
  { href: "/minhas", rotulo: "Minhas avaliações" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await exigirUsuario();
  const coord = u.perfil === "coordenacao";
  const edicao = await edicaoSelecionada();
  const recente = edicaoMaisRecente();
  const antiga = edicao.id !== recente.id;
  return (
    <div className="casca">
      <header className="topo">
        <div className="topo-inner">
          <div className="marca">
            <Link href="/" aria-label="Início"><img src="/brand/fadergs-logo-branco.png" alt="FADERGS" width={150} height={30} /></Link>
            {coord
              ? <SeletorEdicao atual={opcao(edicao)} opcoes={edicoes().map(opcao)} trocar={trocarEdicao} />
              : <SeletorEdicao atual={opcao(edicao)} />}
          </div>
          <Nav itens={coord ? ITENS_COORD : ITENS_PROF} />
          <MenuUsuario
            nome={u.nome}
            login={u.login}
            perfil={coord ? "Coordenação" : "Avaliador(a)"}
            iniciais={iniciais(u.nome)}
            sair={sair}
          />
        </div>
      </header>
      {coord && (antiga || !!edicao.encerrada) && (
        <div className={`faixa-edicao${antiga ? " antiga" : ""}`} role="status">
          <span>
            {antiga ? <>Você está vendo o <b>SIPE {edicao.ano}</b> ({romano(edicao.numero)} Edição)</> : <>A edição <b>{edicao.ano}</b> está encerrada</>}
            {edicao.encerrada ? (antiga ? " · encerrada, só consulta" : " · as notas estão congeladas") : ""}
          </span>
          {antiga && (
            <form action={trocarEdicao}>
              <input type="hidden" name="ano" value={recente.ano} />
              <input type="hidden" name="caminho" value="/painel" />
              <Enviar className="btn btn-sm" pendente="Trocando…">Voltar para {recente.ano} →</Enviar>
            </form>
          )}
        </div>
      )}
      <main className="palco">{children}</main>
      <footer className="rodape">
        <img src="/brand/fadergs-escudo.png" alt="" width={18} height={18} />
        FADERGS Centro Universitário · SIPE — Salão de Iniciação Científica, Pesquisa e Extensão
      </footer>
    </div>
  );
}
