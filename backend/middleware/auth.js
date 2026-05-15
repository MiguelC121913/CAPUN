/**
 * @file auth.js
 * @description Express middleware that enforces JWT authentication on protected routes.
 *
 * Token format: the client sends the raw JWT string in the `Authorization` header
 * (no "Bearer " prefix). This matches how the frontend's fetch calls attach tokens
 * via localStorage.getItem('token').
 */
const jwt = require("jsonwebtoken");

/**
 * Verifies the JWT in the Authorization header and attaches the decoded
 * payload to `req.user` so downstream route handlers can read the user's
 * id and role without an extra database lookup.
 *
 * @param {import('express').Request}      req  - Must include `headers.authorization` with a valid JWT.
 * @param {import('express').Response}     res  - Returns 401 if token is absent or invalid.
 * @param {import('express').NextFunction} next - Called when verification succeeds.
 */
module.exports = function (req, res, next) {
  const token = req.header("Authorization");

  if (!token) return res.status(401).json({ error: "Acceso denegado" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // exposes { id, email, role } to every downstream handler
    next();
  } catch {
    // jwt.verify throws for expired, malformed, or tampered tokens
    res.status(400).json({ error: "Token no válido" });
  }
};
