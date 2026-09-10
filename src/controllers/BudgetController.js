// src/controllers/BudgetController.js
const prisma = require('../config/prisma');
const { z } = require('zod');
const { currentMonthRangeUTC } = require('../services/dateRangeService');

const budgetSchema = z.object({
  category_id: z.string().uuid('ID de categoria inválido.'),
  amount: z.coerce.number().positive('O limite deve ser um número maior que zero.')
});

const updateBudgetSchema = z.object({
  amount: z.coerce.number().positive('O limite deve ser um número maior que zero.')
});

module.exports = {
  async create(req, res, next) {
    try {
      const { category_id, amount } = budgetSchema.parse(req.body);
      const user_id = req.userId;

      // Confere se a categoria existe e é do próprio usuário antes de criar
      // o orçamento (evita criar um orçamento "pendurado" numa categoria alheia)
      const category = await prisma.category.findFirst({
        where: { id: category_id, user_id }
      });
      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada ou acesso negado.' });
      }

      const budget = await prisma.budget.create({
        data: { amount, user_id, category_id },
        include: { category: true }
      });

      return res.status(201).json(budget);
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const user_id = req.userId;
      const { start, end } = currentMonthRangeUTC();

      const budgets = await prisma.budget.findMany({
        where: { user_id },
        include: { category: true },
        orderBy: { category: { name: 'asc' } }
      });

      // Pra cada orçamento, soma quanto já foi gasto (EXPENSE) na categoria
      // dele dentro do mês atual, e monta a porcentagem usada
      const budgetsWithSpent = await Promise.all(
        budgets.map(async (budget) => {
          const result = await prisma.transaction.aggregate({
            where: {
              user_id,
              category_id: budget.category_id,
              type: 'EXPENSE',
              date: { gte: start, lt: end }
            },
            _sum: { amount: true }
          });

          const spent = Number(result._sum.amount || 0);
          const limit = Number(budget.amount);
          const percentage = limit > 0 ? Math.min((spent / limit) * 100, 999) : 0;

          return {
            ...budget,
            spent,
            percentage,
            isOverBudget: spent > limit
          };
        })
      );

      return res.status(200).json(budgetsWithSpent);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;
      const { amount } = updateBudgetSchema.parse(req.body);

      const existingBudget = await prisma.budget.findFirst({
        where: { id, user_id }
      });
      if (!existingBudget) {
        return res.status(404).json({ error: 'Orçamento não encontrado ou acesso negado.' });
      }

      const budget = await prisma.budget.update({
        where: { id },
        data: { amount },
        include: { category: true }
      });

      return res.status(200).json(budget);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;

      const result = await prisma.budget.deleteMany({
        where: { id, user_id }
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Orçamento não encontrado ou acesso negado.' });
      }

      return res.status(200).json({ message: 'Orçamento removido com sucesso!' });
    } catch (error) {
      next(error);
    }
  }
};
