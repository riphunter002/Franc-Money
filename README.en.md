# Franc Money

A personal finance management system — transactions, budgets, CSV bank
statement import, recurring/installment transactions, and an investment
portfolio with real B3 (Brazilian stock exchange) quotes. Full stack, from
the database to the UI, deployed to production.

🇧🇷 [Ler em português](README.md)

**🔗 Live demo:** [franc-money.onrender.com](https://franc-money.onrender.com)
(free-tier hosting — if the app is "asleep", the first load can take
30–60 seconds)

---

## About the project

I started Franc Money as a learning project: the goal was never just to have
a working app, but to genuinely understand every decision behind it — data
modeling, authentication, security, deployment. It grew from a simple
transaction CRUD into a full system, tested through real use and open for
anyone to sign up and try.

## Features

- **Full authentication** — sign up, JWT login, email-based password recovery
  (single-use token, expires in 1h), and profile editing
- **Transactions** — create, edit, delete, filter by type/period, editable
  date, pagination
- **Recurring & installment transactions** — a 12x installment purchase or a
  recurring expense like rent automatically generates future transactions
- **CSV bank statement import** — compatible with the real Nubank export
  format, with a review screen before confirming each row
- **Categories** — with type (income/expense) and color, auto-picked or set
  manually
- **Budgets** — monthly limit per category, with a progress bar
- **Investments** — portfolio with real B3 stock/REIT quotes (via brapi.dev)
  and a compound interest simulator
- **Dashboard** — financial summary and charts for balance evolution and
  spending by category
- **Installable PWA** — works as a phone app ("Add to Home Screen"), with a
  responsive layout
- **Interactive API docs** — Swagger at `/api-docs`

## Notable technical decisions

A few things worth reading the code for, beyond the feature list:

- **Security designed on purpose, not improvised.** Every authenticated route
  checks that the resource belongs to the logged-in user (`where: { id,
  user_id }` on every query), passwords use `bcrypt`, and password reset
  sends the token only by email — never in the API response — to prevent
  both account takeover and email enumeration (see `UserController.js` and
  `emailService.js`).
- **Lazy generation instead of a cron job.** Recurring transactions and
  investment quotes need to be refreshed over time, but free-tier hosting
  can't sustain a background process. The solution: generate/refresh on
  demand, at read time (`recurringTransactionService.js`, a 15-minute quote
  cache in `InvestmentController.js`) — no extra infrastructure required.
- **Dates handled in UTC end-to-end.** A real timezone bug (transactions
  showing up a day early) led to standardizing every date operation —
  comparison, monthly grouping, formatting — on UTC getters, never local
  ones.
- **A deliberately narrow service worker scope.** The PWA only caches static
  assets (CSS/JS/icons); HTML pages and API calls never go through the
  cache, so balances and transactions never show up stale.

## Stack

**Backend:** Node.js · Express 5 · PostgreSQL · Prisma 7 · JWT · bcrypt · Zod
· express-rate-limit · Swagger

**Frontend:** Plain HTML, CSS and JavaScript (no framework, no build step) —
served as static files by Express itself

**Infrastructure:** [Render](https://render.com) (auto-deploy on every push)
+ [Neon](https://neon.tech) (serverless PostgreSQL), both on the free tier

## Running locally

```bash
git clone https://github.com/riphunter002/Franc-Money.git
cd Franc-Money
npm install
```

Create a `.env` file in the project root with:

```
DATABASE_URL="postgresql://user:password@localhost:5432/franc_money"
JWT_SECRET="any-secret-string-at-least-8-characters"
BRAPI_API_TOKEN="your-brapi.dev-token"
```

Then:

```bash
npx prisma migrate dev   # creates the database tables
npm run dev              # starts the server at http://localhost:3333
```

Interactive API docs are available at `http://localhost:3333/api-docs`.

---

Built by [Lucas](https://github.com/riphunter002).
