const { Router } = require('express');
const InvestmentController = require('../controllers/InvestmentController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /investments:
 *   post:
 *     summary: Adiciona um ativo à carteira (busca a cotação atual na hora de criar)
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticker:
 *                 type: string
 *               quantity:
 *                 type: number
 *               average_price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ativo adicionado com sucesso
 *       404:
 *         description: Ativo não encontrado na B3
 */
router.post('/investments', InvestmentController.create);

/**
 * @swagger
 * /investments:
 *   get:
 *     summary: Lista os ativos da carteira, com cotação atualizada (busca de novo se estiver desatualizada)
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */
router.get('/investments', InvestmentController.list);

/**
 * @swagger
 * /investments/{id}:
 *   put:
 *     summary: Atualiza quantidade e/ou preço médio de um ativo
 *     tags: [Investments]
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
 *         description: Ativo atualizado com sucesso
 *       404:
 *         description: Ativo não encontrado ou acesso negado
 */
router.put('/investments/:id', InvestmentController.update);

/**
 * @swagger
 * /investments/{id}:
 *   delete:
 *     summary: Remove um ativo da carteira
 *     tags: [Investments]
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
 *         description: Ativo removido com sucesso
 *       404:
 *         description: Ativo não encontrado ou acesso negado
 */
router.delete('/investments/:id', InvestmentController.delete);

module.exports = router;
