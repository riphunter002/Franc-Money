const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Executa o script real sem inicializar a interface nem fazer requisições.
const context = vm.createContext({ document: {
  getElementById: () => null,
  addEventListener: () => {}
} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/import.js'), 'utf8'), context);
const parseCsv = (csv) => JSON.parse(JSON.stringify(context.parseCsv(csv)));

test('CSV Nubank preserva ponto decimal e títulos com vírgula', () => {
  assert.deepEqual(parseCsv('date,title,amount\n2026-11-04,"Loja, Centro",12.34\n2026-11-05,Compra,1234.56'),
    { rows: [
      { date: '2026-11-04', title: 'Loja, Centro', amount: 12.34 },
      { date: '2026-11-05', title: 'Compra', amount: 1234.56 }
    ], errors: [] });
});

test('CSV brasileiro mantém separador de milhar e vírgula decimal', () => {
  assert.deepEqual(parseCsv('data;titulo;valor\n04/11/2026;Mercado;1.234,56').rows,
    [{ date: '2026-11-04', title: 'Mercado', amount: 1234.56 }]);
});

test('CSV brasileiro sem cabeçalho continua aceito', () => {
  assert.equal(parseCsv('04/11/2026;Mercado;12,34').rows[0].amount, 12.34);
});

test('CSV Nubank com vírgula decimal entre aspas continua aceito', () => {
  assert.equal(parseCsv('date,title,amount\n2026-11-04,Compra,"12,34"').rows[0].amount, 12.34);
});

test('CSV não aceita valor infinito como despesa', () => {
  const result = parseCsv('date,title,amount\n2026-11-04,Compra,Infinity');
  assert.equal(result.rows.length, 0);
  assert.equal(result.errors.length, 1);
});
