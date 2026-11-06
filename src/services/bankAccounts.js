const { z } = require('zod');

const connectionsSchema = z.array(z.object({
  name: z.string().trim().min(1).max(80),
  itemId: z.uuid()
})).min(1).max(5).refine(items =>
  new Set(items.map(item => item.itemId.toLowerCase())).size === items.length
);

function readConnections(value) {
  try {
    const result = connectionsSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

function validDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

function accountSummary(account) {
  const isCard = account.type === 'CREDIT';
  const amount = isCard ? account.creditData?.availableCreditLimit : account.balance;
  return {
    type: account.type,
    name: typeof account.name === 'string' ? account.name : null,
    amount: Number.isFinite(amount) ? amount : null,
    currency: typeof account.currencyCode === 'string' && /^[A-Z]{3}$/.test(account.currencyCode)
      ? account.currencyCode : null,
    updatedAt: validDate(account.updatedAt)
  };
}

function createBankAccountsHandler(env, fetcher = fetch) {
  const ownerId = env.PLUGGY_OWNER_USER_ID?.trim();
  const clientId = env.PLUGGY_CLIENT_ID?.trim();
  const clientSecret = env.PLUGGY_CLIENT_SECRET?.trim();
  const connections = readConnections(env.PLUGGY_ITEMS);

  async function request(path, options) {
    const response = await fetcher(new URL(path, 'https://api.pluggy.ai'), {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Consulta Pluggy indisponível.');
    return response.json();
  }

  async function readBank({ name, itemId }, headers) {
    try {
      const item = await request('/items/' + itemId, { headers });
      if (item.id !== itemId || typeof item.status !== 'string') throw new Error('Item inválido.');
      const lastUpdatedAt = validDate(item.lastUpdatedAt);
      const consent = validDate(item.consentExpiresAt);
      if ((consent && Date.parse(consent) <= Date.now()) ||
          item.error?.code === 'USER_AUTHORIZATION_EXPIRED') {
        return { name, status: 'expired', accounts: [] };
      }

      const data = await request('/accounts?' + new URLSearchParams({ itemId }), { headers });
      if (!Array.isArray(data.results) || data.totalPages > 1) {
        throw new Error('Lista de contas incompleta.');
      }
      const accounts = data.results
        .filter(account => account?.type === 'BANK' || account?.type === 'CREDIT')
        .map(accountSummary);
      const status = item.status === 'UPDATED' && !item.error ? 'ready' : 'attention';
      return { name, status, lastUpdatedAt, accounts };
    } catch {
      return { name, status: 'unavailable', accounts: [] };
    }
  }

  return async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    // Vincula a integração ao ID autenticado, que permanece estável se o e-mail mudar.
    if (!ownerId || req.userId !== ownerId || !clientId || !clientSecret || !connections.length) {
      return res.json({ banks: [] });
    }

    try {
      const { apiKey } = await request('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      if (typeof apiKey !== 'string' || !apiKey) throw new Error('Chave da API ausente.');
      const banks = await Promise.all(connections.map(connection =>
        readBank(connection, { 'X-API-KEY': apiKey })
      ));
      return res.json({ banks });
    } catch {
      return res.status(502).json({ error: 'Não foi possível consultar a Pluggy agora.' });
    }
  };
}

module.exports = { createBankAccountsHandler };
