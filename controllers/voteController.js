const VoteOption = require("../models/VoteOption");
const Vote = require("../models/Vote");
const User = require("../models/user");
const mongoose = require("mongoose");

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

exports.submitVote = async (req, res) => {
  try {
    const { optionId, customText, customDetail } = req.body;
    const userId = req.user._id;

    let option;

    if (optionId) {
      option = await VoteOption.findOne({ optionId });
      if (!option) {
        return res.status(404).json({ message: 'Option not found' });
      }
    } else if (customText) {
      option = new VoteOption({
        text: customText,
        detail_text: customDetail || '',
        isMain: false
      });
      await option.save();
    } else {
      return res.status(400).json({ message: 'OptionId or customText required' });
    }

    const vote = await Vote.findOneAndUpdate(
      { userId },
      { answer: option.optionId, createdAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await User.findByIdAndUpdate(userId, { voteStatus: true });

    res.json({ message: 'Vote submitted', vote, option });
  } catch (err) {
    console.error('submitVote error', err);
    res.status(500).json({ message: 'Server error' });
  }
}

exports.getResults = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVoted = await Vote.countDocuments();
    const options = await VoteOption.aggregate([
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

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
