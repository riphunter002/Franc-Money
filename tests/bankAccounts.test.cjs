const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBankAccountsHandler } = require('../src/services/bankAccounts');

const itemId = 'a0922d6f-2007-4169-a181-b961500608db';
const otherId = 'd940c4fa-4b8b-426b-aec4-a955cb1de39d';
const env = {
  PLUGGY_OWNER_USER_ID: 'owner-id',
  PLUGGY_CLIENT_ID: 'client-id',
  PLUGGY_CLIENT_SECRET: 'client-secret',
  PLUGGY_ITEMS: JSON.stringify([{ name: 'Nubank', itemId }, { name: 'PicPay', itemId: otherId }])
};

async function consult(config, fetcher, userId = 'owner-id') {
  const result = { status: 200 };
  const res = {
    set(name, value) { result[name] = value; return this; },
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; }
  };
  await createBankAccountsHandler(config, fetcher)({ userId }, res);
  return result;
}

test('outros usuários e configuração incompleta não consultam a Pluggy', async () => {
  const neverFetch = () => assert.fail('Consulta indevida');
  for (const result of [
    await consult(env, neverFetch, 'other-user'),
    await consult({ ...env, PLUGGY_OWNER_USER_ID: undefined }, neverFetch),
    await consult({ ...env, PLUGGY_ITEMS: 'inválido' }, neverFetch)
  ]) {
    assert.deepEqual(result.body, { banks: [] });
    assert.equal(result['Cache-Control'], 'private, no-store');
  }
});

test('consulta bancos separadamente e retorna apenas campos destinados à tela', async () => {
  const calls = [];
  const result = await consult(env, async (url, options) => {
    assert.equal(url.origin, 'https://api.pluggy.ai');
    calls.push(url.pathname);
    if (url.pathname === '/auth') {
      assert.equal(options.method, 'POST');
      return Response.json({ apiKey: 'api-key' });
    }
    assert.equal(options.headers['X-API-KEY'], 'api-key');
    if (url.pathname === '/items/' + otherId) return new Response('detalhe privado', { status: 500 });
    if (url.pathname === '/items/' + itemId) return Response.json({ id: itemId, status: 'UPDATED' });
    assert.equal(url.searchParams.get('itemId'), itemId);
    return Response.json({ totalPages: 1, results: [
      { type: 'BANK', name: 'Conta', balance: 0, currencyCode: 'BRL', number: 'segredo', taxNumber: 'cpf' },
      { type: 'CREDIT', name: 'Cartão', balance: 222, currencyCode: 'BRL', creditData: { availableCreditLimit: 200 } }
    ] });
  });
  assert.equal(calls.filter(path => path === '/auth').length, 1);
  assert.equal(result.body.banks[0].accounts[0].amount, 0);
  assert.equal(result.body.banks[0].accounts[1].amount, 200);
  assert.equal(result.body.banks[1].status, 'unavailable');
  assert.doesNotMatch(JSON.stringify(result.body), /segredo|cpf|api-key|detalhe privado|a0922d6f/);
});

test('consentimento vencido é distinguido de uma conta sem dados', async () => {
  const result = await consult(env, async (url) => {
    if (url.pathname === '/auth') return Response.json({ apiKey: 'api-key' });
    assert.match(url.pathname, /^\/items\//);
    return Response.json({ id: url.pathname.split('/').at(-1), status: 'UPDATED', consentExpiresAt: '2020-01-01' });
  });
  assert.ok(result.body.banks.every(bank => bank.status === 'expired'));
});

test('a rota exige JWT e ignora tentativas de escolher o titular por query', async () => {
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const configPath = require.resolve('../src/config/env');
  const secret = 'chave-usada-apenas-no-teste';
  require.cache[configPath] = {
    id: configPath, filename: configPath, loaded: true, exports: { ...env, JWT_SECRET: secret }
  };
  const app = express();
  app.use(require('../src/routes/bankAccountsRoutes'));
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/bank-accounts?userId=owner-id';
    assert.equal((await fetch(url)).status, 401);
    const token = jwt.sign({ id: 'other-user' }, secret);
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), { banks: [] });
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    delete require.cache[configPath];
  }
});
