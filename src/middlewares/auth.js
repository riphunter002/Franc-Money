// src/middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Erro no formato do token.' });
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formatado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'segredo_super_secreto', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    req.userId = decoded.id;
    return next();
  });
};