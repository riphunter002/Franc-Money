const { test } = require('node:test');
const assert = require('node:assert/strict');

// Substitui apenas a conexão: não lê .env nem escreve em dados pessoais.
const calls = [];
const prisma = {
  transaction: {
    create: async ({ data }) => { calls.push(data); return data; },
    update: async ({ data }) => { calls.push(data); return data; },
    findFirst: async () => ({ id: 'tx', user_id: 'owner' }),
    findMany: async (args) => { calls.push(args); return []; },
    count: async () => 0
  },
  recurringTransaction: {
    findMany: async () => [],
    create: async ({ data }) => ({ ...data, id: 'rec', installments_generated: 0 }),
    update: async ({ data }) => data
  },
  $transaction: async (fn) => fn(prisma)
};
const configPath = require.resolve('../src/config/prisma');
require.cache[configPath] = { id: configPath, filename: configPath, loaded: true, exports: prisma };
const controller = require('../src/controllers/TransactionController');
const recurring = require('../src/controllers/RecurringTransactionController');
const base = { title: 'Internet', amount: 120, type: 'EXPENSE' };
async function invoke(method, body, query = {}) {
  const res = { status() { return this; }, json(value) { this.body = value; return this; } };
  let error;
  await method({ userId: 'owner', params: { id: 'tx' }, body, query }, res, e => { error = e; });
  return { body: res.body, error };
}

test('cadastro e edição persistem banco e pagamento explícitos, aceitam null e preservam omissão', async () => {
  for (const method of [controller.create, controller.update]) {
    const saved = await invoke(method, { ...base, bank: 'NUBANK', payment_method: 'PIX' });
    assert.ifError(saved.error);
    assert.equal(saved.body.bank, 'NUBANK');
    assert.equal(saved.body.payment_method, 'PIX');
  }
  const cleared = await invoke(controller.update, { bank: null, payment_method: null });
  assert.equal(cleared.body.bank, null);
  assert.equal(cleared.body.payment_method, null);
  const omitted = await invoke(controller.update, { title: 'Alterado' });
  assert.equal(omitted.body.bank, undefined);
  assert.equal(omitted.body.payment_method, undefined);
});

test('classificações inválidas são recusadas sem gravar', async () => {
  for (const method of [controller.create, controller.update, recurring.create]) {
    for (const field of [{ bank: 'OUTRO' }, { payment_method: 'pix' }]) {
      calls.length = 0;
      const result = await invoke(method, { ...base, start_date: '2026-11-18', ...field });
      assert.ok(result.error, 'deve recusar valor fora do contrato');
      assert.equal(calls.length, 0);
    }
  }
});

test('filtros de banco, pagamento e categoria são aplicados antes de paginar e mantêm o dono', async () => {
  calls.length = 0;
  const category = '10dfe43a-6ce1-438e-a7c5-790b0cefd5ac';
  const result = await invoke(controller.listByUser, {}, { bank: 'PAN', payment_method: 'DEBIT', category_id: category, page: '2', limit: '10' });
  assert.ifError(result.error);
  const query = calls[0];
  assert.equal(query.where.user_id, 'owner');
  assert.equal(query.where.bank, 'PAN');
  assert.equal(query.where.payment_method, 'DEBIT');
  assert.equal(query.where.category_id, category);
  assert.equal(query.skip, 10);
});

test('parcelas herdam classificações explícitas sem inferir método quando ausente', async () => {
  calls.length = 0;
  const result = await invoke(recurring.create, { ...base, start_date: '2026-11-18', installments_total: 2, bank: 'PICPAY', payment_method: 'PIX_CREDIT' });
  assert.ifError(result.error);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(tx => tx.bank === 'PICPAY' && tx.payment_method === 'PIX_CREDIT'));
  calls.length = 0;
  await invoke(recurring.create, { ...base, start_date: '2026-11-18', installments_total: 2 });
  assert.ok(calls.every(tx => tx.payment_method == null && tx.bank == null));
});
