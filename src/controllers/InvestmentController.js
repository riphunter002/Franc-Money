// src/controllers/InvestmentController.js
const prisma = require('../config/prisma');
const { z } = require('zod');
const { fetchQuote } = require('../services/brapiService');

// Cotação só é buscada de novo se a que está salva tiver mais de 15 minutos
// — evita bater na API da brapi.dev a cada carregamento de tela
const STALE_MS = 15 * 60 * 1000;

const investmentSchema = z.object({
  ticker: z.string().trim().toUpperCase().min(1, 'Informe o código do ativo.'),
  quantity: z.coerce.number().positive('A quantidade deve ser maior que zero.'),
  average_price: z.coerce.number().positive('O preço médio deve ser maior que zero.')
});

const updateInvestmentSchema = z.object({
  quantity: z.coerce.number().positive('A quantidade deve ser maior que zero.').optional(),
  average_price: z.coerce.number().positive('O preço médio deve ser maior que zero.').optional()
});

function isStale(investment) {
  if (!investment.price_updated_at) return true;
  return Date.now() - investment.price_updated_at.getTime() > STALE_MS;
}

// Acrescenta o valor investido, valor atual e ganho/perda calculados —
// não fica salvo no banco, é sempre recalculado a partir do preço atual
function withComputedFields(investment) {
  const quantity = Number(investment.quantity);
  const averagePrice = Number(investment.average_price);
  const currentPrice = investment.current_price !== null ? Number(investment.current_price) : null;

  const investedValue = quantity * averagePrice;
  const currentValue = currentPrice !== null ? quantity * currentPrice : null;
  const gainLoss = currentValue !== null ? currentValue - investedValue : null;
  const gainLossPercent = currentValue !== null && investedValue > 0 ? (gainLoss / investedValue) * 100 : null;

  return { ...investment, investedValue, currentValue, gainLoss, gainLossPercent };
}

module.exports = {
  async create(req, res, next) {
    try {
      const { ticker, quantity, average_price } = investmentSchema.parse(req.body);
      const user_id = req.userId;

      const quote = await fetchQuote(ticker);
      if (!quote) {
        return res.status(404).json({
          error: `Não encontramos o ativo "${ticker}". Confira o código (ex.: PETR4, MXRF11).`
        });
      }

      const investment = await prisma.investment.create({
        data: {
          ticker,
          quantity,
          average_price,
          asset_name: quote.name,
          current_price: quote.price,
          price_updated_at: new Date(),
          user_id
        }
      });

      return res.status(201).json(withComputedFields(investment));
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const user_id = req.userId;
      const investments = await prisma.investment.findMany({
        where: { user_id },
        orderBy: { created_at: 'asc' }
      });

      // Atualiza só os que estão desatualizados, um de cada vez (o plano
      // gratuito da brapi só aceita 1 ativo por requisição)
      const refreshed = await Promise.all(
        investments.map(async (investment) => {
          if (!isStale(investment)) return investment;

          const quote = await fetchQuote(investment.ticker);
          // Se o ativo não for mais encontrado, mantém o último preço salvo
          // em vez de apagar a cotação — melhor mostrar algo desatualizado
          // do que nada
          if (!quote) return investment;

          return prisma.investment.update({
            where: { id: investment.id },
            data: {
              current_price: quote.price,
              asset_name: quote.name,
              price_updated_at: new Date()
            }
          });
        })
      );

      return res.status(200).json(refreshed.map(withComputedFields));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;
      const data = updateInvestmentSchema.parse(req.body);

      const existing = await prisma.investment.findFirst({ where: { id, user_id } });
      if (!existing) {
        return res.status(404).json({ error: 'Ativo não encontrado ou acesso negado.' });
      }

      const investment = await prisma.investment.update({ where: { id }, data });
      return res.status(200).json(withComputedFields(investment));
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.userId;

      const result = await prisma.investment.deleteMany({ where: { id, user_id } });
      if (result.count === 0) {
        return res.status(404).json({ error: 'Ativo não encontrado ou acesso negado.' });
      }

      return res.status(200).json({ message: 'Ativo removido da carteira.' });
    } catch (error) {
      next(error);
    }
  }
};
