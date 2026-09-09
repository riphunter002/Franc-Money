const { Router } = require('express');
const RecurringTransactionController = require('../controllers/RecurringTransactionController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /recurring-transactions:
 *   post:
 *     summary: Cria uma recorrência (compra parcelada ou receita/despesa sem fim)
 *     tags: [RecurringTransactions]
 *     security:
 *       - bearerAuth: []
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
 *               start_date:
 *                 type: string
 *               installments_total:
 *                 type: integer
 *                 description: Vazio para recorrência sem fim; número de parcelas para parcelamento
 *     responses:
 *       201:
 *         description: Recorrência criada com sucesso (transações iniciais já geradas)
 *       400:
 *         description: Erro de validação
 */
router.post('/recurring-transactions', RecurringTransactionController.create);

/**
 * @swagger
 * /recurring-transactions:
 *   get:
 *     summary: Lista as recorrências do usuário
 *     tags: [RecurringTransactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */
router.get('/recurring-transactions', RecurringTransactionController.list);

/**
 * @swagger
 * /recurring-transactions/{id}:
 *   delete:
 *     summary: Cancela uma recorrência sem fim (para de gerar meses futuros; não apaga o que já existe)
 *     tags: [RecurringTransactions]
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
 *         description: Recorrência cancelada com sucesso
 *       404:
 *         description: Recorrência não encontrada ou acesso negado
 */
router.delete('/recurring-transactions/:id', RecurringTransactionController.cancel);

module.exports = router;
