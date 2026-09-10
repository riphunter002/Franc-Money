// src/services/dateRangeService.js
// Cálculos de período compartilhados entre controllers (Budget precisa do
// mês atual pra somar gastos; Transaction precisa do mesmo pro resumo do
// dashboard) — extraído daqui pra não duplicar o mesmo critério em dois
// lugares.

// Primeiro e último instante (UTC) do mês atual. UTC, não hora local: mesmo
// critério já usado no resto do app pra evitar o bug de fuso horário que
// corrigimos nas transações (meia-noite UTC virando o dia anterior em
// fusos atrás de UTC).
function currentMonthRangeUTC() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

module.exports = { currentMonthRangeUTC };
