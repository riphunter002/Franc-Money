// src/controllers/ImportedTransactionController.js
const prisma = require('../config/prisma');
const { z } = require('zod');

const rowSchema = z.object({
  title: z.string().trim().min(1, 'Título vazio em uma das linhas.'),
  amount: z.coerce.number().positive('Valor inválido em uma das linhas.'),
  date: z.coerce.date({ errorMap: () => ({ message: 'Data inválida em uma das linhas.' }) })
});

const bulkCreateSchema = z.object({
  rows: z.array(rowSchema).min(1, 'Nenhuma linha válida encontrada no arquivo.')
});

// Usado no confirm: os campos que a tela de revisão deixa editar antes de
// virar uma transação de verdade. Tudo opcional porque o usuário pode
// confirmar sem mudar nada do que foi lido do CSV.
const confirmOverridesSchema = z.object({
  title: z.string().trim().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  // .nullable() permite mandar null explicitamente (sem categoria), diferente
  // de omitir o campo (mantém o que já estava salvo)
  category_id: z.string().uuid('ID de categoria inválido.').nullable().optional()
});

module.exports = {
  // Recebe as linhas já interpretadas pelo navegador (data/título/valor do CSV)
  // e cria uma linha pendente de revisão pra cada uma
  async bulkCreate(req, res, next) {
    try {
      const { rows } = bulkCreateSchema.parse(req.body);
      const user_id = req.userId;

      const created = await prisma.$transaction(
        rows.map((row) =>
          prisma.importedTransaction.create({
            data: { title: row.title, amount: row.amount, date: row.date, user_id }
          })
        )
      );

      return res.status(201).json({ imported: created.length });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const user_id = req.userId;

      const items = await prisma.importedTransaction.findMany({
        where: { user_id },
        include: { category: true },
        orderBy: { date: 'desc' }
      });

      return res.status(200).json(items);
    } catch (error) {
      next(error);
    }
  },

  // Promove o item pendente pra uma Transaction de verdade (aplicando por
  // cima qualquer edição feita na tela de revisão) e remove ele da lista
  async confirm(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;
      const overrides = confirmOverridesSchema.parse(req.body || {});

      const item = await prisma.importedTransaction.findFirst({ where: { id, user_id } });
      if (!item) {
        return res.status(404).json({ error: 'Item não encontrado ou acesso negado.' });
      }

      const finalData = {
        title: overrides.title ?? item.title,
        amount: overrides.amount ?? item.amount,
        date: overrides.date ?? item.date,
        type: overrides.type ?? item.type,
        category_id: overrides.category_id !== undefined ? overrides.category_id : item.category_id
      };

      const [transaction] = await prisma.$transaction([
        prisma.transaction.create({
          data: { ...finalData, user_id }
        }),
        prisma.importedTransaction.delete({ where: { id } })
      ]);

      return res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  },

  // Descarta o item pendente sem criar transação nenhuma (ex.: linha de
  // "saldo anterior" que veio junto no CSV e não é um gasto de verdade)
  async discard(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;

      const result = await prisma.importedTransaction.deleteMany({ where: { id, user_id } });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Item não encontrado ou acesso negado.' });
      }

      return res.status(200).json({ message: 'Item descartado.' });
    } catch (error) {
      next(error);
    }
  }
};
