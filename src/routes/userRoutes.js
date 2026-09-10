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

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Pede a redefinição de senha (versão local — devolve o link direto, sem enviar e-mail)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Link de redefinição gerado com sucesso
 *       404:
 *         description: Nenhuma conta com esse e-mail
 *       429:
 *         description: Limite de tentativas excedido (Rate Limit)
 */
routes.post('/forgot-password', loginLimiter, UserController.forgotPassword);

/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Define uma nova senha a partir do token de redefinição
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha redefinida com sucesso
 *       400:
 *         description: Token inválido, expirado, ou senha inválida
 */
routes.post('/reset-password', UserController.resetPassword);

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
 * /users/password:
 *   put:
 *     summary: Troca a senha do usuário logado (exige a senha atual)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *       400:
 *         description: Senha atual incorreta ou dados inválidos
 */
// Precisa vir ANTES de /users/:id — senão o Express casaria "password" como
// se fosse o :id (a rota mais específica precisa ser registrada primeiro)
routes.put('/users/password', UserController.changePassword);

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