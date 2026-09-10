# Franc Money

Sistema de gestão de finanças pessoais. Projeto de aprendizado — o objetivo é
que eu (o dono do projeto) **entenda** o código, não apenas que ele funcione.

## Como quero trabalhar

Estou começando na programação e este é meu primeiro projeto desafiador.
Por isso, ao me ajudar:

- **Explique antes de editar**, não depois. Diga o que pretende mudar e por quê.
- Faça **mudanças pequenas e temáticas**. Prefira vários passos revisáveis a uma
  grande alteração de uma vez.
- Quando houver mais de um caminho possível, **me mostre as opções e o trade-off**
  antes de escolher por mim.
- Se eu pedir algo que vai gerar retrabalho ou que tem um problema que eu não
  enxerguei, **me avise** em vez de só executar.
- Comente o código onde a intenção não for óbvia, mas sem poluir.
- Escreva em **português do Brasil** (código, comentários e conversa).

## Stack

**Backend**
- Node.js + Express 5
- PostgreSQL + Prisma 7 (adapter `@prisma/adapter-pg`)
- Autenticação: JWT (`jsonwebtoken`) + `bcrypt`
- Validação: Zod
- Rate limiting: `express-rate-limit`
- Documentação: Swagger (`swagger-jsdoc` + `swagger-ui-express`) em `/api-docs`

**Frontend**
- HTML + CSS + JavaScript puro (sem framework, sem build step)
- Servido como arquivos estáticos pelo próprio Express, a partir de `/public`
- Front e backend na mesma origem → chamadas `fetch` usam caminho relativo

## Estrutura

```
Franc Money/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/                    ← frontend
│   ├── index.html             (login)
│   ├── style.css              (estilos do login)
│   ├── auth.js                (lógica do login)
│   ├── session.js             (COMPARTILHADO: sessão, fetchWithAuth, formatação)
│   ├── dashboard.html
│   ├── dashboard.css          (design system de TODAS as telas internas)
│   ├── dashboard.js
│   ├── transactions.html
│   ├── transactions.js
│   ├── categories.html
│   └── categories.js
├── src/
│   ├── config/
│   │   ├── env.js             (valida variáveis de ambiente com Zod)
│   │   ├── prisma.js
│   │   └── swagger.js
│   ├── controllers/
│   │   ├── UserController.js
│   │   ├── TransactionController.js
│   │   └── CategoryController.js
│   ├── middlewares/
│   │   ├── auth.js            (valida o JWT)
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── categoryRoutes.js
│   └── server.js
├── .env                       (NÃO commitar)
└── package.json
```

## Convenções do projeto

- **`dashboard.css` é a folha de estilos compartilhada** de todas as telas
  internas (dashboard, transações, categorias). Estilos novos de telas internas
  vão nele, não em arquivos separados.
- **`session.js` guarda tudo que é compartilhado entre telas autenticadas**:
  `getStoredAuth`, `clearStoredAuth`, `goToLogin`, `fetchWithAuth`,
  `currencyFormatter`, `dateFormatter`, `escapeHtml`, `extractErrorMessage`.
  Sempre incluir `<script src="session.js">` ANTES do script da página.
- Toda tela interna começa checando `getStoredAuth()`; sem token, redireciona
  para o login.
- `fetchWithAuth` já injeta o header `Authorization` e trata 401 (sessão
  expirada) redirecionando para o login.
- O modal de transação é **um só formulário para criar e editar**: se o campo
  oculto `txId` tem valor, faz `PUT`; se não, faz `POST`.
- Listas dinâmicas usam **delegação de eventos** (um listener no container), não
  um listener por botão.
- Texto vindo do banco passa por `escapeHtml` antes de ir para `innerHTML`.

## API

Autenticação por `Authorization: Bearer <token>` em tudo, exceto `POST /users` e
`POST /login`.

| Método | Rota | Observação |
|---|---|---|
| POST | `/users` | Cadastro. Body: `{ name, email, password }` |
| POST | `/login` | Tem rate limit (5 tentativas / 15 min → 429) |
| GET | `/transactions` | Filtros: `type`, `startDate`, `endDate`, `page`, `limit`. Retorna `{ data, meta }` |
| POST | `/transactions` | `{ title, description?, amount, type, category_id? }` |
| PUT | `/transactions/:id` | Atualização parcial |
| DELETE | `/transactions/:id` | |
| GET | `/summary` | Retorna `{ income, expense, total }` |
| GET | `/categories` | |
| POST | `/categories` | `{ name }` |
| DELETE | `/categories/:id` | |

## Estado atual

**Funcionando:**
- Login com JWT, sessão persistida em `localStorage`/`sessionStorage`
  (conforme o checkbox "Manter conectado")
- Dashboard: cartões de resumo, gráfico de evolução do saldo e gastos por
  categoria — todos com dados reais (agregados no front a partir de
  `/transactions`, já que a API não tem endpoint de agregação por período)
- Transações: listagem paginada, filtros, criar, editar e excluir
- Categorias: criar, listar e excluir
- Swagger documentado em `/api-docs`

**Ainda não existe:**
- Tela de cadastro de usuário (só dá para criar conta via Swagger/curl)
- Recuperação de senha (o link existe no login, mas não leva a nada)
- Tela de perfil (editar nome, e-mail, senha)
- Escolher a data da transação (o schema usa `@default(now())`, então tudo
  entra com a data de hoje — **esta é a limitação mais incômoda hoje**)
- Categorias não têm tipo (receita/despesa) nem cor
- Orçamentos, transações recorrentes, exportação de relatórios
- Investimentos

## Plano de evolução

A ordem foi escolhida para **minimizar retrabalho**: mudanças de schema são as
mais caras (exigem migration + ajuste em controllers + ajuste nas telas), então
são agrupadas primeiro; telas novas e isoladas ficam para depois.

**Etapa 1 — Mudanças de schema (uma migration só)**
- Campo `date` editável nas transações (hoje é sempre "agora")
- `type` e `color` em `Category`
- Possivelmente já criar a tabela `Budget` (orçamentos), para não precisar de
  outra migration depois
- Atenção: adicionar campo obrigatório em tabela com dados existentes exige
  definir um valor padrão na migration

**Etapa 2 — Tela de cadastro de usuário**
Não toca no banco nem nos controllers (a rota `POST /users` já existe).
Reaproveita `style.css` do login.

**Etapa 3 — Orçamentos por categoria**
Limite mensal por categoria, com barra de progresso e alerta ao estourar.

**Etapa 4 — Investimentos**
Deixado por último: é o maior, é isolado (não quebra o que existe) e o escopo
tende a mudar conforme o app for usado. Começar pela **projeção** (juros
compostos — matemática pura, sem API externa) antes de pensar em cotações reais.

## Comandos

```bash
npm run dev                  # sobe o servidor (nodemon) na porta 3333
npx prisma migrate dev       # cria e aplica uma migration
npx prisma studio            # interface visual para inspecionar o banco
```

Depois de `npm run dev`, o app fica em `http://localhost:3333/` e a documentação
da API em `http://localhost:3333/api-docs`.

## Produção

O app está publicado em **https://franc-money.onrender.com**.

- **Servidor**: hospedado no [Render](https://render.com) (plano gratuito),
  serviço `franc-money`, conectado ao repositório do GitHub na branch `main`.
- **Banco de dados**: PostgreSQL no [Neon](https://neon.tech) (plano
  gratuito) — **totalmente separado** do banco local de desenvolvimento.
  Dados criados localmente (`npm run dev`) não aparecem em produção, e
  vice-versa.
- **Deploy**: automático — todo `git push` na branch `main` dispara um novo
  deploy no Render (build + restart sozinho, não precisa fazer nada manual).
  - Build command: `npm install && npm run build` (`build` roda
    `prisma generate` e `prisma migrate deploy` — qualquer migration nova
    já é aplicada no banco de produção automaticamente a cada deploy)
  - Start command: `npm start` (`node src/server.js`, diferente do `npm run
    dev` local, que usa nodemon)
- **Variáveis de ambiente**: configuradas direto no painel do Render (aba
  "Environment" do serviço), **não** vêm do `.env` local. Precisa ter:
  `DATABASE_URL` (string de conexão do Neon), `JWT_SECRET` (gerado à parte,
  diferente do usado localmente), `BRAPI_API_TOKEN`, `ALLOWED_ORIGIN`
  (definido como `https://franc-money.onrender.com`, restringe o CORS só ao
  próprio site).
- **"Sono" por inatividade**: tanto o Render quanto o Neon, no plano
  gratuito, hibernam depois de um tempo sem uso. A primeira visita depois
  disso demora uns 30-60 segundos pra acordar — normal do plano gratuito,
  não é bug.

## Notas de segurança

- `.env` contém `DATABASE_URL` e `JWT_SECRET` — **nunca commitar**. Conferir se
  está no `.gitignore`.
- Trocar o `JWT_SECRET` invalida todos os tokens já emitidos (desloga todo mundo).
  Isso é esperado; é uma ação deliberada, não algo para automatizar.
- `ALLOWED_ORIGIN` no `.env` restringe o CORS. Sem essa variável, qualquer origem
  é aceita — aceitável em desenvolvimento, deve ser definido antes de publicar.
