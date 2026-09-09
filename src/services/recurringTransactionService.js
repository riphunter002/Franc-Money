// src/services/recurringTransactionService.js
// Lógica de geração das transações a partir de uma RecurringTransaction
// (compra parcelada ou recorrência sem fim). Compartilhada entre a criação
// (RecurringTransactionController) e a checagem preguiçosa que roda toda
// vez que o usuário lista transações ou vê o resumo (TransactionController).

// Soma "months" meses a uma data, sem "transbordar" pro mês seguinte quando
// o dia não existe nele (ex.: 31 de janeiro + 1 mês = 28/29 de fevereiro,
// não 3 de março)
function addMonthsUTC(date, months) {
  const base = new Date(date);
  const day = base.getUTCDate();
  const result = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1));
  const daysInResultMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, daysInResultMonth));
  return result;
}

// Quantos meses de calendário separam duas datas (0 = mesmo mês/ano)
function monthsBetweenUTC(startDate, referenceDate) {
  const start = new Date(startDate);
  const ref = new Date(referenceDate);
  return (
    (ref.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (ref.getUTCMonth() - start.getUTCMonth())
  );
}

// Cria as transações que faltam, do índice já gerado até "uptoCount"
// (exclusivo). Retorna quantas existem ao todo depois de rodar.
async function materializeOccurrences(prisma, recurring, uptoCount) {
  for (let i = recurring.installments_generated; i < uptoCount; i++) {
    await prisma.transaction.create({
      data: {
        title: recurring.title,
        description: recurring.description,
        amount: recurring.amount,
        type: recurring.type,
        date: addMonthsUTC(recurring.start_date, i),
        user_id: recurring.user_id,
        category_id: recurring.category_id,
        recurring_transaction_id: recurring.id,
        installment_number: recurring.installments_total ? i + 1 : null
      }
    });
  }
  return uptoCount;
}

// Roda ao criar uma RecurringTransaction: se for parcelada, gera todas as
// parcelas de uma vez (já sabemos quantas são); se for recorrente sem fim,
// gera só a primeira ocorrência (o resto vem da checagem preguiçosa abaixo)
async function generateInitialOccurrences(prisma, recurring) {
  const target = recurring.installments_total || 1;
  const generated = await materializeOccurrences(prisma, recurring, target);

  return prisma.recurringTransaction.update({
    where: { id: recurring.id },
    data: {
      installments_generated: generated,
      // Parcelamento: já gerou tudo, não há mais nada a fazer no futuro.
      // Recorrência sem fim: continua ativa pros próximos meses.
      active: recurring.installments_total ? false : true
    }
  });
}

// Roda toda vez que o usuário carrega transações/resumo: gera as ocorrências
// de meses que já deveriam ter acontecido mas o app não estava aberto pra
// criar na hora (ex.: usuário não abriu o app em agosto, ao abrir em
// setembro gera agosto E setembro de uma vez). Só se aplica a recorrências
// sem fim — parceladas já nascem com tudo gerado em generateInitialOccurrences.
async function generateDueRecurringTransactions(prisma, userId) {
  const now = new Date();

  const recurrences = await prisma.recurringTransaction.findMany({
    where: { user_id: userId, active: true, installments_total: null }
  });

  for (const recurring of recurrences) {
    const shouldHaveGenerated = monthsBetweenUTC(recurring.start_date, now) + 1;
    if (shouldHaveGenerated <= recurring.installments_generated) continue;

    await materializeOccurrences(prisma, recurring, shouldHaveGenerated);
    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { installments_generated: shouldHaveGenerated }
    });
  }
}

module.exports = { generateInitialOccurrences, generateDueRecurringTransactions };
