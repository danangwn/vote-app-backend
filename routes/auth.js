// backend/routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// register (add new user)
router.post(
  '/register',
  [
    body('name').isLength({ min: 1 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('role').optional().isIn(['admin', 'user'])
  ],
  userController.register
);

// login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 1 }).withMessage('Password required')
  ],
  userController.login
);

// logout - protected to check token and blacklist it
router.post('/logout', requireAuth, userController.logout);

module.exports = router;
