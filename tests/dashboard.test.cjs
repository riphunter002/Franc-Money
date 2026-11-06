const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Executa o script real, substituindo apenas DOM e rede. Não carrega .env.
function dashboard(fetchWithAuth, extraIds = [], now) {
  const elements = Object.fromEntries([
    'summaryTotal', 'summaryIncome', 'summaryExpense', 'summaryStatus',
    'summarySection', 'transactionsBody', ...extraIds
  ].map((id) => [id, {
    textContent: '', innerHTML: '', attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  }]));
  elements.summaryTotal.textContent = 'R$ 8.240,50';
  elements.transactionsBody.innerHTML = '<tr><td>Transação antiga</td></tr>';
  const context = vm.createContext({
    document: {
      getElementById: (id) => elements[id] || null,
      querySelector: () => null,
      addEventListener() {}
    },
    Date: now ? class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } } : Date,
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

test('gráfico usa meses UTC mesmo na virada com fuso brasileiro', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Sao_Paulo';
  try {
    const { context } = dashboard(async () => ok(emptyPage), [], '2026-11-01T00:10:00Z');
    const result = context.computeMonthlyBalances([
      { type: 'INCOME', date: '2026-09-30T23:59:59Z', amount: 100 },
      { type: 'EXPENSE', date: '2026-10-01T00:00:00Z', amount: 10 },
      { type: 'EXPENSE', date: '2026-11-01T00:00:00Z', amount: 20 },
      { type: 'EXPENSE', date: '2026-11-30T23:59:59Z', amount: 5 },
      { type: 'EXPENSE', date: '2026-12-01T00:00:00Z', amount: 500 }
    ], 2);
    assert.deepEqual(Array.from(result.labels), ['Out', 'Nov']);
    assert.deepEqual(Array.from(result.values), [90, 65]);
    assert.equal(context.formatMonthLabel(new Date('2026-11-01T00:00:00Z')), 'Nov');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('gráfico apaga dados anteriores no carregamento e erro, recupera no sucesso', async () => {
  let release;
  let pending;
  let falhar = false;
  const ids = ['trendChart', 'trendLine', 'trendArea', 'trendLabels', 'trendStatus', 'trendHoverDot', 'trendHoverLine'];
  const { context, elements } = dashboard(async () => {
    if (pending) await pending;
    if (falhar) throw Error('offline');
    return ok(emptyPage);
  }, ids, '2026-11-01T00:10:00Z');
  await context.refreshHistoricalTransactions('token');
  assert.match(elements.trendLine.attributes.d, /^M /);
  pending = new Promise(resolve => { release = resolve; });
  const refresh = context.refreshHistoricalTransactions('token');
  assert.match(elements.trendStatus.textContent, /carregando/i);
  assert.equal(elements.trendLine.attributes.d, '');
  assert.equal(elements.trendArea.attributes.d, '');
  assert.equal(elements.trendLabels.innerHTML, '');
  assert.equal(elements.trendChart.attributes.hidden, '');
  assert.equal(elements.trendHoverDot.attributes.hidden, '');
  assert.equal(elements.trendHoverLine.attributes.hidden, '');
  falhar = true;
  release();
  await refresh;
  assert.match(elements.trendStatus.textContent, /não foi possível/i);
  assert.equal(elements.trendChart.attributes.hidden, '');
  falhar = false;
  await context.refreshHistoricalTransactions('token');
  assert.equal(elements.trendStatus.hidden, true);
  assert.equal(elements.trendChart.attributes.hidden, undefined);
  assert.match(elements.trendLine.attributes.d, /^M /);
});

test('hover SVG mostra e oculta atributos sem depender da propriedade hidden', () => {
  const { context, elements } = dashboard(async () => ok(emptyPage), [
    'trendChart', 'trendLine', 'trendArea', 'trendLabels', 'trendHoverDot', 'trendHoverLine', 'trendTooltip'
  ]);
  const listeners = {};
  const rect = { left: 0, top: 0, width: 600, height: 220 };
  elements.trendChart.closest = () => ({ getBoundingClientRect: () => rect });
  elements.trendChart.getBoundingClientRect = () => rect;
  elements.trendChart.addEventListener = (name, callback) => { listeners[name] = callback; };
  elements.trendTooltip.style = {};
  context.renderTrendState('Carregando', true);
  context.renderTrendChart(['Out', 'Nov'], [1, 2]);
  context.initTrendChartHover();
  listeners.mousemove({ clientX: 100 });
  assert.equal(elements.trendHoverDot.attributes.hidden, undefined);
  assert.equal(elements.trendHoverLine.attributes.hidden, undefined);
  listeners.mouseleave();
  assert.equal(elements.trendHoverDot.attributes.hidden, '');
  assert.equal(elements.trendHoverLine.attributes.hidden, '');
  assert.equal(elements.trendTooltip.hidden, true);
});

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

const novosIds = ['upcomingList', 'categoryBreakdownList', 'reviewNotice', 'reviewNoticeText', 'currentMonthLabel'];
const agora = '2026-11-30T23:30:00Z';
const tx = (title, date, amount = 10, type = 'EXPENSE') => ({ title, date, amount, type });

test('paginação interrompida rejeita o histórico inteiro', async () => {
  const { context } = dashboard(async (url) => url.endsWith('page=1')
    ? ok({ data: [tx('Parcial', agora)], meta: { totalPages: 2 } }) : { ok: false });
  await assert.rejects(context.fetchAllTransactions('token'), /histórico|transações/i);
});

test('categorias padrão incluem só o mês UTC, inclusive parcelas futuras do mês', () => {
  const { context } = dashboard(async () => ok(emptyPage), [], '2026-11-01T00:10:00Z');
  const result = context.computeCategoryBreakdown([
    tx('Anterior', '2026-10-31T23:59:59Z', 100), tx('Início', '2026-11-01T00:00:00Z', 2),
    tx('Fim', '2026-11-30T23:59:59Z', 3), tx('Próximo', '2026-12-01T00:00:00Z', 200)
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 5);
});

test('próximos dias usam amanhã até dia +8 exclusivo em UTC, sem truncar e escapando títulos', async () => {
  const registros = [tx('Hoje', agora), tx('Fora', '2026-12-08T00:00:00Z'),
    tx('Receita', '2026-12-02T00:00:00Z', 1, 'INCOME'),
    ...Array.from({ length: 9 }, (_, i) => tx(i === 0 ? '<Primeiro>' : `Item ${i}`, `2026-12-0${i % 7 + 1}T00:00:00Z`))];
  const { context, elements } = dashboard(async (url) => ok(url === '/summary' ? {}
    : url === '/imported-transactions' ? [] : { data: registros, meta: { totalPages: 1 } }), novosIds, agora);
  await context.refreshAll('token');
  const html = elements.upcomingList.innerHTML;
  assert.equal((html.match(/class="upcoming-row"/g) || []).length, 9);
  assert.match(html, /&lt;Primeiro&gt;/);
  assert.doesNotMatch(html, /Hoje|Fora|Receita/);
  assert.ok(html.indexOf('Item 7') < html.indexOf('Item 6'));
});

test('revisão apresenta contagem e zero honesto; erro não vira zero', async () => {
  let resposta = ok([{}, {}]);
  const { context, elements } = dashboard(async (url) => url === '/imported-transactions' ? resposta
    : ok(url === '/summary' ? {} : emptyPage), novosIds, agora);
  await context.refreshAll('token');
  assert.match(elements.reviewNoticeText.textContent, /2.*revis/i);
  resposta = ok([]);
  await context.refreshAll('token');
  assert.match(elements.reviewNoticeText.textContent, /nenhuma.*revis/i);
  resposta = { ok: false };
  await context.refreshAll('token');
  assert.match(elements.reviewNoticeText.textContent, /não foi possível/i);
  assert.match(elements.upcomingList.innerHTML, /nenhuma despesa/i);
});

test('histórico mostra carregamento e falha, descarta cache anterior e independe de resumo/revisão', async () => {
  let release;
  let falhar = false;
  let pendente;
  const { context, elements } = dashboard(async (url) => {
    if (url === '/summary') return ok({ total: 42 });
    if (url === '/imported-transactions') return ok([{}]);
    if (url.includes('page=')) {
      if (pendente) await pendente;
      if (falhar) throw Error('offline');
      return ok({ data: [tx('Antigo', '2026-12-01T00:00:00Z')], meta: { totalPages: 1 } });
    }
    return ok(emptyPage);
  }, novosIds, agora);
  await context.refreshAll('token');
  pendente = new Promise(resolve => { release = resolve; });
  falhar = true;
  const refresh = context.refreshAll('token');
  assert.match(elements.upcomingList.innerHTML, /carregando/i);
  assert.match(elements.categoryBreakdownList.innerHTML, /carregando/i);
  release();
  await refresh;
  assert.match(elements.upcomingList.innerHTML, /não foi possível/i);
  assert.match(elements.categoryBreakdownList.innerHTML, /não foi possível/i);
  assert.doesNotMatch(elements.upcomingList.innerHTML, /Antigo/);
  assert.equal(vm.runInContext('cachedTransactions', context), null);
  assert.match(elements.summaryTotal.textContent, /42,00/);
  assert.match(elements.reviewNoticeText.textContent, /1.*revis/i);
});

test('rótulo do mês usa calendário UTC real', async () => {
  const { context, elements } = dashboard(async (url) => ok(url === '/summary' ? {}
    : url === '/imported-transactions' ? [] : emptyPage), novosIds, '2026-11-01T00:10:00Z');
  await context.refreshAll('token');
  assert.match(elements.currentMonthLabel.textContent, /novembro.*2026/i);
});

test('resumo lento não bloqueia histórico e revisão; revisão inválida ou offline é falha', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let resposta = ok({ data: [] });
  const { context, elements } = dashboard(async (url) => {
    if (url === '/summary') { await pending; return ok({ total: 1 }); }
    if (url === '/imported-transactions') {
      if (!resposta) throw Error('offline');
      return resposta;
    }
    return ok(emptyPage);
  }, novosIds, agora);
  const refresh = context.refreshAll('token');
  await new Promise(resolve => setImmediate(resolve));
  assert.match(elements.summaryStatus.textContent, /carregando/i);
  assert.match(elements.upcomingList.innerHTML, /nenhuma despesa/i);
  assert.match(elements.reviewNoticeText.textContent, /não foi possível/i);
  assert.equal(elements.reviewNotice.attributes['aria-busy'], 'false');
  release();
  await refresh;
  resposta = null;
  await context.refreshReview('token');
  assert.match(elements.reviewNoticeText.textContent, /não foi possível/i);
});
