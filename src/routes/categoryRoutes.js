const { Router } = require('express');
const CategoryController = require('../controllers/CategoryController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware); 

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Cria uma nova categoria
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoria criada com sucesso
 *       400:
 *         description: Erro de validação
 */
router.post('/categories', CategoryController.create);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Lista todas as categorias do usuário
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorias retornada com sucesso
 */
router.get('/categories', CategoryController.list);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Deleta uma categoria pelo ID
 *     tags: [Categories]
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
 *         description: Categoria deletada com sucesso
 *       404:
 *         description: Categoria não encontrada ou acesso negado
 */
router.delete('/categories/:id', CategoryController.delete);

module.exports = router;