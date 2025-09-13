// backend/models/Vote.js
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answer: { type: String, required: true }, // stores VoteOption.optionId
  createdAt: { type: Date, default: Date.now }
});

// ensure one vote per user (unique index)
voteSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
