// server/middlewares/auth.js
// Simple express middleware stub: expects Bearer token -> validate JWT
const jwt = require('jsonwebtoken');
const config = require('../config/default.json');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).send('missing auth');
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || config.jwtSecret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).send('invalid token');
  }
}

module.exports = { requireAuth };
