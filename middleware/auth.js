// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const BlacklistedToken = require('../models/BlacklistedToken');
const User = require('../models/user');
const dotenv = require('dotenv');
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'secret';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const token = authHeader.split(' ')[1];

    // check blacklist
    const black = await BlacklistedToken.findOne({ token });
    if (black) return res.status(401).json({ message: 'Token is invalidated (logged out)' });

    // verify
    const payload = jwt.verify(token, jwtSecret);

    // attach user (id + role) to req
    const user = await User.findById(payload.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin privilege required' });
  next();
}

module.exports = { requireAuth, requireAdmin, jwtSecret, jwtExpiresIn };
