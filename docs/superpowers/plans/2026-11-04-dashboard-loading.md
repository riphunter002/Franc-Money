# Estados do dashboard — plano de implementação

> Execução: superpowers:executing-plans, com test-driven-development.

**Objetivo:** nunca apresentar exemplos financeiros como resultado da API.
**Arquitetura:** estados separados para resumo e transações recentes, mantendo
o carregamento dos gráficos existente. HTML/CSS/JavaScript puro e node:test.
**Spec:** ../specs/2026-11-04-dashboard-loading-design.md

## Restrições

Preservar alterações locais e identidade visual. Sem banco, dependências novas,
commit ou publicação. npm run build aplica migrations e não será executado.

## Foco da revisão

Falha HTTP; rejeição de rede; sucesso parcial; zero/lista vazia; nova consulta
não manter valores anteriores visíveis como se tivessem sido atualizados.

## Tarefa única: estados do resumo e da lista recente

Arquivos: public/dashboard.html, public/dashboard.js, public/sw.js e
tests/dashboard.test.cjs. Interface pública refreshAll(token) preservada.

- [x] Criar testes de regressão executando o script real, com DOM e rede simulados.
- [x] Executar node --test tests/dashboard.test.cjs e confirmar falhas esperadas.
- [x] Remover exemplos HTML; implementar estados e consultas independentes.
- [x] Incrementar cache da PWA preservando a modificação anterior.
- [x] Rodar testes sem banco, sintaxe e git diff --check; revisar o diff.
- [x] Solicitar revisão independente; resolver problemas deste escopo.
- [x] Informar resultado e procedimento de conferência na interface.

## Registro de execução

Decisão: usar a branch atual porque contém correções ainda não commitadas que
precisam ser preservadas. A autorização “podemos começar conforme indicado”
cobre esta correção pequena; não reabrir decisões já estabelecidas.

Resultado: seis regressões falharam antes da implementação e os sete testes do
dashboard passaram depois. npm test sem TEST_DATABASE_URL: 12 passaram, um
marcador de integração ignorado (os sete cenários PostgreSQL não executados).
Sintaxe e diff --check passaram. Revisão independente sem achados no escopo.
Navegador: login fictício em servidor isolado, sem .env ou banco, e API com
erro 500; cartões mostraram “—” e mensagens de erro no resumo e na lista.
O erro conhecido dos gráficos (falha interpretada como histórico vazio) segue
fora desta alteração. Nenhum commit, push ou deploy realizado.
