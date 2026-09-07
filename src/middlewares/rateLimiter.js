// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 5, // Limita cada IP a 5 tentativas de requisição por janela
  message: {
    error: 'Muitas tentativas de login originadas deste IP. Por favor, tente novamente após 15 minutos.'
  },
  standardHeaders: true, // Retorna os limites nos cabeçalhos (headers) da resposta
  legacyHeaders: false, // Desabilita cabeçalhos antigos para economizar banda
});

module.exports = { loginLimiter };