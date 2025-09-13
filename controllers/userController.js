const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const BlacklistedToken = require('../models/BlacklistedToken');
const { jwtSecret, jwtExpiresIn } = require('../middleware/auth');
const Vote = require('../models/Vote');

const SALT_ROUNDS = 10;

function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const obj = userDoc.toObject ? userDoc.toObject() : userDoc;
  delete obj.password;
  return obj;
}

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: role || 'user'
    });
    await user.save();

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { id: user._id.toString(), role: user.role, name: user.name, email: user.email, voteStatus: user.voteStatus };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(400).json({ message: 'Token required' });
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
      await BlacklistedToken.create({ token, expiresAt });
    } else {
      const expiresAt = new Date(decoded.exp * 1000);
      await BlacklistedToken.create({ token, expiresAt });
    }
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, q } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter)
    ]);
    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: 'Not allowed to edit this user' });
    }

    const updates = {};
    const allowed = ['name', 'role', 'email', 'password', 'voteStatus'];
    allowed.forEach(key => {
      if (typeof req.body[key] !== 'undefined') updates[key] = req.body[key];
    });

    if (updates.email) updates.email = updates.email.toLowerCase();

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privilege required to delete user' });
    }
    if (req.user._id.toString() === id) {
      return res.status(403).json({ message: 'You cannot delete your own account' });
    }
    const voted = await Vote.exists({ userId: id });
    if (voted) {
      return res.status(400).json({ message: 'Cannot delete user who has already voted' });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({
      message: 'User deleted',
      userDeleted: { id: user._id.toString(), email: user.email }
    });
  } catch (err) {
    console.error('deleteUser error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
