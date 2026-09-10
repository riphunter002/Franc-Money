const express = require('express');
const UserController = require('../controllers/UserController');
const { loginLimiter } = require('../middlewares/rateLimiter'); // <-- Importe aqui
const authMiddleware = require('../middlewares/auth');

const routes = express.Router();

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login bem-sucedido com retorno do token
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: E-mail já cadastrado ou erro de validação
 *       401:
 *         description: Credenciais inválidas
 *       429:
 *         description: Limite de tentativas de login excedido (Rate Limit)
 *       
 *     
 *       
 */
routes.post('/users', UserController.create);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Realiza o login do usuário e retorna o token JWT
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login bem-sucedido com retorno do token
 *       401:
 *         description: Credenciais inválidas
 *       429:
 *         description: Limite de tentativas de login excedido (Rate Limit)
 */
routes.post('/login', loginLimiter, UserController.login);

// GET/PUT/DELETE abaixo mexem com dados de conta — exigem login
routes.use(authMiddleware);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista os usuários cadastrados
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */
routes.get('/users', UserController.list);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Atualiza os dados de um usuário pelo ID
 *     tags: [Users]
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
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       404:
 *         description: Usuário não encontrado
 */
routes.put('/users/:id', UserController.update);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Remove um usuário pelo ID
 *     tags: [Users]
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
 *         description: Usuário deletado com sucesso
 *       404:
 *         description: Usuário não encontrado
 */
routes.delete('/users/:id', UserController.delete);

module.exports = routes;