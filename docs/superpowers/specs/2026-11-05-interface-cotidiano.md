# Franc Money — interface Cotidiano

Direção aprovada pelo usuário: layout da segunda opção, com navegação lateral,
hierarquia editorial, áreas abertas e divisórias discretas. Tema escuro preserva
azul profundo e dourado; tema claro usa branco quente, azul-marinho e ocre.

- Preservar funcionalidades existentes, logo, favicon e dados.
- HTML/CSS/JavaScript puro, sem novas dependências; estilos internos em dashboard.css.
- Tema persistente, escuro por padrão, acessível em todas as páginas.
- Início: saldo do controle (não saldo bancário), entradas/saídas do mês,
  importações para revisar, contas, próximos sete dias, gastos do mês e movimentações.
- Contas bancárias ainda não integradas: apresentar estado informativo, sem saldos fictícios.
- Próximos sete dias: despesas cadastradas de amanhã até sete dias depois, em UTC;
  não inferir pagamento ou vencimento de cartão.
- Falhas e carregamento distinguíveis de zero/ausência de registros.
- Navegação mantém acesso a transações, categorias, orçamentos, investimentos,
  importação e perfil. Layout responsivo e navegação por teclado.
- Nenhuma alteração no banco, credenciais, integração Pluggy ou publicação.
- Gráfico de evolução e filtros de período preservados em Análises, acessível no início.
