// src/controllers/UserController.js
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = {
  async create(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: { name, email, password_hash: hashedPassword },
      });
      return res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const users = await prisma.user.findMany();
      return res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email } = req.body;
      const updatedUser = await prisma.user.update({
        where: { id: id },
        data: { name, email },
      });
      return res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.user.delete({ where: { id: id } });
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