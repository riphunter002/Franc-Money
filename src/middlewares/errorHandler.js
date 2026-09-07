// src/middlewares/errorHandler.js
const { ZodError } = require('zod');

module.exports = (err, req, res, next) => {
  console.error(err);

  // Erros de validação do Zod (ex: título vazio, valor negativo, tipo inválido)
  // devem virar 400 (erro do cliente), não 500 (erro do servidor)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos.',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // Tratamento para erros conhecidos do Prisma (ex: violação de chave única / e-mail duplicado)
  if (err.code === 'P2002') {
    return res.status(400).json({
      error: 'Já existe um registro com esse valor para um campo único (ex: e-mail já cadastrado).'
    });
  }

  // Erro padrão de servidor
  return res.status(500).json({
    error: 'Erro interno do servidor.'
  });
};