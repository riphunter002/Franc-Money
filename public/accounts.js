const bankDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
});

function bankText(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderBank(bank) {
  const section = document.createElement('section');
  section.className = 'manage-row';
  section.append(bankText('h3', bank.name, 'panel__title'));

  if (bank.status === 'expired') {
    section.append(bankText('p', 'Autorização vencida. Renove a conexão no Meu Pluggy.'));
    return section;
  }
  if (bank.status === 'unavailable') {
    section.append(bankText('p', 'Não foi possível consultar este banco agora.'));
    return section;
  }
  if (bank.status === 'attention') {
    section.append(bankText('p', 'A conexão precisa de atenção. Confira o status no Meu Pluggy.'));
  }
  if (bank.lastUpdatedAt) {
    section.append(bankText('p', 'Última sincronização: ' +
      bankDateFormatter.format(new Date(bank.lastUpdatedAt))));
  }
  if (!bank.accounts.length) {
    section.append(bankText('p', 'Nenhuma conta ou cartão foi disponibilizado por este banco.'));
    return section;
  }

  const accounts = document.createElement('ul');
  accounts.className = 'manage-list';
  for (const account of bank.accounts) {
    const card = account.type === 'CREDIT';
    const row = document.createElement('li');
    row.className = 'manage-row';
    const title = card ? 'Cartão de crédito' : 'Conta bancária';
    const label = card ? 'Limite disponível' : 'Saldo disponível';
    const amount = account.amount === null || !account.currency ? 'Indisponível' :
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: account.currency }).format(account.amount);
    row.append(bankText('strong', account.name ? title + ' · ' + account.name : title));
    row.append(bankText('p', label + ': ' + amount));
    if (account.updatedAt) {
      row.append(bankText('small', 'Dados de ' + bankDateFormatter.format(new Date(account.updatedAt))));
    }
    accounts.append(row);
  }
  section.append(accounts);
  return section;
}

document.addEventListener('DOMContentLoaded', () => {
  const auth = getStoredAuth();
  if (!auth) {
    goToLogin();
    return;
  }
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearStoredAuth();
    goToLogin();
  });

  const results = document.getElementById('bankResults');
  const status = document.getElementById('bankStatus');
  const reload = document.getElementById('reloadBanks');

  async function loadBanks() {
    reload.disabled = true;
    results.setAttribute('aria-busy', 'true');
    results.replaceChildren();
    status.textContent = 'Consultando conexões bancárias…';
    try {
      const response = await fetchWithAuth('/bank-accounts', auth.token, { cache: 'no-store' });
      if (!response.ok) throw new Error('Consulta indisponível');
      const { banks } = await response.json();
      results.replaceChildren(...banks.map(renderBank));
      status.textContent = banks.length ? 'Dados fornecidos pelo Meu Pluggy.' : 'Nenhum banco configurado para esta conta.';
      reload.hidden = banks.length === 0;
    } catch {
      status.textContent = 'Não foi possível consultar as conexões agora.';
      reload.hidden = false;
    } finally {
      reload.disabled = false;
      results.setAttribute('aria-busy', 'false');
    }
  }

  reload.addEventListener('click', loadBanks);
  loadBanks();
});
