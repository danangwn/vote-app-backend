// backend/controllers/voteController.js
const VoteOption = require("../models/VoteOption");
const Vote = require("../models/Vote");
const User = require("../models/user"); // to count total users
const mongoose = require("mongoose");

/**
 * List main vote options (isMain == true)
 * GET /api/votes/options/main
 */
exports.listMainOptions = async (req, res) => {
  try {
    const options = await VoteOption.find({ isMain: true })
      .sort({ createdAt: 1 })
      .lean();
    return res.json({ items: options });
  } catch (err) {
    console.error("listMainOptions error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Submit a vote.
 * Body possibilities:
 * - { optionId: "<existing-optionId>" }
 * - { text: "new option text", detail_text: "..." }  -> creates new VoteOption with isMain=false then vote for it
 *
 * Behavior:
 * - If optionId present, ensure option exists, then upsert Vote for req.user._id so user has only one vote (update if exists).
 * - If optionId not present, must provide text; try to find existing option by text (case-insensitive), if found reuse it; otherwise create new option with isMain=false.
 * - Returns the option used and the saved vote.
 *
 * Endpoint: POST /api/votes/submit
 */
exports.submitVote = async (req, res) => {
// async function submitVote(req, res) {
  try {
    const { optionId, customText, customDetail } = req.body;
    const userId = req.user._id; // from JWT middleware

    let option;

    if (optionId) {
      // User selected an existing option
      option = await VoteOption.findOne({ optionId });
      if (!option) {
        return res.status(404).json({ message: 'Option not found' });
      }
    } else if (customText) {
      // User adds a new custom option (non-main)
      option = new VoteOption({
        text: customText,
        detail_text: customDetail || '',
        isMain: false
      });
      await option.save();
    } else {
      return res.status(400).json({ message: 'OptionId or customText required' });
    }

    // Record / update the user's vote
    const vote = await Vote.findOneAndUpdate(
      { userId }, // userId is already ObjectId
      { answer: option.optionId, createdAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // ✅ Update user voteStatus
    await User.findByIdAndUpdate(userId, { voteStatus: true });

    res.json({ message: 'Vote submitted', vote, option });
  } catch (err) {
    console.error('submitVote error', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// module.exports = { submitVote };

/**
 * Get voting results:
 * - totalUsers: count of all users
 * - totalVoted: how many users already voted
 * - options: array of { optionId, text, detail_text, isMain, votes, votersPercentageAgainstAllUsers }
 *
 * Endpoint: GET /api/votes/results
 */
exports.getResults = async (req, res) => {
  try {
    // total users
    const totalUsers = await User.countDocuments();

    // total votes
    const totalVoted = await Vote.countDocuments();

    // aggregate votes per option
    // We'll join VoteOption with Vote counts. Include options that exist even if votes = 0.
    const options = await VoteOption.aggregate([
      // left join votes by optionId
      {
        $lookup: {
          from: "votes",
          localField: "optionId",
          foreignField: "answer",
          as: "votes_docs",
        },
      },
      {
        $addFields: {
          votes: { $size: "$votes_docs" },
        },
      },
      {
        $project: {
          _id: 0,
          optionId: 1,
          text: 1,
          detail_text: 1,   
          isMain: 1,
          votes: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { isMain: -1, votes: -1, createdAt: 1 } },
    ]);

    // compute percentages vs totalUsers (if totalUsers === 0, percentage = 0)
    const computed = options.map((opt) => {
      const pctAllUsers = totalUsers > 0 ? (opt.votes / totalUsers) * 100 : 0;
      const pctOfVoters = totalVoted > 0 ? (opt.votes / totalVoted) * 100 : 0;
      return {
        ...opt,
        votes: opt.votes,
        percentOfAllUsers: Number(pctAllUsers.toFixed(2)),
        percentOfVoters: Number(pctOfVoters.toFixed(2)),
      };
    });

    return res.json({
      totalUsers,
      totalVoted,
      options: computed,
    });
  } catch (err) {
    console.error("getResults error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** helper to escape regex metachars for exact match */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
