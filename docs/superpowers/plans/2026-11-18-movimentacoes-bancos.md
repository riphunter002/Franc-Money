# Movimentações por banco — implementação

**Objetivo:** aplicar as prévias aprovadas ao PC e celular, com linhas nas cores dos bancos, ícone da categoria junto da marca e selos de pagamento independentes.

**Arquitetura:** preservar Express/Prisma e HTML/CSS/JS. Acrescentar banco e método opcionais aos lançamentos e recorrências; não deduzir essas informações pelo título ou parcelamento. A consulta Pluggy atual continua limitada a saldos; este trabalho não importa transações bancárias automaticamente.

**Referência:** prévias aprovadas nesta conversa em 18/11/2026, imagens exec-256329b3-7e69-48eb-ac2d-899fa73265e5 e exec-86b3a141-432f-4d75-8c31-0d2ae546c010.

## Restrições
- Registros antigos permanecem sem banco/método até classificação explícita.
- Banco: NUBANK, PICPAY, PAN ou null. Pagamento: PIX, DEBIT, CREDIT, PIX_CREDIT ou null.
- Não alterar saldos, valores, identidade de usuários ou conexão Pluggy.
- Filtros executados no servidor antes da paginação, sempre limitados ao usuário autenticado.
- Temas claro/escuro, toque, teclado e identificação por texto além das cores.
- Migração somente aditiva, sem alterações destrutivas no histórico.

## Tarefas
- [x] 1. Testar persistência, atualização parcial/null, validação, filtros e propagação das recorrências. Adicionar campos nullable, migration e suporte nos controllers/serviço.
- [x] 2. Testar apresentação de banco/método conhecidos e desconhecidos, escape de conteúdo e ações existentes. Implementar renderização compartilhada PC/mobile, formulário e filtros.
- [x] 3. Aplicar CSS responsivo e temas, atualizar cache PWA. Verificar telas largas e estreitas, executar suíte e revisar diff.

## Foco da revisão
- Banco nunca inferido pela descrição, nem crédito inferido de parcelamento.
- Limpar classificações deve persistir null; editar outros campos deve preservá-las.
- Recorrências novas propagam metadados, antigas continuam válidas.
- Busca/filtros/paginação não omitem resultados por filtragem apenas local.
- Títulos longos, sinais dos valores, ausência de categoria e ações acessíveis em telas estreitas.

## Verificação inicial
18/11/2026: npm test: 30 passaram, 1 integração PostgreSQL ignorada por ausência de TEST_DATABASE_URL. Branch codex/movimentacoes-bancos. Execução local autorizada pelo pedido de implementação; publicação ainda não realizada.


## Resultado da verificação
- 80 testes passaram, zero falhas/ignorados, com PostgreSQL descartável local na porta 55439. Migration aplicada somente ao banco de testes.
- Navegador Chromium: PC escuro/claro 1440px, mobile escuro/claro 390px, 320px e tablet 768px sem overflow horizontal ou erros JavaScript.
- Conferidos busca, filtros no servidor, limpeza da busca, edição com valores preenchidos, detalhes mobile e escape de conteúdo externo.
- Revisão independente do código sem achados relevantes. Ajustes visuais finais na largura da busca e rolagem dos atalhos de banco.
- Imagens da implementação com fixtures em C:/Users/User/.codex/visualizations/2026/11/18/franc-money-banks/.
- Não publicado. Dados pessoais e banco de produção não foram alterados.
