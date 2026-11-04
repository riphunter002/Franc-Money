const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Executa o script real, substituindo apenas DOM e rede. Não carrega .env.
function dashboard(fetchWithAuth) {
  const elements = Object.fromEntries([
    'summaryTotal', 'summaryIncome', 'summaryExpense', 'summaryStatus',
    'summarySection', 'transactionsBody'
  ].map((id) => [id, {
    textContent: '', innerHTML: '', attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; }
  }]));
  elements.summaryTotal.textContent = 'R$ 8.240,50';
  elements.transactionsBody.innerHTML = '<tr><td>Transação antiga</td></tr>';
  const context = vm.createContext({
    document: {
      getElementById: (id) => elements[id] || null,
      querySelector: () => null,
      addEventListener() {}
    },
    fetchWithAuth,
    currencyFormatter: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    escapeHtml: (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    dateFormatter: new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }),
    console: { error() {} }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/dashboard.js'), 'utf8'), context);
  return { context, elements };
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const emptyPage = { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } };

test('erro HTTP remove valores anteriores e mostra falha do resumo e da lista', async () => {
  const { context, elements } = dashboard(async () => ({ ok: false, status: 500 }));
  await context.refreshAll('token-ficticio');
  assert.equal(elements.summaryTotal.textContent, '—');
  assert.match(elements.summaryStatus.textContent, /não foi possível/i);
  assert.doesNotMatch(elements.transactionsBody.innerHTML, /Transação antiga/);
  assert.match(elements.transactionsBody.innerHTML, /não foi possível/i);
  assert.equal(elements.summarySection.attributes['aria-busy'], 'false');
  assert.equal(elements.transactionsBody.attributes['aria-busy'], 'false');
});

test('falha de rede aparece na interface sem manter saldo anterior', async () => {
  const { context, elements } = dashboard(async () => { throw new Error('Rede indisponível'); });
  await context.refreshAll('token-ficticio');
  assert.equal(elements.summaryTotal.textContent, '—');
  assert.match(elements.summaryStatus.textContent, /recarregue/i);
  assert.match(elements.transactionsBody.innerHTML, /não foi possível/i);
});

test('resumo bem-sucedido aparece mesmo se a lista recente falhar na rede', async () => {
  const { context, elements } = dashboard(async (url) => {
    if (url === '/summary') return ok({ total: 25, income: 30, expense: 5 });
    if (url === '/transactions?limit=5') throw new Error('Rede indisponível');
    return ok(emptyPage);
  });
  await context.refreshAll('token-ficticio');
  assert.equal(elements.summaryTotal.textContent, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(25));
  assert.equal(elements.summaryStatus.textContent, '');
  assert.match(elements.transactionsBody.innerHTML, /não foi possível/i);
});

test('lista recente bem-sucedida aparece mesmo se o resumo falhar na rede', async () => {
  const { context, elements } = dashboard(async (url) => {
    if (url === '/summary') throw new Error('Rede indisponível');
    return ok(emptyPage);
  });
  await context.refreshAll('token-ficticio');
  assert.match(elements.summaryStatus.textContent, /não foi possível/i);
  assert.match(elements.transactionsBody.innerHTML, /nenhuma transação registrada/i);
});

test('saldo zero e lista vazia são exibidos como sucesso', async () => {
  const { context, elements } = dashboard(async (url) =>
    ok(url === '/summary' ? { total: 0, income: 0, expense: 0 } : emptyPage));
  await context.refreshAll('token-ficticio');
  assert.match(elements.summaryTotal.textContent, /0,00/);
  assert.equal(elements.summaryStatus.textContent, '');
  assert.match(elements.transactionsBody.innerHTML, /nenhuma transação registrada/i);
});

test('durante nova consulta esconde valores anteriores e sinaliza carregamento', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const { context, elements } = dashboard(async (url) => {
    await pending;
    return ok(url === '/summary' ? { total: 0, income: 0, expense: 0 } : emptyPage);
  });
  const refresh = context.refreshAll('token-ficticio');
  try {
    assert.equal(elements.summaryTotal.textContent, '—');
    assert.match(elements.summaryStatus.textContent, /carregando/i);
    assert.match(elements.transactionsBody.innerHTML, /carregando/i);
    assert.equal(elements.summarySection.attributes['aria-busy'], 'true');
    assert.equal(elements.transactionsBody.attributes['aria-busy'], 'true');
  } finally {
    release();
    await refresh;
  }
});

test('resposta JSON inválida mostra erro e preserva o resultado independente', async () => {
  const { context, elements } = dashboard(async (url) => {
    if (url === '/summary') return { ok: true, json: async () => { throw new Error('JSON inválido'); } };
    return ok(emptyPage);
  });
  await context.refreshAll('token-ficticio');
  assert.equal(elements.summaryTotal.textContent, '—');
  assert.match(elements.summaryStatus.textContent, /não foi possível/i);
  assert.match(elements.transactionsBody.innerHTML, /nenhuma transação registrada/i);
});
