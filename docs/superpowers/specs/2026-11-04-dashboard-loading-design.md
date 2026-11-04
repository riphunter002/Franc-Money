# Dashboard: carregamento e falhas

Escopo aprovado na conversa: substituir exemplos financeiros do dashboard por
carregamento e tornar falhas de consulta visíveis, com teste de regressão.

## Abordagem

Usar os elementos e estilos existentes, sem bibliotecas novas. Os três cartões
mostram “—” até o resumo chegar. A tabela começa com “Carregando transações…”.
Resumo e lista recente têm resultados independentes: falha em um não esconde o
sucesso do outro. Falhas HTTP, de rede ou leitura da resposta mostram mensagem
com orientação para recarregar. Lista vazia e resumo zerado são sucessos.
As regiões indicam carregamento com aria-busy e mensagens acessíveis.

Manter exemplos confundiria demonstração com dados reais; substituir falhas por
zero daria significado financeiro incorreto. Não mudar gráficos, datas, cálculos,
backend ou banco. Não criar atualização automática ou novo fluxo de navegação.

Execução local na branch atual, preservando alterações pendentes. Sem commit,
push, deploy, instalação ou migrations nesta tarefa.
