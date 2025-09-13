// backend/routes/votes.js
const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { requireAuth } = require('../middleware/auth');

// list main options
router.get('/options/main', requireAuth, voteController.listMainOptions);

// submit vote (create option if needed)
router.post('/submit', requireAuth, voteController.submitVote);

// get results
router.get('/results', requireAuth, voteController.getResults);

module.exports = router;
