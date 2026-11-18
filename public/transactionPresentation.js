/* Identidade visual compartilhada pela tabela e pelos cartões mobile.
   Somente valores da lista permitida produzem classes ou marcação. */
function transactionPresentation(tx) {
  const banks = {
    NUBANK: { name: 'Nubank', mark: 'nu' },
    PICPAY: { name: 'PicPay', mark: 'P' },
    PAN: { name: 'Banco PAN', mark: 'PAN' }
  };
  const methods = {
    PIX: ['Pix', 'pix', 'M12 3 21 12 12 21 3 12Z'],
    DEBIT: ['Débito', 'debit', 'M3 6h18v12H3z M3 10h18 M6 14h3'],
    CREDIT: ['Crédito', 'credit', 'M3 6h18v12H3z M3 10h18 M6 14h3'],
    PIX_CREDIT: ['Pix no crédito', 'pix-credit', 'M6 4l5 5-5 5-5-5z M12 11h11v9H12z M12 14h11']
  };
  const paths = {
    internet: 'M2 8a16 16 0 0 1 20 0 M5 12a11 11 0 0 1 14 0 M8 16a6 6 0 0 1 8 0 M12 20h.01',
    mercado: 'M2 3h3l3 13h11l3-9H6 M9 21h.01 M18 21h.01',
    transporte: 'M5 5h14l2 11H3z M5 16v4 M19 16v4 M5 12h14 M6 15h.01 M18 15h.01',
    moradia: 'M3 11l9-8 9 8 M5 10v11h14V10 M10 21v-7h4v7',
    outros: 'M4 6h16v14H4z M8 3v6 M16 3v6 M8 13h8 M8 16h5'
  };
  const category = String(tx.category?.name || '').toLocaleLowerCase('pt-BR');
  let icon = paths.outros;
  if (/internet|telefone|telefonia/.test(category)) icon = paths.internet;
  else if (/aliment|mercado|supermercado/.test(category)) icon = paths.mercado;
  else if (/transport|combust|gasolina/.test(category)) icon = paths.transporte;
  else if (/moradia|casa|aluguel/.test(category)) icon = paths.moradia;
  const svg = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  const bank = Object.hasOwn(banks, tx.bank) ? banks[tx.bank] : null;
  const method = Object.hasOwn(methods, tx.payment_method) ? methods[tx.payment_method] : null;
  return {
    bankName: bank?.name || 'Banco não informado',
    className: `bank-row bank-row--${bank ? tx.bank.toLowerCase() : 'manual'}`,
    icons: `<span class="transaction-icons" aria-hidden="true">${svg(icon)}${bank ? `<span class="bank-mark bank-mark--${tx.bank.toLowerCase()}">${bank.mark}</span>` : ''}</span>`,
    payment: method
      ? `<span class="payment-badge payment-badge--${method[1]}">${svg(method[2])}${method[0]}</span>`
      : '<span class="payment-badge payment-badge--unknown">Forma a confirmar</span>'
  };
}
