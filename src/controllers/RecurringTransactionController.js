// src/controllers/RecurringTransactionController.js
const prisma = require('../config/prisma');
const { z } = require('zod');
const { generateInitialOccurrences } = require('../services/recurringTransactionService');

const recurringSchema = z.object({
  title: z.string().trim().min(1, 'O título é obrigatório e não pode estar vazio.'),
  description: z.string().optional(),
  amount: z.coerce.number().positive('O valor deve ser um número maior que zero.'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'O tipo deve ser estritamente INCOME ou EXPENSE.' })
  }),
  category_id: z.string().uuid('ID de categoria inválido.').nullable().optional(),
  start_date: z.coerce.date({ errorMap: () => ({ message: 'Data de início inválida.' }) }),
  // Vazio/ausente = recorrência sem fim; número = parcelamento com esse total
  installments_total: z.coerce.number().int().min(2, 'Uma compra parcelada precisa de pelo menos 2 parcelas.').nullable().optional()
});

module.exports = {
  async create(req, res, next) {
    try {
      const { title, description, amount, type, category_id, start_date, installments_total } =
        recurringSchema.parse(req.body);
      const user_id = req.userId;

      const recurring = await prisma.recurringTransaction.create({
        data: {
          title,
          description,
          amount,
          type,
          category_id,
          start_date,
          installments_total: installments_total || null,
          user_id
        }
      });

      // Parcelada: gera todas as parcelas já aqui. Recorrente sem fim: gera
      // só a primeira ocorrência (o resto vem da checagem preguiçosa em
      // TransactionController, toda vez que o usuário abrir a lista/resumo)
      const updated = await generateInitialOccurrences(prisma, recurring);

      return res.status(201).json(updated);
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const user_id = req.userId;

      const recurrences = await prisma.recurringTransaction.findMany({
        where: { user_id },
        include: { category: true },
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json(recurrences);
    } catch (error) {
      next(error);
    }
  },

  // Cancela uma recorrência sem fim: para de gerar meses futuros, mas não
  // apaga nada que já foi gerado (o histórico financeiro fica intacto)
  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;

      const result = await prisma.recurringTransaction.updateMany({
        where: { id, user_id },
        data: { active: false }
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Recorrência não encontrada ou acesso negado.' });
      }

      return res.status(200).json({ message: 'Recorrência cancelada. As transações já geradas continuam normalmente.' });
    } catch (error) {
      next(error);
    }
  }
};
