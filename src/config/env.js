// src/config/env.js
require('dotenv').config(); // <-- ADICIONE ESTA LINHA NO TOPO
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url('A DATABASE_URL deve ser uma string de conexão válida.'),
  JWT_SECRET: z.string().min(8, 'O JWT_SECRET precisa ter no mínimo 8 caracteres para segurança.'),
  // Em produção, defina isso no .env com o domínio real do seu front-end
  // (ex.: "https://francmoney.com"). Aceita múltiplos domínios separados por vírgula.
  // Se não for definido, libera qualquer origem — só recomendado em desenvolvimento.
  ALLOWED_ORIGIN: z.string().optional().default('*'),
  // Token da brapi.dev (https://brapi.dev), usado pra buscar cotação real de
  // ações/FIIs na tela de Investimentos. Sem token, a API só libera 4
  // tickers de teste — praticamente inútil pra uma carteira de verdade.
  BRAPI_API_TOKEN: z.string().min(1, 'BRAPI_API_TOKEN é obrigatório para buscar cotações reais.'),
  // URL base usada pra montar o link de redefinição de senha enviado por
  // e-mail. Local: http://localhost:3333. Em produção, defina com a URL
  // real do site (ex.: https://franc-money.onrender.com).
  APP_BASE_URL: z.string().url().default('http://localhost:3333'),
  // Chave da API do Resend (https://resend.com), usada pra enviar o e-mail de
  // redefinição de senha. Pegue em https://resend.com/api-keys. É opcional:
  // sem ela, o app sobe normal e o link de reset cai no console do servidor
  // em vez de ser enviado (útil pra desenvolvimento local).
  RESEND_API_KEY: z.string().min(1).optional(),
  // Remetente do e-mail. No plano gratuito SEM domínio próprio, precisa ser
  // exatamente 'onboarding@resend.dev' e só envia pro e-mail da sua conta
  // Resend. Com um domínio verificado no Resend, pode virar algo como
  // 'Franc Money <nao-responda@seudominio.com>'.
  RESEND_FROM: z.string().default('Franc Money <onboarding@resend.dev>'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Erro Crítico: Variáveis de ambiente inválidas ou ausentes:', _env.error.format());
  process.exit(1);
}

module.exports = _env.data;