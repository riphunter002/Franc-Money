# Testes de regressão

Execute npm test para verificar o importador e os estados do dashboard sem
acessar banco nem carregar .env.

Os testes de integração exigem PostgreSQL local descartável. Crie um banco
chamado franc_money_test (ou franc_money_test_<sufixo>) e defina
TEST_DATABASE_URL antes de executar npm test. Sem essa variável, a integração
fica explicitamente ignorada. O executor recusa endereços remotos e outros nomes.

**Atenção:** a integração recria o schema public desse banco de testes e aplica
os arquivos de migrations. Nunca aponte para dados que deseja preservar.

Exemplo PowerShell com um servidor local exclusivo na porta 55439:

    $env:TEST_DATABASE_URL = 'postgresql://franc_test@127.0.0.1:55439/franc_money_test'
    npm test
    Remove-Item Env:TEST_DATABASE_URL

As regressões verificam valores de CSV, concorrência real de recorrências,
rollback de parcelamentos após falha e exclusão de datas futuras do saldo atual.
Também verificam propriedade de categorias em POST/PUT de transações manuais:
categorias alheias/inexistentes são rejeitadas sem alterar dados; categorias
próprias, campo ausente e null preservam os contratos. Formatos inválidos seguem
a validação Zod, e transações alheias continuam protegidas.

Confirmação de importações e criação de recorrências/parcelamentos também
validam categorias. Os testes conferem a categoria final da revisão (inclusive
persistida), rejeição sem perder a pendência, alteração explícita para categoria
própria/null e as categorias de todas as ocorrências geradas. Não há saneamento
automático de vínculos históricos ou mudança da geração de recorrências antigas.
