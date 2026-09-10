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
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Erro Crítico: Variáveis de ambiente inválidas ou ausentes:', _env.error.format());
  process.exit(1);
}

module.exports = _env.data;