// src/controllers/TransactionController.js
const prisma = require('../config/prisma');
const { z } = require('zod');

const transactionSchema = z.object({
  title: z.string().trim().min(1, 'O título é obrigatório e não pode estar vazio.'),
  description: z.string().optional(),
  amount: z.coerce.number().positive('O valor deve ser um número maior que zero.'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'O tipo deve ser estritamente INCOME ou EXPENSE.' })
  }),
  // Opcional: se não vier, o Prisma usa o default (now()) do schema
  date: z.coerce.date({ errorMap: () => ({ message: 'Data inválida.' }) }).optional(),
  // .nullable() permite enviar explicitamente { category_id: null } para remover
  // a categoria de uma transação (diferente de simplesmente omitir o campo, que
  // significa "não altere o valor atual" numa atualização parcial)
  category_id: z.string().uuid('ID de categoria inválido.').nullable().optional()
});

const updateTransactionSchema = transactionSchema.partial();

module.exports = {
  async create(req, res, next) {
    try {
      const { title, description, amount, type, date, category_id } = transactionSchema.parse(req.body);
      const user_id = req.userId;

      const transaction = await prisma.transaction.create({
        data: { title, description, amount, type, date, user_id, category_id },
      });

      return res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  },

  async listByUser(req, res, next) {
    try {
      const userId = req.userId;
      // Captura page e limit da URL (padrão: página 1, 10 itens)
      const { type, startDate, endDate, page = 1, limit = 10 } = req.query;

      const filters = { user_id: userId };

      if (type) filters.type = type;
      if (startDate || endDate) {
        filters.date = {};
        if (startDate) filters.date.gte = new Date(startDate);
        if (endDate) filters.date.lte = new Date(endDate);
      }

      // Convertendo para números para evitar erros matemáticos
      const pageNum = Number(page);
      const limitNum = Number(limit);
      
      // Cálculo de quantos itens o banco deve pular
      const skip = (pageNum - 1) * limitNum;

      // Executa a busca e a contagem total ao mesmo tempo
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: filters,
          orderBy: { date: 'desc' },
          include: { category: true },
          skip: skip,      // <-- Pula os itens das páginas anteriores
          take: limitNum   // <-- Pega apenas a quantidade do limite
        }),
        prisma.transaction.count({ where: filters }) // Conta o total de registros
      ]);

      // Retorna os dados envelopados com as informações da paginação
      return res.status(200).json({
        data: transactions,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async getSummary(req, res, next) {
    try {
      const userId = req.userId;

      const transactions = await prisma.transaction.findMany({
        where: { user_id: userId }
      });

      const summary = transactions.reduce((acc, transaction) => {
        const amount = Number(transaction.amount);

        if (transaction.type === 'INCOME') {
          acc.income += amount;
          acc.total += amount;
        } else if (transaction.type === 'EXPENSE') {
          acc.expense += amount;
          acc.total -= amount;
        }

        return acc;
      }, { income: 0, expense: 0, total: 0 });

      return res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId; // ID extraído do token JWT
      const { title, description, amount, type, date, category_id } = updateTransactionSchema.parse(req.body);

      // Verifica se a transação existe E pertence a este usuário
      const existingTransaction = await prisma.transaction.findFirst({
        where: { id, user_id }
      });

      if (!existingTransaction) {
        return res.status(404).json({ error: 'Transação não encontrada ou acesso negado.' });
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data: { title, description, amount, type, date, category_id },
      });

      return res.status(200).json(transaction);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId; 
      
      // O deleteMany permite usar múltiplos campos (id e user_id) para garantir a segurança
      const result = await prisma.transaction.deleteMany({
        where: { id, user_id }
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Transação não encontrada ou acesso negado.' });
      }

      return res.status(200).json({ message: 'Transação deletada com sucesso!' });
    } catch (error) {
      next(error);
    }
  }
};