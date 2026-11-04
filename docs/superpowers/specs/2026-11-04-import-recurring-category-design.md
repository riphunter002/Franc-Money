# Categorias em importações e recorrências

Incremento autorizado após os commits das correções financeiras e dashboard.
Aplicar o padrão de propriedade das transações aos dois caminhos de criação
restantes: confirmação de importação e cadastro de recorrência/parcelamento.

Na confirmação, verificar primeiro o dono do item e depois a categoria final,
incluindo categoria persistida quando não houver override. Categoria ausente
ou null é permitida. Categoria alheia/inexistente retorna o mesmo 404 do fluxo
manual; item pendente e transações permanecem intactos quando rejeitado.

No cadastro de recorrência, validar categoria por id e usuário do token antes
das gravações. Preservar criação atômica do registro, ocorrências e contador.
Categoria própria, null e campo omitido continuam aceitos nos dois modos.

Manter verificações locais nos handlers, conforme o padrão já adotado, sem
nova camada, mudança de schema, frontend ou datas. Não reparar histórico nem
modificar a materialização de recorrências já existentes; estes estados podem
precisar de diagnóstico separado. Sem dados reais nos testes.
