// src/controllers/UserController.js
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const env = require('../config/env');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token ausente.'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.')
});

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório.'),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  // Mesma regra já cobrada no cliente (register.html/auth.js): agora também
  // vale no backend, que é o que realmente impede uma senha fraca de verdade
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.')
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório.').optional(),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres.')
});

// Nunca devolve o password_hash pro cliente — não tem por que sair da API
function toPublicUser(user) {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}

module.exports = {
  async create(req, res, next) {
    try {
      const { name, email, password } = createUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: { name, email, password_hash: hashedPassword },
      });

      return res.status(201).json(toPublicUser(newUser));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const requesterId = req.userId;

      // Um usuário só pode editar a própria conta — o :id na URL precisa
      // bater com quem está logado, senão seria possível editar qualquer
      // conta só sabendo o ID dela
      if (id !== requesterId) {
        return res.status(403).json({ error: 'Você só pode editar a sua própria conta.' });
      }

      const { name, email } = updateUserSchema.parse(req.body);

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { name, email },
      });

      return res.status(200).json(toPublicUser(updatedUser));
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const requesterId = req.userId;

      if (id !== requesterId) {
        return res.status(403).json({ error: 'Você só pode excluir a sua própria conta.' });
      }

      await prisma.user.delete({ where: { id } });
      return res.status(200).json({ message: 'Usuário deletado com sucesso!' });
    } catch (error) {
      next(error);
    }
  },

  // Trocar a senha exige confirmar a senha ATUAL — diferente da redefinição
  // por link (que existe justamente pra quando você não lembra a senha
  // atual), aqui a pessoa já está logada, então provar que sabe a senha de
  // hoje é o que impede alguém que só pegou a sessão aberta de trocar a
  // senha sem o dono perceber
  async changePassword(req, res, next) {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);

      if (!passwordMatch) {
        return res.status(400).json({ error: 'A senha atual informada está incorreta.' });
      }

      const password_hash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { password_hash } });

      return res.status(200).json({ message: 'Senha alterada com sucesso.' });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      const token = jwt.sign({ id: user.id }, env.JWT_SECRET, {
        expiresIn: '1d',
      });

      return res.status(200).json({ user: { id: user.id, name: user.name, email: user.email }, token });
    } catch (error) {
      next(error);
    }
  },

  // Versão simplificada, sem envio de e-mail (o projeto ainda não tem um
  // serviço de e-mail configurado): o link de redefinição volta direto na
  // resposta, pra tela mostrar. Antes de hospedar o site pra outras pessoas
  // usarem, isso precisa virar um e-mail de verdade — aqui só serve porque,
  // por enquanto, quem pede a redefinição é a mesma pessoa que vai ver a
  // resposta na tela.
  async forgotPassword(req, res, next) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'Não existe conta cadastrada com esse e-mail.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const reset_token_expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: { reset_token: token, reset_token_expires }
      });

      return res.status(200).json({
        resetUrl: `/reset-password.html?token=${token}`,
        expiresInMinutes: RESET_TOKEN_TTL_MS / 60000
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);

      const user = await prisma.user.findFirst({ where: { reset_token: token } });

      if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
        return res.status(400).json({ error: 'Link de redefinição inválido ou expirado. Peça um novo.' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        // Limpa o token depois de usado — cada link só funciona uma vez
        data: { password_hash, reset_token: null, reset_token_expires: null }
      });

      return res.status(200).json({ message: 'Senha redefinida com sucesso. Você já pode entrar com a nova senha.' });
    } catch (error) {
      next(error);
    }
  }
};
