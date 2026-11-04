# Propriedade da categoria — plano de implementação

> Execução: superpowers:executing-plans com test-driven-development.

**Objetivo:** impedir vincular categorias alheias em transações manuais.
**Arquitetura:** validação local nos dois handlers, conforme BudgetController.
**Stack:** JavaScript, Express, Prisma/PostgreSQL e node:test.
**Spec:** ../specs/2026-11-04-transaction-category-design.md

## Restrições e foco de revisão

Preservar alterações pendentes, origem user_id do token, 404 sem revelar a
existência da categoria, controle do proprietário da transação e semântica
omitido/null. Não ampliar para outros endpoints. Não usar .env nos testes.

## Tarefa única

Arquivos: src/controllers/TransactionController.js,
tests/financial.integration.test.cjs, tests/README.md.
Interfaces: create(req,res,next) e update(req,res,next), sem mudar sucessos.

- [x] Acrescentar testes reais: categoria alheia/inexistente (POST e PUT),
  categoria própria, ausência/null e tentativa de editar transação alheia.
- [x] Executar contra banco novo descartável e observar falhas esperadas.
- [x] Adicionar a checagem nos dois handlers e repetir a suíte completa.
- [x] Conferir sintaxe/diff e solicitar revisão independente de compatibilidade.
- [x] Atualizar guia e registrar evidências; informar limites desta etapa.

## Registro

Execução na branch atual para preservar correções não commitadas. Consentimento
para começar já fornecido na conversa. Instância de testes retomada sem initdb;
identidade do diretório, usuário e porta conferidos antes de criar banco novo.

Antes da correção, quatro testes falharam: POST/PUT aceitaram categoria alheia
e categoria inexistente chegou à falha de FK. Após a correção, npm test com
TEST_DATABASE_URL explícito no banco franc_money_test_categories_20261104:
30 testes aprovados, zero falhas e zero ignorados. Inclui 11 novos cenários de
categoria, sete regressões financeiras anteriores e 12 testes de CSV/dashboard.
node --check dos arquivos JS/CJS alterados e git diff --check passaram.
Investigação prévia e revisão final independentes confirmaram a fronteira;
revisão final sem achados concretos no incremento. Guia de testes atualizado.
Não houve build, migration nova, commit, push ou alterações de dados reais.
As seis migrations existentes foram aplicadas somente ao schema descartável
pelo executor de integração. A instância de testes será encerrada ao terminar.
