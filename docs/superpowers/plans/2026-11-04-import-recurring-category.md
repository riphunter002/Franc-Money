# Categorias em importações e recorrências — plano

> Execução: superpowers:executing-plans e test-driven-development.

**Objetivo:** rejeitar categoria alheia nos dois caminhos de criação.
**Arquitetura:** validar categoria final do importado e entrada da recorrência,
preservando as transações existentes do Prisma. JavaScript/PostgreSQL/node:test.
**Spec:** ../specs/2026-11-04-import-recurring-category-design.md

## Restrições e foco da revisão

Origem do usuário no token; 404 sem divulgar categoria; validar valor final da
importação; null remove e omissão mantém; autorização do item antes da categoria;
recorrência sem fim e parcelamento mantêm atomicidade. Não reparar histórico.

## Tarefa única

Arquivos: ImportedTransactionController.js, RecurringTransactionController.js,
tests/financial.integration.test.cjs, tests/README.md.
Interfaces HTTP e respostas de sucesso preservadas.

- [x] Acrescentar testes para categoria alheia/persistida/inexistente, proprietário
  do item, controles próprios/null/omitido e dois modos de recorrência.
- [x] Executar a suíte no PostgreSQL descartável e observar falhas esperadas.
- [x] Adicionar checagens nos handlers e rodar toda a suíte, sintaxe e diff.
- [x] Revisão independente de bypass/regressão; corrigir achados deste escopo.
- [x] Atualizar guia, encerrar instância de testes e comunicar resultado.

## Registro

Antes deste incremento, 30 testes passaram sem ignorados. Estado anterior salvo
nos commits locais 9e18dce e 3b0482e. Nenhum push ou deploy autorizado nesta etapa.

Sete cenários falharam antes da implementação: categoria alheia na revisão,
categoria alheia persistida, categoria inexistente e os dois modos de recorrência.
Depois: npm test com TEST_DATABASE_URL explícito no banco descartável
franc_money_test_categories_20261104, 52 aprovados, zero falhas/ignorados.
Os 22 novos casos preservam dados pendentes, validade do usuário autenticado,
categorias próprias/null/omitidas, revisão explícita de categoria persistida
indevida e validação de formatos. Sintaxe dos três JS/CJS e diff --check passaram.
Revisão final independente sem achados acionáveis. Trabalho mantido localmente;
sem alterações de dados reais ou migration nova. Instância descartável encerrada
ao concluir. Próximo tema recomendado: períodos e falhas dos gráficos do painel.
