// src/services/emailService.js
// Envio de e-mail via Gmail (nodemailer). Usado hoje só pelo fluxo de
// redefinição de senha. Único lugar que fala com o servidor de e-mail —
// se um dia trocar o Gmail por outro provedor, é só aqui que muda.
const nodemailer = require('nodemailer');
const env = require('../config/env');

// Só dá pra enviar e-mail se as duas credenciais do Gmail existirem. Quando
// faltam (ex.: desenvolvimento local), o app funciona mesmo assim — quem
// chama trata esse caso mostrando o link no console em vez de enviar.
function isEmailConfigured() {
  return Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);
}

// Criado uma vez só (lazy): não faz sentido montar o transporter se o e-mail
// nem está configurado, e recriar a cada envio abriria conexão à toa.
let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

async function sendPasswordResetEmail(to, resetUrl) {
  const info = await getTransporter().sendMail({
    from: `"Franc Money" <${env.GMAIL_USER}>`,
    to,
    subject: 'Redefinição de senha — Franc Money',
    text: `Você pediu para redefinir sua senha no Franc Money.

Abra o link abaixo para criar uma nova senha (válido por 1 hora):
${resetUrl}

Se não foi você que pediu, pode ignorar este e-mail — sua senha continua a mesma.`,
  });
  return info;
}

module.exports = { isEmailConfigured, sendPasswordResetEmail };
