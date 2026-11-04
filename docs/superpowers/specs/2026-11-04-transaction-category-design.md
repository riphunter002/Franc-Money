# Propriedade da categoria em transações

Incremento autorizado na conversa: validar o proprietário da categoria em POST
/transactions e PUT /transactions/:id. Seguir BudgetController: consulta por
id e user_id extraído do token; categoria alheia ou inexistente retorna o mesmo
404, sem gravar a transação. No PUT verificar primeiro o dono da transação.

Preservar categoria própria, categoria ausente e null. Omissão no PUT mantém o
vínculo; null remove. Sem alterar cálculos, schema, dados históricos ou frontend.
Usar o precedente local em vez de criar uma camada nova de autorização para
dois pontos. Importação e recorrências permanecem para outro incremento; esta
correção não fecha todos os caminhos de associação de categorias no aplicativo.

Testar controllers e persistência reais em PostgreSQL local descartável novo.
Preservar branch e alterações pendentes. Sem commit, deploy ou migrations no
banco de desenvolvimento/produção.
