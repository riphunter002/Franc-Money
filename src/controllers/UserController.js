// src/controllers/UserController.js
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

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

  async list(req, res, next) {
    try {
      const users = await prisma.user.findMany();
      return res.status(200).json(users.map(toPublicUser));
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

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'segredo_super_secreto', {
        expiresIn: '1d',
      });

      return res.status(200).json({ user: { id: user.id, name: user.name, email: user.email }, token });
    } catch (error) {
      next(error);
    }
  }
};
