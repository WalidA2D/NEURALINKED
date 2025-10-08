// server/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

/**
 * Middleware: vérifie le JWT "Authorization: Bearer <token>"
 * -> Remplit req.userId et req.userPseudo si OK
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Token d'authentification requis" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.userId = decoded.userId;
    req.userPseudo = decoded.pseudo;
    next();
  } catch (error) {
    console.error('Token invalide:', error);
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};
