// src/services/emailService.js
// Envio de e-mail via Resend (https://resend.com). Usado hoje só pelo fluxo
// de redefinição de senha. Único lugar que fala com o provedor de e-mail — se
// um dia trocar o Resend por outro, é só aqui que muda.
const env = require('../config/env');

const RESEND_API_URL = 'https://api.resend.com/emails';

// Só dá pra enviar e-mail se a chave da API do Resend existir. Sem ela (ex.:
// desenvolvimento local), o app funciona mesmo assim — quem chama trata esse
// caso mostrando o link no console em vez de enviar.
function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY);
}

async function sendPasswordResetEmail(to, resetUrl) {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to,
      subject: 'Redefinição de senha — Franc Money',
      text: `Você pediu para redefinir sua senha no Franc Money.

Abra o link abaixo para criar uma nova senha (válido por 1 hora):
${resetUrl}

Se não foi você que pediu, pode ignorar este e-mail — sua senha continua a mesma.`,
    }),
  });

  if (!response.ok) {
    // Deixa o erro estourar pro errorHandler (vira 500). O texto ajuda a
    // entender no log do servidor o que o Resend recusou (ex.: remetente ou
    // destinatário não permitido no plano gratuito).
    const detail = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar e-mail pelo Resend (HTTP ${response.status}): ${detail}`);
  }

  return response.json();
}

module.exports = { isEmailConfigured, sendPasswordResetEmail };
