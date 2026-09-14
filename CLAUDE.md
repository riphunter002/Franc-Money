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
│   ├── register.html / .css / .js   (cadastro)
│   ├── forgot-password.html / .js   (pedir redefinição de senha)
│   ├── reset-password.html / .js    (definir nova senha via token)
│   ├── session.js             (COMPARTILHADO: sessão, fetchWithAuth, formatação,
│   │                            menu hambúrguer mobile)
│   ├── dashboard.html / .js
│   ├── dashboard.css          (design system de TODAS as telas internas)
│   ├── transactions.html / .js
│   ├── categories.html / .js
│   ├── budgets.html / .js     (orçamentos por categoria)
│   ├── investments.html / .js (carteira + simulador de juros compostos)
│   ├── import.html / .js      (importação de fatura via CSV)
│   ├── profile.html / .js     (editar nome/e-mail/senha)
│   ├── logo-escudo.png        (logo usada no menu lateral)
│   ├── favicon.png
│   ├── manifest.json          (metadados da PWA: nome, ícone, cor)
│   ├── sw.js                  (service worker: cacheia só os arquivos estáticos)
│   ├── pwa.js                 (registra o service worker — incluído em TODA página)
│   ├── icons/                 (ícones da PWA em 192x192, 512x512 e apple-touch-icon)
│   └── screenshots/           (imagens usadas no README, não fazem parte do app)
├── src/
│   ├── config/
│   │   ├── env.js             (valida variáveis de ambiente com Zod)
│   │   ├── prisma.js
│   │   └── swagger.js
│   ├── controllers/
│   │   ├── UserController.js
│   │   ├── TransactionController.js
│   │   ├── CategoryController.js
│   │   ├── BudgetController.js
│   │   ├── ImportedTransactionController.js
│   │   ├── RecurringTransactionController.js
│   │   └── InvestmentController.js
│   ├── services/
│   │   ├── dateRangeService.js        (intervalo do mês atual em UTC, compartilhado)
│   │   ├── recurringTransactionService.js  (gera ocorrências de recorrências/parcelamentos)
│   │   ├── brapiService.js            (busca cotação na API da brapi.dev)
│   │   └── emailService.js            (envia e-mail via Resend — usado no reset de senha)
│   ├── middlewares/
│   │   ├── auth.js            (valida o JWT)
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── budgetRoutes.js
│   │   ├── importedTransactionRoutes.js
│   │   ├── recurringTransactionRoutes.js
│   │   └── investmentRoutes.js
│   └── server.js
├── .env                       (NÃO commitar)
└── package.json
```

## Convenções do projeto

- **`dashboard.css` é a folha de estilos compartilhada** de todas as telas
  internas (dashboard, transações, categorias). Estilos novos de telas internas
  vão nele, não em arquivos separados.
- **`pwa.js` registra o service worker e vai em TODA página** (login, cadastro
  e telas internas), diferente do `session.js`, que é só das telas internas.
  Ele não depende de sessão nem toca no DOM.
- **`sw.js` só cacheia arquivos estáticos** (CSS, JS, ícones) listados em
  `PRECACHE_URLS` — nunca páginas HTML nem chamadas de API, pra nunca mostrar
  dado financeiro desatualizado. Ao alterar CSS/JS, é preciso subir o
  `CACHE_NAME` (ex.: `franc-money-v2`) pra invalidar o cache antigo do
  navegador.
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

Autenticação por `Authorization: Bearer <token>` em tudo, exceto `POST /users`,
`POST /login`, `POST /forgot-password` e `POST /reset-password`.

| Método | Rota | Observação |
|---|---|---|
| POST | `/users` | Cadastro. Body: `{ name, email, password }` |
| POST | `/login` | Rate limit (5 tentativas / 15 min → 429) |
| POST | `/forgot-password` | Envia o link de redefinição por e-mail. Resposta genérica ("se existir uma conta, enviamos o link") — nunca devolve o token nem revela se o e-mail existe. Sem Gmail configurado, o link cai no console do servidor |
| POST | `/reset-password` | Define nova senha a partir do token de `/forgot-password` (uso único, expira em 1h) |
| GET | `/users` | Lista usuários (autenticado) |
| PUT | `/users/password` | Troca a senha do usuário logado, exige a senha atual |
| PUT | `/users/:id` | Atualiza nome/e-mail/senha — só o dono da conta pode |
| DELETE | `/users/:id` | Remove a conta — só o dono pode |
| GET | `/transactions` | Filtros: `type`, `startDate`, `endDate`, `page`, `limit`. Retorna `{ data, meta }` |
| POST | `/transactions` | `{ title, description?, amount, type, category_id?, date? }` |
| PUT | `/transactions/:id` | Atualização parcial |
| DELETE | `/transactions/:id` | |
| GET | `/summary` | `{ income, expense, total }` — income/expense são do mês atual, total é geral |
| GET | `/categories` | |
| POST | `/categories` | `{ name, type, color? }` — `type` é `INCOME` ou `EXPENSE`; sem `color`, escolhe uma cor automática |
| PUT | `/categories/:id` | Atualiza `name` e/ou `type` |
| DELETE | `/categories/:id` | |
| GET | `/budgets` | Lista orçamentos com o gasto já realizado no mês atual |
| POST | `/budgets` | `{ category_id, amount }` — um orçamento recorrente por categoria |
| PUT | `/budgets/:id` | `{ amount }` |
| DELETE | `/budgets/:id` | |
| GET | `/imported-transactions` | Lista linhas de CSV pendentes de revisão |
| POST | `/imported-transactions` | Importa em lote linhas de CSV já interpretadas no navegador |
| POST | `/imported-transactions/:id/confirm` | Confirma um item (com edições opcionais) e cria a transação de verdade |
| DELETE | `/imported-transactions/:id` | Descarta um item pendente sem criar transação |
| GET | `/recurring-transactions` | Lista as recorrências/parcelamentos do usuário |
| POST | `/recurring-transactions` | `{ title, amount, type, category_id?, start_date, installments_total? }` — sem `installments_total`, é recorrência sem fim; com, é parcelamento |
| DELETE | `/recurring-transactions/:id` | Cancela recorrência sem fim (não apaga transações já geradas) |
| GET | `/investments` | Lista a carteira; atualiza a cotação se estiver desatualizada (+15 min) |
| POST | `/investments` | `{ ticker, quantity, average_price }` — busca a cotação atual na hora de criar |
| PUT | `/investments/:id` | Atualiza quantidade e/ou preço médio |
| DELETE | `/investments/:id` | |

## Estado atual

**Funcionando:**
- Cadastro (com fogos de artifício na tela de boas-vindas 🎆) e login automático
  em seguida, sessão persistida em `localStorage`/`sessionStorage` (conforme o
  checkbox "Manter conectado")
- Recuperação de senha por e-mail: o `/forgot-password` envia um link (via
  Resend) que expira em 1h e é de uso único; o token vai só pro e-mail do dono,
  nunca na resposta HTTP. Também há troca de senha logado, na tela de perfil
- Perfil: editar nome, e-mail e senha
- Dashboard: cartões de resumo, gráfico de evolução do saldo e gastos por
  categoria — dados reais agregados no front a partir de `/transactions` —,
  mais o atalho "+ Nova transação" (com opção de parcelamento)
- Transações: listagem paginada, filtros, data editável, criar, editar,
  excluir e marcar como recorrente/parcelada
- Recorrências e parcelamentos: gerados sob demanda ("lazy") sempre que o
  usuário abre o app — não depende de nenhum processo rodando em segundo plano
- Importação de fatura via CSV (compatível com o formato real do Nubank e um
  formato BR genérico), com tela de revisão antes de confirmar cada linha
- Categorias: criar, listar, editar, excluir — com tipo (receita/despesa) e
  cor (escolhida automaticamente ou definida manualmente)
- Orçamentos: limite mensal recorrente por categoria, com barra de progresso
- Investimentos: carteira com cotações reais da B3 (via brapi.dev, atualizadas
  a cada 15 min) e simulador de juros compostos
- Layout responsivo (menu hambúrguer em telas pequenas)
- Instalável como app no celular (PWA): "Adicionar à tela inicial" abre em
  tela cheia, com ícone próprio, sem barra do navegador
- Logo e favicon próprios em todas as telas
- Swagger documentado em `/api-docs`
- Publicado em produção — ver seção "Produção" abaixo

O plano original de evolução (schema → cadastro → orçamentos → investimentos)
foi concluído; itens novos a partir daqui entram direto nesta lista conforme
forem implementados.

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
  próprio site), `APP_BASE_URL` (`https://franc-money.onrender.com`, usado pra
  montar o link do e-mail de reset) e `RESEND_API_KEY` (chave do Resend que
  envia o e-mail de redefinição — ver "Notas de segurança"). Opcionalmente
  `RESEND_FROM`, se um dia houver um domínio próprio verificado no Resend.
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
- **Reset de senha por e-mail**: `RESEND_API_KEY` é a chave da API do Resend
  (https://resend.com/api-keys) que envia o e-mail de redefinição. Sem ela, o
  app sobe normal e o link de reset é impresso no console do servidor em vez de
  enviado (modo de desenvolvimento). No plano gratuito do Resend SEM domínio
  próprio, o remetente é `onboarding@resend.dev` e só dá pra enviar pro e-mail
  da própria conta Resend — por isso a conta do Franc Money precisa usar o
  mesmo e-mail com que o Resend foi cadastrado. O token de reset nunca aparece
  na resposta da API, então saber o e-mail de alguém não basta pra invadir a
  conta.
