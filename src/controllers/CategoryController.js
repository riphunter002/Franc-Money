// src/controllers/CategoryController.js
const prisma = require('../config/prisma');
const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().trim().min(1, 'O nome da categoria é obrigatório.')
});

module.exports = {
  async create(req, res, next) {
    try {
      const { name } = categorySchema.parse(req.body);
      const user_id = req.userId;

      const category = await prisma.category.create({
        data: { name, user_id }
      });

      return res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  },

 // ... (método list anterior) ...
  async list(req, res, next) {
    try {
      const user_id = req.userId;
      
      const categories = await prisma.category.findMany({
        where: { user_id },
        orderBy: { name: 'asc' }
      });

      return res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  }, // <-- Não esqueça desta vírgula!

  // NOVO MÉTODO PARA DELETAR CATEGORIA
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;

      const result = await prisma.category.deleteMany({
        where: { id, user_id }
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada ou acesso negado.' });
      }

      return res.status(200).json({ message: 'Categoria deletada com sucesso!' });
    } catch (error) {
      next(error);
    }
  }

};