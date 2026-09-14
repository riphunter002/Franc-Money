# Franc Money

Sistema de gestão de finanças pessoais — transações, orçamentos, importação
de fatura via CSV, transações recorrentes/parceladas e uma carteira de
investimentos com cotação real da B3. Full stack, do banco de dados à
interface, publicado em produção.

🇬🇧 [Read this in English](README.en.md)

**🔗 Demo ao vivo:** [franc-money.onrender.com](https://franc-money.onrender.com)
(hospedagem gratuita — se o app estiver "dormindo", o primeiro carregamento
pode levar de 30 a 60 segundos)

---

## Sobre o projeto

Comecei o Franc Money como projeto de aprendizado: a meta não era só ter um
app funcionando, mas entender de verdade cada decisão por trás dele —
modelagem de dados, autenticação, segurança, deploy. Ele evoluiu de um CRUD
simples de transações para um sistema completo, testado em uso real e aberto
a qualquer pessoa criar uma conta e experimentar.

## Funcionalidades

- **Autenticação completa** — cadastro, login com JWT, recuperação de senha
  por e-mail (token de uso único, expira em 1h) e edição de perfil
- **Transações** — criar, editar, excluir, filtrar por tipo/período, com data
  editável e paginação
- **Recorrências e parcelamentos** — uma compra parcelada em 12x, ou uma
  despesa recorrente como aluguel, geram as transações futuras automaticamente
- **Importação de fatura via CSV** — compatível com o formato real do Nubank,
  com tela de revisão antes de confirmar cada linha
- **Categorias** — com tipo (receita/despesa) e cor, escolhida automaticamente
  ou definida à mão
- **Orçamentos** — limite mensal por categoria, com barra de progresso
- **Investimentos** — carteira com cotação real de ações/FIIs da B3 (via
  brapi.dev) e um simulador de juros compostos
- **Dashboard** — resumo financeiro e gráficos de evolução de saldo e gastos
  por categoria
- **PWA instalável** — funciona como app no celular ("Adicionar à tela
  inicial"), com layout responsivo
- **Documentação interativa da API** — Swagger em `/api-docs`

## Decisões técnicas de destaque

Alguns pontos que valem a leitura do código, não só a lista de features:

- **Segurança pensada de propósito, não improvisada.** Toda rota autenticada
  confere se o recurso pertence a quem está logado (`where: { id, user_id }`
  em cada consulta), senhas usam `bcrypt`, e a redefinição de senha manda o
  token só por e-mail — nunca na resposta da API — pra impedir tanto que
  alguém sequestre a conta de outra pessoa quanto que descubra quais e-mails
  têm conta (ver `UserController.js` e `emailService.js`).
- **Geração "preguiçosa" em vez de cron job.** Transações recorrentes e
  cotações de investimentos precisam ser atualizadas com o tempo, mas a
  hospedagem gratuita não sustenta um processo rodando em segundo plano. A
  solução: gerar/atualizar sob demanda, no momento em que os dados são lidos
  (`recurringTransactionService.js`, cotação com cache de 15 min em
  `InvestmentController.js`) — sem depender de infraestrutura extra.
- **Datas tratadas em UTC de ponta a ponta.** Um bug real de fuso horário
  (transações aparecendo um dia adiantadas) levou a padronizar toda
  manipulação de data — comparação, agrupamento por mês, formatação — usando
  getters UTC, nunca locais.
- **Service worker com escopo deliberadamente pequeno.** A PWA cacheia só
  arquivos estáticos (CSS/JS/ícones); páginas HTML e chamadas de API nunca
  passam pelo cache, pra nunca mostrar saldo ou transação desatualizada.

## Stack

**Backend:** Node.js · Express 5 · PostgreSQL · Prisma 7 · JWT · bcrypt · Zod
· express-rate-limit · Swagger

**Frontend:** HTML, CSS e JavaScript puro (sem framework, sem build step) —
servido como arquivos estáticos pelo próprio Express

**Infraestrutura:** [Render](https://render.com) (deploy automático a cada
push) + [Neon](https://neon.tech) (PostgreSQL serverless), ambos free tier

## Como rodar localmente

```bash
git clone https://github.com/riphunter002/Franc-Money.git
cd Franc-Money
npm install
```

Crie um arquivo `.env` na raiz com:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/franc_money"
JWT_SECRET="qualquer-string-secreta-com-pelo-menos-8-caracteres"
BRAPI_API_TOKEN="seu-token-da-brapi.dev"
```

Depois:

```bash
npx prisma migrate dev   # cria as tabelas no banco
npm run dev              # sobe o servidor em http://localhost:3333
```

A documentação interativa da API fica em `http://localhost:3333/api-docs`.

---

Feito por [Lucas](https://github.com/riphunter002).
