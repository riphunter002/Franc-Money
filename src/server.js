const express = require('express');
// 🛡️ A validação do ambiente DEVE acontecer antes da aplicação subir
const env = require('./config/env');
const path = require('path');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const importedTransactionRoutes = require('./routes/importedTransactionRoutes');
const recurringTransactionRoutes = require('./routes/recurringTransactionRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

const app = express();

// CORS: em produção, defina ALLOWED_ORIGIN no .env com o domínio real do front
// (ex.: "https://francmoney.com"). Sem essa variável, libera qualquer origem —
// bom para desenvolvimento local, mas não recomendado depois do deploy.
const allowedOrigins =
  env.ALLOWED_ORIGIN === '*'
    ? true
    : env.ALLOWED_ORIGIN.split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// 📁 Serve o front-end (index.html, dashboard.html, .css, .js) a partir de /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// 🌟 O SWAGGER DEVE VIR AQUI (Antes de qualquer rota protegida)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas da API
app.use(userRoutes);
app.use(transactionRoutes);
app.use(categoryRoutes);
app.use(budgetRoutes);
app.use(importedTransactionRoutes);
app.use(recurringTransactionRoutes);

// Middleware global de erros
app.use(errorHandler);

app.listen(3333, () => {
  console.log('Servidor iniciado na porta 3333');
});
