const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Não lê .env nem DATABASE_URL: exige banco local descartável explícito.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  test('integração PostgreSQL (configure TEST_DATABASE_URL; veja tests/README.md)', { skip: true }, () => {});
} else {
  const url = new URL(connectionString);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Use PostgreSQL local para testes.');
  assert.match(url.pathname, /^\/franc_money_test(?:_\w+)?$/, 'Use um banco descartável franc_money_test.');
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('@prisma/client');
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  // Substitui somente a conexão; controllers, serviço e PostgreSQL são reais.
  const configPath = require.resolve('../src/config/prisma');
  require.cache[configPath] = { id: configPath, filename: configPath, loaded: true, exports: prisma };
  const transactions = require('../src/controllers/TransactionController');
  const recurringController = require('../src/controllers/RecurringTransactionController');
  const importedController = require('../src/controllers/ImportedTransactionController');
  const { generateDueRecurringTransactions } = require('../src/services/recurringTransactionService');

  before(async () => {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public');
    const migrations = path.join(__dirname, '../prisma/migrations');
    for (const name of fs.readdirSync(migrations).sort()) {
      const sql = path.join(migrations, name, 'migration.sql');
      if (fs.existsSync(sql)) await pool.query(fs.readFileSync(sql, 'utf8'));
    }
  });
  after(async () => { await prisma.$disconnect(); await pool.end(); });

  async function user() {
    return prisma.user.create({ data: {
      name: 'Teste isolado', email: randomUUID() + '@example.test', password_hash: 'somente-teste'
    } });
  }
  function response() {
    return { statusCode: null, body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; }
    };
  }
  function freezeToday(t) {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-04T15:00:00Z') });
  }

  for (const method of ['create', 'update']) {
    for (const categoryState of ['alheia', 'inexistente']) {
      test(`${method}: rejeita categoria ${categoryState} sem modificar transações`, async () => {
        const owner = await user();
        const other = await user();
        const ownCategory = await prisma.category.create({ data: { name: 'Minha', user_id: owner.id } });
        const foreignCategory = await prisma.category.create({ data: { name: 'Privada', user_id: other.id } });
        const existing = await prisma.transaction.create({ data: {
          user_id: owner.id, title: 'Original', amount: 25, type: 'EXPENSE', category_id: ownCategory.id
        } });
        const res = response();
        await transactions[method]({ userId: owner.id, params: { id: existing.id }, body: {
          title: 'Tentativa', amount: 10, type: 'EXPENSE', user_id: other.id,
          category_id: categoryState === 'alheia' ? foreignCategory.id : randomUUID()
        } }, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Categoria não encontrada ou acesso negado.' });
        assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 1);
        const saved = await prisma.transaction.findUnique({ where: { id: existing.id } });
        assert.equal(saved.category_id, ownCategory.id);
        assert.equal(saved.title, 'Original');
        assert.equal(Number(saved.amount), 25);
      });
    }

    test(`${method}: aceita categoria do usuário autenticado`, async () => {
      const owner = await user();
      const category = await prisma.category.create({ data: { name: 'Minha', user_id: owner.id } });
      const existing = method === 'update' ? await prisma.transaction.create({ data: {
        user_id: owner.id, title: 'Original', amount: 25, type: 'EXPENSE'
      } }) : null;
      const res = response();
      await transactions[method]({ userId: owner.id, params: { id: existing?.id }, body: {
        title: 'Atualizada', amount: 10, type: 'EXPENSE', category_id: category.id
      } }, res, (err) => { throw err; });
      assert.equal(res.statusCode, method === 'create' ? 201 : 200);
      const saved = await prisma.transaction.findUnique({ where: { id: res.body.id } });
      assert.equal(saved.category_id, category.id);
      assert.equal(saved.user_id, owner.id);
      assert.equal(saved.title, 'Atualizada');
    });

    test(`${method}: rejeita formatos inválidos de categoria antes de gravar`, async () => {
      const owner = await user();
      const existing = await prisma.transaction.create({ data: {
        user_id: owner.id, title: 'Original', amount: 25, type: 'EXPENSE'
      } });
      for (const category_id of ['', 'não-é-uuid', [randomUUID()], { id: randomUUID() }]) {
        let error;
        const res = response();
        await transactions[method]({ userId: owner.id, params: { id: existing.id }, body: {
          title: 'Tentativa', amount: 10, type: 'EXPENSE', category_id
        } }, res, (err) => { error = err; });
        assert.ok(error instanceof require('zod').ZodError);
        assert.equal(res.statusCode, null);
      }
      assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 1);
      const saved = await prisma.transaction.findUnique({ where: { id: existing.id } });
      assert.equal(saved.title, 'Original');
      assert.equal(saved.category_id, null);
    });
  }

  test('criar sem categoria aceita campo ausente ou null', async () => {
    const owner = await user();
    for (const category of [{}, { category_id: null }]) {
      const res = response();
      await transactions.create({ userId: owner.id, body: {
        title: 'Sem categoria', amount: 10, type: 'EXPENSE', ...category
      } }, res, (err) => { throw err; });
      assert.equal(res.statusCode, 201);
      const saved = await prisma.transaction.findUnique({ where: { id: res.body.id } });
      assert.equal(saved.category_id, null);
    }
    assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 2);
  });

  test('editar mantém categoria omitida e remove categoria enviada como null', async () => {
    const owner = await user();
    const category = await prisma.category.create({ data: { name: 'Minha', user_id: owner.id } });
    const existing = await prisma.transaction.create({ data: {
      user_id: owner.id, title: 'Original', amount: 25, type: 'EXPENSE', category_id: category.id
    } });
    for (const [body, expectedCategory] of [[{ title: 'Renomeada' }, category.id], [{ category_id: null }, null]]) {
      const res = response();
      await transactions.update({ userId: owner.id, params: { id: existing.id }, body }, res,
        (err) => { throw err; });
      assert.equal(res.statusCode, 200);
      const saved = await prisma.transaction.findUnique({ where: { id: existing.id } });
      assert.equal(saved.category_id, expectedCategory);
      assert.equal(saved.title, 'Renomeada');
      assert.equal(Number(saved.amount), 25);
    }
  });

  test('editar continua rejeitando transação de outro usuário', async () => {
    const owner = await user();
    const other = await user();
    const category = await prisma.category.create({ data: { name: 'Minha', user_id: owner.id } });
    const existing = await prisma.transaction.create({ data: {
      user_id: other.id, title: 'Privada', amount: 25, type: 'EXPENSE'
    } });
    const res = response();
    await transactions.update({ userId: owner.id, params: { id: existing.id }, body: {
      title: 'Tentativa', category_id: category.id
    } }, res, (err) => { throw err; });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: 'Transação não encontrada ou acesso negado.' });
    const saved = await prisma.transaction.findUnique({ where: { id: existing.id } });
    assert.equal(saved.title, 'Privada');
    assert.equal(saved.category_id, null);
  });

  for (const scenario of [
    { name: 'categoria alheia enviada na revisão', source: 'override', category: 'foreign' },
    { name: 'categoria alheia já salva no item', source: 'saved', category: 'foreign' },
    { name: 'categoria inexistente enviada na revisão', source: 'override', category: 'missing' }
  ]) {
    test(`confirmar importação rejeita ${scenario.name} e preserva pendência`, async () => {
      const owner = await user();
      const other = await user();
      const category = await prisma.category.create({ data: { name: 'Privada', user_id: other.id } });
      const item = await prisma.importedTransaction.create({ data: {
        user_id: owner.id, title: 'Pendente', amount: 25, date: new Date('2026-11-04'),
        category_id: scenario.source === 'saved' ? category.id : null
      } });
      const res = response();
      const body = scenario.source === 'saved' ? {} : {
        title: 'Tentativa', user_id: other.id,
        category_id: scenario.category === 'missing' ? randomUUID() : category.id
      };
      await importedController.confirm({ userId: owner.id, params: { id: item.id }, body }, res,
        (err) => { throw err; });
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { error: 'Categoria não encontrada ou acesso negado.' });
      assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 0);
      const saved = await prisma.importedTransaction.findUnique({ where: { id: item.id } });
      assert.equal(saved.title, 'Pendente');
      assert.equal(saved.category_id, item.category_id);
      assert.equal(Number(saved.amount), 25);
    });
  }

  for (const scenario of ['categoria própria na revisão', 'categoria própria salva', 'remover categoria', 'sem categoria']) {
    test(`confirmar importação permite ${scenario}`, async () => {
      const owner = await user();
      const category = await prisma.category.create({ data: { name: 'Minha', user_id: owner.id } });
      const item = await prisma.importedTransaction.create({ data: {
        user_id: owner.id, title: 'Pendente', amount: 25, date: new Date('2026-11-04'),
        category_id: ['categoria própria salva', 'remover categoria'].includes(scenario) ? category.id : null
      } });
      const body = scenario === 'categoria própria na revisão' ? { category_id: category.id }
        : scenario === 'remover categoria' ? { category_id: null } : {};
      const expectedCategory = scenario.startsWith('categoria própria') ? category.id : null;
      const res = response();
      await importedController.confirm({ userId: owner.id, params: { id: item.id }, body }, res,
        (err) => { throw err; });
      assert.equal(res.statusCode, 201);
      const saved = await prisma.transaction.findUnique({ where: { id: res.body.id } });
      assert.equal(saved.user_id, owner.id);
      assert.equal(saved.category_id, expectedCategory);
      assert.equal(Number(saved.amount), 25);
      assert.equal(await prisma.importedTransaction.findUnique({ where: { id: item.id } }), null);
    });
  }

  test('confirmar importação continua rejeitando item de outro usuário', async () => {
    const owner = await user();
    const other = await user();
    const category = await prisma.category.create({ data: { name: 'Minha', user_id: owner.id } });
    const item = await prisma.importedTransaction.create({ data: {
      user_id: other.id, title: 'Privada', amount: 25, date: new Date('2026-11-04')
    } });
    const res = response();
    await importedController.confirm({ userId: owner.id, params: { id: item.id }, body: {
      category_id: category.id
    } }, res, (err) => { throw err; });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: 'Item não encontrado ou acesso negado.' });
    assert.ok(await prisma.importedTransaction.findUnique({ where: { id: item.id } }));
    assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 0);
  });

  for (const replacement of ['própria', 'null']) {
    test(`revisão explícita pode substituir categoria alheia salva por ${replacement}`, async () => {
      const owner = await user();
      const other = await user();
      const foreignCategory = await prisma.category.create({ data: { name: 'Privada', user_id: other.id } });
      const ownCategory = await prisma.category.create({ data: { name: 'Minha', user_id: owner.id } });
      const item = await prisma.importedTransaction.create({ data: {
        user_id: owner.id, title: 'Pendente', amount: 25, date: new Date('2026-11-04'),
        category_id: foreignCategory.id
      } });
      const category_id = replacement === 'própria' ? ownCategory.id : null;
      const res = response();
      await importedController.confirm({ userId: owner.id, params: { id: item.id }, body: {
        category_id
      } }, res, (err) => { throw err; });
      assert.equal(res.statusCode, 201);
      const saved = await prisma.transaction.findUnique({ where: { id: res.body.id } });
      assert.equal(saved.category_id, category_id);
      assert.equal(saved.user_id, owner.id);
      assert.equal(await prisma.importedTransaction.findUnique({ where: { id: item.id } }), null);
    });
  }

  for (const flow of ['importação', 'recorrência']) {
    test(`${flow}: formatos inválidos de categoria são rejeitados sem gravar`, async () => {
      const owner = await user();
      const item = await prisma.importedTransaction.create({ data: {
        user_id: owner.id, title: 'Pendente', amount: 25, date: new Date('2026-11-04')
      } });
      for (const category_id of ['', 'não-é-uuid', [randomUUID()], { id: randomUUID() }]) {
        let error;
        const res = response();
        const req = { userId: owner.id, params: { id: item.id }, body: {
          title: 'Tentativa', amount: 10, type: 'EXPENSE', start_date: '2026-11-04', category_id
        } };
        if (flow === 'importação') {
          await importedController.confirm(req, res, (err) => { error = err; });
        } else {
          await recurringController.create(req, res, (err) => { error = err; });
        }
        assert.ok(error instanceof require('zod').ZodError);
        assert.equal(res.statusCode, null);
      }
      assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 0);
      assert.equal(await prisma.recurringTransaction.count({ where: { user_id: owner.id } }), 0);
      assert.ok(await prisma.importedTransaction.findUnique({ where: { id: item.id } }));
    });
  }

  for (const installments_total of [undefined, 3]) {
    const mode = installments_total ? 'parcelamento' : 'recorrência';
    for (const categoryState of ['alheia', 'inexistente']) {
      test(`${mode}: rejeita categoria ${categoryState} sem criar ocorrências`, async () => {
        const owner = await user();
        const other = await user();
        const category = await prisma.category.create({ data: { name: 'Privada', user_id: other.id } });
        const res = response();
        await recurringController.create({ userId: owner.id, body: {
          title: 'Tentativa', amount: 10, type: 'EXPENSE', start_date: '2026-11-04',
          installments_total, user_id: other.id,
          category_id: categoryState === 'alheia' ? category.id : randomUUID()
        } }, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Categoria não encontrada ou acesso negado.' });
        assert.equal(await prisma.recurringTransaction.count({ where: { user_id: owner.id } }), 0);
        assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 0);
      });
    }

    for (const categoryState of ['própria', 'null', 'omitida']) {
      test(`${mode}: permite categoria ${categoryState} e preserva ocorrências`, async () => {
        const owner = await user();
        const category = await prisma.category.create({ data: { name: 'Minha', user_id: owner.id } });
        const categoryField = categoryState === 'própria' ? { category_id: category.id }
          : categoryState === 'null' ? { category_id: null } : {};
        const res = response();
        await recurringController.create({ userId: owner.id, body: {
          title: 'Conta', amount: 10, type: 'EXPENSE', start_date: '2026-11-04',
          installments_total, ...categoryField
        } }, res, (err) => { throw err; });
        assert.equal(res.statusCode, 201);
        const expectedCategory = categoryState === 'própria' ? category.id : null;
        const recurring = await prisma.recurringTransaction.findUnique({ where: { id: res.body.id } });
        assert.equal(recurring.category_id, expectedCategory);
        assert.equal(recurring.installments_generated, installments_total || 1);
        assert.equal(recurring.active, !installments_total);
        const rows = await prisma.transaction.findMany({ where: { recurring_transaction_id: recurring.id } });
        assert.equal(rows.length, installments_total || 1);
        for (const row of rows) {
          assert.equal(row.category_id, expectedCategory);
          assert.equal(row.user_id, owner.id);
          assert.equal(Number(row.amount), 10);
        }
      });
    }
  }

  test('consultas simultâneas não duplicam a mesma recorrência', async (t) => {
    freezeToday(t);
    const owner = await user();
    const recurring = await prisma.recurringTransaction.create({ data: {
      user_id: owner.id, title: 'Conta mensal', amount: 100, type: 'EXPENSE',
      start_date: new Date('2026-10-05T00:00:00Z'), installments_generated: 1
    } });
    // Sincroniza seis leituras reais para reproduzir deterministicamente
    // o contador desatualizado. Todas as gravações continuam no PostgreSQL.
    let reads = 0;
    let release;
    const ready = new Promise((resolve) => { release = resolve; });
    const concurrentClient = {
      recurringTransaction: {
        findMany: async (args) => {
          const result = await prisma.recurringTransaction.findMany(args);
          if (++reads === 6) release();
          await ready;
          return result;
        },
        update: prisma.recurringTransaction.update.bind(prisma.recurringTransaction)
      },
      transaction: prisma.transaction,
      $transaction: prisma.$transaction.bind(prisma)
    };
    await Promise.all(Array.from({ length: 6 }, () => generateDueRecurringTransactions(concurrentClient, owner.id)));
    const rows = await prisma.transaction.findMany({ where: { recurring_transaction_id: recurring.id } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].date.toISOString(), '2026-11-05T00:00:00.000Z');
    await generateDueRecurringTransactions(prisma, owner.id);
    assert.equal(await prisma.transaction.count({ where: { recurring_transaction_id: recurring.id } }), 1);
  });

  test('falha durante parcelamento não deixa parcelas nem recorrência incompletas', async () => {
    const owner = await user();
    // Falha real na segunda parcela, depois de a primeira ser gravada.
    await pool.query("CREATE FUNCTION fail_test_installment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = 'falha-controlada' AND NEW.installment_number = 2 THEN RAISE EXCEPTION 'falha controlada na segunda parcela'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_test_installment BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION fail_test_installment();");
    try {
      let error;
      await recurringController.create({ userId: owner.id, body: {
        title: 'falha-controlada', amount: 100, type: 'EXPENSE',
        start_date: '2026-11-04', installments_total: 3
      } }, response(), (err) => { error = err; });
      assert.ok(error, 'A falha do banco deve chegar ao tratamento de erros.');
      assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 0);
      assert.equal(await prisma.recurringTransaction.count({ where: { user_id: owner.id } }), 0);
    } finally {
      await pool.query('DROP TRIGGER fail_test_installment ON transactions; DROP FUNCTION fail_test_installment()');
    }
  });

  test('parcelamento normal mantém as parcelas e o ajuste de fim do mês', async () => {
    const owner = await user();
    const res = response();
    await recurringController.create({ userId: owner.id, body: {
      title: 'Compra parcelada', amount: 10, type: 'EXPENSE',
      start_date: '2026-01-31', installments_total: 3
    } }, res, (err) => { throw err; });
    assert.equal(res.statusCode, 201);
    const rows = await prisma.transaction.findMany({ where: { user_id: owner.id }, orderBy: { date: 'asc' } });
    assert.deepEqual(rows.map((row) => row.date.toISOString().slice(0, 10)), ['2026-01-31', '2026-02-28', '2026-03-31']);
    assert.deepEqual(rows.map((row) => row.installment_number), [1, 2, 3]);
    assert.equal(res.body.installments_generated, 3);
    assert.equal(res.body.active, false);
  });

  test('geração atrasada reverte contador e lançamentos após falha e permite tentar novamente', async (t) => {
    freezeToday(t);
    const owner = await user();
    const recurring = await prisma.recurringTransaction.create({ data: {
      user_id: owner.id, title: 'falha-recorrencia', amount: 25, type: 'EXPENSE',
      start_date: new Date('2026-09-05'), installments_generated: 1
    } });
    await pool.query("CREATE FUNCTION fail_test_recurring() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = 'falha-recorrencia' AND NEW.date = TIMESTAMP '2026-11-05' THEN RAISE EXCEPTION 'falha controlada na recorrencia'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_test_recurring BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION fail_test_recurring();");
    try {
      await assert.rejects(generateDueRecurringTransactions(prisma, owner.id));
      assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 0);
      const saved = await prisma.recurringTransaction.findUnique({ where: { id: recurring.id } });
      assert.equal(saved.installments_generated, 1);
    } finally {
      await pool.query('DROP TRIGGER fail_test_recurring ON transactions; DROP FUNCTION fail_test_recurring()');
    }
    await generateDueRecurringTransactions(prisma, owner.id);
    const rows = await prisma.transaction.findMany({ where: { user_id: owner.id }, orderBy: { date: 'asc' } });
    assert.deepEqual(rows.map((row) => row.date.toISOString().slice(0, 10)), ['2026-10-05', '2026-11-05']);
    const saved = await prisma.recurringTransaction.findUnique({ where: { id: recurring.id } });
    assert.equal(saved.installments_generated, 3);
  });

  test('recorrências canceladas e de outro usuário não geram lançamentos', async (t) => {
    freezeToday(t);
    const owner = await user();
    const other = await user();
    await prisma.recurringTransaction.createMany({ data: [
      { user_id: owner.id, title: 'Cancelada', amount: 10, type: 'EXPENSE', start_date: new Date('2026-09-05'), active: false },
      { user_id: other.id, title: 'Outro usuário', amount: 20, type: 'EXPENSE', start_date: new Date('2026-09-05') }
    ] });
    await generateDueRecurringTransactions(prisma, owner.id);
    assert.equal(await prisma.transaction.count({ where: { user_id: { in: [owner.id, other.id] } } }), 0);
  });

  test('saldo atual exclui datas futuras e mantém indicadores do mês inteiro', async (t) => {
    freezeToday(t);
    const owner = await user();
    await prisma.transaction.createMany({ data: [
      { user_id: owner.id, title: 'Saldo anterior', amount: 1000, type: 'INCOME', date: new Date('2026-10-01') },
      { user_id: owner.id, title: 'Receita hoje', amount: 100, type: 'INCOME', date: new Date('2026-11-04') },
      { user_id: owner.id, title: 'Despesa hoje', amount: 20, type: 'EXPENSE', date: new Date('2026-11-04') },
      { user_id: owner.id, title: 'Parcela amanhã', amount: 300, type: 'EXPENSE', date: new Date('2026-11-05') },
      { user_id: owner.id, title: 'Receita futura', amount: 500, type: 'INCOME', date: new Date('2026-12-01') }
    ] });
    const res = response();
    await transactions.getSummary({ userId: owner.id }, res, (err) => { throw err; });
    assert.deepEqual(res.body, { income: 100, expense: 320, total: 1080 });
    assert.equal(await prisma.transaction.count({ where: { user_id: owner.id } }), 5);
  });

  test('busca no histórico combina texto, tipo, data, usuário e paginação', async () => {
    const owner = await user();
    const other = await user();
    const base = { user_id: owner.id, amount: 20, type: 'EXPENSE', date: new Date('2026-11-05') };
    await prisma.transaction.createMany({ data: [
      { ...base, title: 'Mercado' },
      { ...base, title: 'Compras', description: 'Entrega do mercado', date: new Date('2026-11-04') },
      { ...base, title: 'Farmácia' },
      { ...base, title: 'Mercado antigo', date: new Date('2026-10-01') },
      { ...base, title: 'Mercado receita', type: 'INCOME' },
      { ...base, title: 'Mercado de outra pessoa', user_id: other.id }
    ] });
    const res = response();
    await transactions.listByUser({
      userId: owner.id,
      query: { search: ' MERCADO ', type: 'EXPENSE', startDate: '2026-11-01', page: 2, limit: 1 }
    }, res, (err) => { throw err; });
    assert.equal(res.body.meta.total, 2);
    assert.deepEqual(res.body.data.map((tx) => tx.title), ['Compras']);
  });

  test('resumo e lista simultâneos do dashboard não duplicam recorrências', async (t) => {
    freezeToday(t);
    const owner = await user();
    await prisma.recurringTransaction.create({ data: {
      user_id: owner.id, title: 'Internet', amount: 50, type: 'EXPENSE',
      start_date: new Date('2026-10-03'), installments_generated: 1
    } });
    const summary = response();
    const list = response();
    await Promise.all([
      transactions.getSummary({ userId: owner.id }, summary, (err) => { throw err; }),
      transactions.listByUser({ userId: owner.id, query: {} }, list, (err) => { throw err; })
    ]);
    assert.equal(summary.body.total, -50);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.meta.total, 1);
  });
}
