# SIPE · Avaliação de Pôsteres — FADERGS

Sistema web para a coordenação e os professores avaliarem os pôsteres do SIPE
(Salão de Iniciação Científica, Pesquisa e Extensão) pela rubrica oficial.

## Requisitos

- Node.js **22.13 ou mais novo** (usa o SQLite embutido do Node — nenhum banco para instalar)

## Rodando

```bash
npm install
npm run dev          # desenvolvimento: http://localhost:3000
```

Produção (por exemplo, num computador da faculdade durante o evento):

```bash
npm run build
npm start            # http://localhost:3000
```

> Em produção o cookie de sessão é `Secure` e só funciona em **HTTPS**.
> Para rodar em HTTP na rede local, defina `SIPE_HTTP=1` antes do `npm start`.

O banco fica em `data/sipe.db` (mude com `SIPE_DB_PATH`). **Faça cópia desse arquivo**: ele guarda usuários e avaliações.

## Primeiro uso

1. Abra o sistema: como não há usuários, ele pede para criar a **conta da coordenação**.
2. **Importar** → envie a planilha `.xls` do sistema de inscrições.
3. **Salas** → cadastre as salas.
4. **Trabalhos** → filtre (por área, por exemplo), marque os trabalhos e atribua a sala.
5. **Usuários** → cadastre cada professor; o sistema gera a senha (mostrada uma única vez).

## Regras

- Perfis: **coordenação** (tudo) e **professor** (busca por código, avalia, vê as próprias avaliações).
- Rubrica: 6 critérios, níveis *Não atingiu / Parcialmente / Plenamente* = 0 %, 50 % e 100 % do peso. Total 10.
- Cada professor tem **uma avaliação por trabalho** e pode revisá-la. A nota final é a **média** dos professores.
- Reimportar a planilha atualiza os dados sem perder salas nem avaliações. Trabalhos da aba *Excluidos* são
  removidos se ainda não tiverem avaliação.
- Trabalhos cujo link termina em `/posters/` aparecem como **Pôster não enviado**.

## Estrutura

```
backend/                        BACK-END (roda só no servidor) · import "@backend/..."
├── db.ts                       conexão SQLite, criação das tabelas e rubrica inicial
├── auth.ts                     senhas (scrypt), sessões e permissões
├── dados.ts                    consultas de trabalhos, salas, critérios + formatação de notas
├── resultados.ts               cálculo das médias e da classificação
├── importar.ts                 leitura da planilha do SIPE
├── texto.ts                    tratamento de nomes (iniciais, maiúsculas)
├── acoes/                      server actions chamadas pelos formulários
│   ├── sessao.ts               entrar, sair, primeiro acesso
│   ├── avaliacao.ts            salvar / excluir avaliação
│   └── coordenacao.ts          usuários, salas, atribuição de sala, importação
└── api/
    └── exportar.ts             geração do Excel de resultados

frontend/                       FRONT-END (visual) · import "@frontend/..."
├── estilos/globals.css         identidade visual completa
├── componentes/                peças reutilizáveis (menu, faixa, raios, anel, aviso…)
└── telas/                      formulários e tabelas de cada tela
    ├── login/  avaliacao/  importar/  usuarios/  salas/  trabalhos/

src/app/                        ROTAS (pasta exigida pelo Next.js)
├── login/ primeiro-acesso/     telas públicas
└── (app)/                      telas que exigem login
    ├── avaliar/ minhas/ projeto/[codigo]/ …        (professor)
    └── painel/ trabalhos/ salas/ usuarios/ resultados/ importar/   (coordenação)

public/brand/                   logos da FADERGS
data/sipe.db                    banco de dados (criado na primeira execução)
```

Cada arquivo em `src/app` só monta a página: busca os dados no `backend` e desenha com os componentes do `frontend`.
O pacote `server-only` impede que um arquivo do `backend` seja importado por engano em código que roda no navegador.
