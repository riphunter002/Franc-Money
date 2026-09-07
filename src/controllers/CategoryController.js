// src/controllers/CategoryController.js
const prisma = require('../config/prisma');
const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().trim().min(1, 'O nome da categoria é obrigatório.'),
  // Default EXPENSE só por segurança (ex.: alguém chamando a API direto sem
  // mandar o campo); a tela sempre manda o valor escolhido no toggle
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'O tipo deve ser estritamente INCOME ou EXPENSE.' })
  }).default('EXPENSE')
});

const updateCategorySchema = categorySchema.partial();

module.exports = {
  async create(req, res, next) {
    try {
      const { name, type } = categorySchema.parse(req.body);
      const user_id = req.userId;

      const category = await prisma.category.create({
        data: { name, type, user_id }
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

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;
      const { name, type } = updateCategorySchema.parse(req.body);

      const existingCategory = await prisma.category.findFirst({
        where: { id, user_id }
      });
      if (!existingCategory) {
        return res.status(404).json({ error: 'Categoria não encontrada ou acesso negado.' });
      }

      const category = await prisma.category.update({
        where: { id },
        data: { name, type }
      });

      return res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  },

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