const { Router } = require('express');
const ImportedTransactionController = require('../controllers/ImportedTransactionController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /imported-transactions:
 *   post:
 *     summary: Importa em lote linhas de um CSV já interpretado pelo navegador
 *     tags: [ImportedTransactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rows:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     date:
 *                       type: string
 *     responses:
 *       201:
 *         description: Linhas importadas com sucesso
 *       400:
 *         description: Erro de validação
 */
router.post('/imported-transactions', ImportedTransactionController.bulkCreate);

/**
 * @swagger
 * /imported-transactions:
 *   get:
 *     summary: Lista as transações importadas pendentes de revisão
 *     tags: [ImportedTransactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */
router.get('/imported-transactions', ImportedTransactionController.list);

/**
 * @swagger
 * /imported-transactions/{id}/confirm:
 *   post:
 *     summary: Confirma um item pendente (aplicando edições, se houver) e cria a transação
 *     tags: [ImportedTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               date:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *               category_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transação criada com sucesso
 *       404:
 *         description: Item não encontrado ou acesso negado
 */
router.post('/imported-transactions/:id/confirm', ImportedTransactionController.confirm);

/**
 * @swagger
 * /imported-transactions/{id}:
 *   delete:
 *     summary: Descarta um item pendente sem criar transação nenhuma
 *     tags: [ImportedTransactions]
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
 *         description: Item descartado com sucesso
 *       404:
 *         description: Item não encontrado ou acesso negado
 */
router.delete('/imported-transactions/:id', ImportedTransactionController.discard);

module.exports = router;
