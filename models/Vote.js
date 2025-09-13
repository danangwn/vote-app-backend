const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answer: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

voteSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
