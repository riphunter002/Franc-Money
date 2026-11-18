const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function presentation() {
  const context = vm.createContext({});
  const file = require('node:path').join(__dirname, '../public/transactionPresentation.js');
  if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return context;
}

test('banco e forma de pagamento têm identidades independentes, com textos visíveis', () => {
  const { transactionPresentation: view } = presentation();
  assert.ok(view, 'apresentador disponível no navegador');
  for (const [bank, name, method, label] of [
    ['NUBANK', 'Nubank', 'PIX', 'Pix'], ['PAN', 'Banco PAN', 'DEBIT', 'Débito'],
    ['NUBANK', 'Nubank', 'CREDIT', 'Crédito'], ['PICPAY', 'PicPay', 'PIX_CREDIT', 'Pix no crédito']
  ]) {
    const result = view({ bank, payment_method: method, category: { name: 'Internet' } });
    assert.equal(result.bankName, name);
    assert.match(result.icons, /<svg/);
    assert.match(result.icons, /bank-mark/);
    assert.ok(result.payment.includes(label));
    assert.ok(result.className.includes(bank.toLowerCase()));
  }
});

test('banco desconhecido e parcelamento não inventam classificação', () => {
  const { transactionPresentation: view } = presentation();
  assert.ok(view);
  const result = view({ title: 'Nubank Pix', installment_number: 2, bank: '<img>', payment_method: 'whatever' });
  assert.equal(result.className, 'bank-row bank-row--manual');
  assert.equal(result.bankName, 'Banco não informado');
  assert.match(result.payment, /Forma a confirmar/);
  assert.ok(!result.icons.includes('<img>'));
});

test('ícone de categoria é decorativo e tem fallback sem categoria', () => {
  const { transactionPresentation: view } = presentation();
  assert.ok(view);
  assert.match(view({ category: { name: 'Internet' } }).icons, /aria-hidden="true"/);
  assert.notEqual(view({ category: { name: 'Internet' } }).icons, view({}).icons);
});
