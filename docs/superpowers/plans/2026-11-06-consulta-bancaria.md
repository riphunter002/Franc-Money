# Consulta bancária no Franc Money

Escopo aprovado. Consultar contas e cartões do Meu Pluggy dentro do Franc Money, começando pelo Nubank e usando a mesma configuração para PicPay e PAN.

1. Testar o acesso pelo ID do usuário autenticado e simular as respostas da Pluggy.
2. Adicionar uma rota autenticada de consulta. Ler as conexões por identificadores configurados no servidor e retornar somente os campos usados na tela.
3. Exibir saldo bancário, limite disponível e horário da última atualização informada. Distinguir consentimento expirado, ausência de dados e falha de consulta por banco.
4. Validar com dados simulados e documentar a configuração da primeira conexão real.

## Configuração no Render

Em **Environment** do serviço Franc Money, configure as quatro variáveis abaixo. Use os valores da mesma aplicação no Pluggy Dashboard. Mantenha as chaves no servidor.

| Variável | Valor |
| --- | --- |
| `PLUGGY_CLIENT_ID` | Client ID da aplicação Pluggy. |
| `PLUGGY_CLIENT_SECRET` | Client Secret da mesma aplicação. |
| `PLUGGY_OWNER_USER_ID` | ID do usuário titular no Franc Money. |
| `PLUGGY_ITEMS` | Lista JSON com o nome e o identificador de cada banco. |

Para copiar seu ID, entre no Franc Money com sua conta. No Console das ferramentas do navegador, execute `getStoredAuth()?.user.id`. Copie somente o ID exibido.

Para o primeiro banco, use este formato em `PLUGGY_ITEMS` e substitua o valor de exemplo pelo ID do Nubank em **Applications → Demo → Connected Items** no Pluggy Dashboard.

```json
[{"name":"Nubank","itemId":"ID-DO-ITEM-DO-NUBANK"}]
```

Para incluir PicPay ou PAN depois da autorização no Meu Pluggy, acrescente um objeto com o nome e o ID de cada conexão à mesma lista. Após publicar o código e aplicar as variáveis, entre com a conta titular e abra **Contas e cartões**. A data exibida é a da coleta informada pela Pluggy. **Consultar novamente** lê os dados já disponíveis na Pluggy.
