// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const voteRoutes = require("./routes/votes");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.json({ ok: true, message: "Vote app backend" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/votes", voteRoutes);

const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/local-vote-app";

  async function ensureConnected() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(MONGODB_URI, {});
}

if (require.main === module) {
  ensureConnected()
    .then(async () => {
      await ensureMainOptions(); // if needed
      app.listen(PORT, () => console.log('Connected'));
    })
    .catch(err => { console.error(err); process.exit(1); });
}

const VoteOption = require("./models/VoteOption");
async function ensureMainOptions() {
  try {
    const required = [
      { text: "Main option 1", detail_text: "Its the first main option" },
      { text: "Main option 2", detail_text: "Its the second main option" },
    ];

    for (const opt of required) {
      const existing = await VoteOption.findOne({
        isMain: true,
        text: { $regex: `^${escapeRegex(opt.text.trim())}$`, $options: "i" },
      });

      if (existing) {
        continue;
      }

      const created = new VoteOption({
        text: opt.text,
        detail_text: opt.detail_text,
        isMain: true,
      });

      await created.save();
    }
  } catch (err) {
    console.error("ensureMainOptions error", err);
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = app;

