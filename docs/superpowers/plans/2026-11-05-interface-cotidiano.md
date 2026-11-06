# Interface Cotidiano Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar a interface aprovada nos temas escuro e claro.
**Architecture:** Manter frontend estático e APIs existentes. Tema centralizado em
theme.js; dashboard.js mantém carregamento independente; dashboard.css fornece
estilos de todas as páginas internas.
**Tech Stack:** HTML, CSS, JavaScript, Node test runner.
**Spec:** docs/superpowers/specs/2026-11-05-interface-cotidiano.md

## Global Constraints
- Preservar funcionalidades existentes, logo, favicon e dados.
- HTML/CSS/JavaScript puro, sem novas dependências; estilos internos em dashboard.css.
- Tema persistente, escuro por padrão, acessível em todas as páginas.
- Falhas e carregamento distinguíveis de zero/ausência de registros.
- Nenhuma alteração no banco, credenciais, integração Pluggy ou publicação.

## Review Focus
- Armazenamento bloqueado: alternância de tema continua funcionando.
- Falha no meio da paginação: nunca exibir total parcial como completo.
- Datas nas fronteiras UTC: gastos só do mês e próximos dias só da janela definida.
- Tela de 375px: navegação, números e modal continuam utilizáveis.
- Contas sem integração: não sugerir que conexão ou saldo já está disponível.

### Task 1: Tema compartilhado
- [x] Testes RED de padrão escuro, persistência, alternância e storage indisponível.
- [x] Criar public/theme.js, com data-theme e botões data-theme-toggle.
- [x] Rodar testes GREEN; integrar script cedo em todas as páginas.

### Task 2: Dados do novo painel
- [x] Testes RED de paginação interrompida, mês UTC, próximos sete dias e revisão.
- [x] Ajustar public/dashboard.js e tests/dashboard.test.cjs sem quebrar modal.
- [x] Contratos: upcomingList, reviewNotice/reviewNoticeText, currentMonthLabel;
  categoryBreakdownList, transactionsBody e summary* preservados.
- [x] Testes GREEN; regiões opcionais toleram DOM ausente nos testes antigos.

### Task 3: Estrutura e estilos
- [x] Implementar dashboard editorial e navegação compartilhada, preservar formulários.
- [x] Criar accounts.html/accounts.js com estado honesto e sessão protegida.
- [x] Estilizar dois temas em dashboard.css/style.css; invalidar cache estático.
- [x] Verificar visualmente desktop/mobile, temas, menu e criação de lançamento.

### Task 4: Verificação e revisão
- [x] Rodar testes, sintaxe e git diff --check; testes de banco só em base descartável.
- [x] Revisão independente do diff; corrigir problemas relevantes e repetir checks afetados.
- [x] Entregar alterações locais revisáveis e explicitar integração bancária pendente.

## Progresso / decisões
- 2026-11-05: retomada confirmada; checkout limpo em fix/financial-regressions.
- Ruling: trabalhar no checkout atual autorizado pelo usuário, sem criar outro worktree;
  preservar continuidade no VS Code e evitar aprovação desnecessária para operação reversível.
- Interfaces: agente de tema possui apenas theme.js/tests/theme.test.cjs;
  agente de dados possui apenas dashboard.js/tests/dashboard.test.cjs;
  executor principal possui HTML, CSS, accounts.js, sw.js e documentação.
- Revisão P2: preservar evolução/filtros em analytics.html secundária. Ruling:
  mover essas análises para link no rodapé do início; mantém layout aprovado e recursos existentes.

- Verificação final: 66 testes passaram, zero falhas/ignorados; integração usou somente
  franc_money_test_categories_20261104, servidor PostgreSQL local descartável, parado após o teste.
- Sintaxe de todos os JS públicos, referências locais e IDs únicos nas 13 páginas,
  git diff --check: aprovados.
- Verificação visual com fixture isolada sem banco real: desktop, 1024px, 768px,
  375px; dois temas; menu; modal; criação de lançamento de demonstração; contas;
  páginas secundárias; filtros de análises. Dados do usuário não foram consultados.
- Revisão: acesso a análises restaurado; contraste do gráfico por tokens;
  ocultação SVG corrigida por atributos e teste comportamental.
- Alterações permanecem locais, sem commit, push, deploy ou integração Pluggy.
