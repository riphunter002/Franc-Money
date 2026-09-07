const { Router } = require('express');
const BudgetController = require('../controllers/BudgetController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /budgets:
 *   post:
 *     summary: Cria um orçamento mensal para uma categoria
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category_id:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Orçamento criado com sucesso
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Categoria não encontrada ou acesso negado
 */
router.post('/budgets', BudgetController.create);

/**
 * @swagger
 * /budgets:
 *   get:
 *     summary: Lista os orçamentos do usuário, com o gasto do mês atual
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de orçamentos retornada com sucesso
 */
router.get('/budgets', BudgetController.list);

/**
 * @swagger
 * /budgets/{id}:
 *   put:
 *     summary: Atualiza o valor limite de um orçamento
 *     tags: [Budgets]
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
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Orçamento atualizado com sucesso
 *       404:
 *         description: Orçamento não encontrado ou acesso negado
 */
router.put('/budgets/:id', BudgetController.update);

/**
 * @swagger
 * /budgets/{id}:
 *   delete:
 *     summary: Remove um orçamento
 *     tags: [Budgets]
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
 *         description: Orçamento removido com sucesso
 *       404:
 *         description: Orçamento não encontrado ou acesso negado
 */
router.delete('/budgets/:id', BudgetController.delete);

module.exports = router;
