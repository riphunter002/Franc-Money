const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function iniciar({ salvo, bloqueado = false, pronto = false } = {}) {
  const eventos = {};
  const botoes = [0, 1].map(() => ({
    atributos: {}, label: { textContent: '' },
    setAttribute(nome, valor) { this.atributos[nome] = valor; },
    querySelector() { return this.label; },
    closest() { return this; },
  }));
  const raiz = { dataset: {}, style: {} };
  const meta = { setAttribute(nome, valor) { this[nome] = valor; } };
  const gravacoes = [];
  const document = {
    documentElement: raiz, readyState: pronto ? 'complete' : 'loading',
    querySelector: () => pronto ? meta : null,
    querySelectorAll: () => pronto ? botoes : [],
    addEventListener(nome, callback) { eventos[nome] = callback; },
  };
  const localStorage = {
    getItem() { if (bloqueado) throw Error('bloqueado'); return salvo; },
    setItem(...args) { if (bloqueado) throw Error('bloqueado'); gravacoes.push(args); },
  };
  const arquivo = path.join(__dirname, '../public/theme.js');
  vm.runInNewContext(fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '', { document, localStorage });
  return { raiz, botoes, meta, gravacoes,
    carregar() { pronto = true; eventos.DOMContentLoaded?.(); },
    clicar(indice = 0) { eventos.click?.({ target: botoes[indice], preventDefault() {} }); },
  };
}

test('aplica escuro imediatamente e atualiza meta após carregar o DOM', () => {
  const tela = iniciar();
  assert.equal(tela.raiz.dataset.theme, 'dark');
  assert.equal(tela.raiz.style.colorScheme, 'dark');
  tela.carregar();
  assert.equal(tela.meta.content, '#0a0e17');
});

test('restaura claro e ignora preferências inválidas', () => {
  const tela = iniciar({ salvo: 'light', pronto: true });
  assert.equal(tela.raiz.dataset.theme, 'light');
  assert.equal(tela.raiz.style.colorScheme, 'light');
  assert.equal(tela.meta.content, '#f6f5f1');
  assert.equal(iniciar({ salvo: 'invalido' }).raiz.dataset.theme, 'dark');
});

test('alternância sincroniza todos os botões e persiste a preferência', () => {
  const tela = iniciar();
  tela.carregar();
  for (const botao of tela.botoes) {
    assert.equal(botao.atributos['aria-label'], 'Ativar tema claro');
    assert.equal(botao.label.textContent, 'Modo claro');
  }
  tela.clicar(1);
  assert.equal(tela.raiz.dataset.theme, 'light');
  assert.deepEqual(tela.gravacoes, [['franc_theme', 'light']]);
  assert.equal(tela.meta.content, '#f6f5f1');
  for (const botao of tela.botoes) {
    assert.equal(botao.atributos['aria-label'], 'Ativar tema escuro');
    assert.equal(botao.atributos.title, 'Ativar tema escuro');
    assert.equal(botao.label.textContent, 'Modo escuro');
  }
  tela.clicar();
  assert.equal(tela.raiz.dataset.theme, 'dark');
  assert.deepEqual(tela.gravacoes[1], ['franc_theme', 'dark']);
});

test('storage bloqueado não impede inicialização nem alternância', () => {
  const tela = iniciar({ bloqueado: true });
  assert.equal(tela.raiz.dataset.theme, 'dark');
  tela.carregar();
  tela.clicar();
  assert.equal(tela.raiz.dataset.theme, 'light');
});
