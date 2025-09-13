// backend/models/VoteOption.js
const mongoose = require('mongoose');

const voteOptionSchema = new mongoose.Schema({
  optionId: { type: String, required: true, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
  text: { type: String, required: true, trim: true },
  detail_text: { type: String, trim: true, default: '' },
  isMain: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('VoteOption', voteOptionSchema);
