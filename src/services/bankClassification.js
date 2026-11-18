const { z } = require('zod');

// Só aceitamos classificação explícita. Parcelamento não prova que houve crédito.
const bankClassification = {
  bank: z.enum(['NUBANK', 'PICPAY', 'PAN']).nullable().optional(),
  payment_method: z.enum(['PIX', 'DEBIT', 'CREDIT', 'PIX_CREDIT']).nullable().optional()
};

module.exports = { bankClassification };
