const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, userController.listUsers);
router.get('/:id', requireAuth, userController.getUser);
router.put(
  '/:id',
  requireAuth,
  [
    body('name').optional().isLength({ min: 1 }),
    body('email').optional().isEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('role').optional().isIn(['admin', 'user']),
    body('voteStatus').optional().isBoolean()
  ],
  userController.updateUser
);
router.delete('/:id', requireAuth, requireAdmin, userController.deleteUser);

module.exports = router;
