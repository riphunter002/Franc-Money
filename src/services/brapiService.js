// src/services/brapiService.js
// Fala com a brapi.dev (https://brapi.dev) pra buscar a cotação real de
// ações/FIIs da B3. Único lugar do sistema que depende de um serviço
// externo -- se a brapi sair do ar ou mudar de formato, é só aqui que
// precisa mexer.
const env = require('../config/env');

const BASE_URL = 'https://brapi.dev/api/quote';

// Busca a cotação de UM ticker. O plano gratuito da brapi só permite 1
// ativo por requisição (testado na prática), por isso não dá pra buscar
// vários de uma vez só.
// Retorna { price, name } em caso de sucesso, ou null se o ativo não existir
// (não lança erro nesse caso — um ticker digitado errado não deveria
// derrubar a tela toda).
async function fetchQuote(ticker) {
  const url = `${BASE_URL}/${encodeURIComponent(ticker)}?token=${env.BRAPI_API_TOKEN}`;

  const response = await fetch(url);

  if (!response.ok) {
    // 401/404 nesse caso normalmente significa "ticker não existe" — a
    // brapi devolve uma mensagem de token faltando mesmo com token certo,
    // quando o ativo em si não é reconhecido
    return null;
  }

  const data = await response.json();
  const quote = data?.results?.[0];

  if (!quote || typeof quote.regularMarketPrice !== 'number') {
    return null;
  }

  return {
    price: quote.regularMarketPrice,
    name: quote.longName || quote.shortName || ticker
  };
}

module.exports = { fetchQuote };
