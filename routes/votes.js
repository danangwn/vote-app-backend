const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { requireAuth } = require('../middleware/auth');

router.get('/options/main', requireAuth, voteController.listMainOptions);
router.post('/submit', requireAuth, voteController.submitVote);
router.get('/results', requireAuth, voteController.getResults);

module.exports = router;
