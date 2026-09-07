const express = require('express');
const TransactionController = require('../controllers/TransactionController');
const authMiddleware = require('../middlewares/auth');

const routes = express.Router();

// Aplica o middleware de autenticação em todas as rotas abaixo
routes.use(authMiddleware);

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Cria uma nova transação financeira
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - amount
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *               category_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Transação criada com sucesso
 *       400:
 *         description: Erro de validação
 */
routes.post('/transactions', TransactionController.create);

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Lista todas as transações do usuário com filtros opcionais
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INCOME, EXPENSE]
 *         description: Filtrar por tipo de transação
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página (padrão 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade de itens por página (padrão 10)
 *     responses:
 *       200:
 *         description: Lista de transações retornada com sucesso
 */
routes.get('/transactions', TransactionController.listByUser);

/**
 * @swagger
 * /summary:
 *   get:
 *     summary: Retorna o resumo financeiro do usuário (receitas, despesas e saldo)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumo calculado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 income:
 *                   type: number
 *                 expense:
 *                   type: number
 *                 total:
 *                   type: number
 */
routes.get('/summary', TransactionController.getSummary);

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Atualiza uma transação existente
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *               category_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Transação atualizada com sucesso
 *       404:
 *         description: Transação não encontrada ou acesso negado
 */
routes.put('/transactions/:id', TransactionController.update);

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Deleta uma transação pelo ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transação deletada com sucesso
 *       404:
 *         description: Transação não encontrada ou acesso negado
 */
routes.delete('/transactions/:id', TransactionController.delete);

module.exports = routes;