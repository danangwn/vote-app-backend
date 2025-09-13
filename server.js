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

// simple root
app.get("/", (req, res) => res.json({ ok: true, message: "Vote app backend" }));

// mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/votes", voteRoutes);

const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/local-vote-app";

  async function ensureConnected() {
  if (mongoose.connection.readyState === 1) {
    // already connected
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

// server.js (add or merge into your existing file)
// require VoteOption model at top of file
const VoteOption = require("./models/VoteOption");

/**
 * Ensure the required main options exist.
 * Call this once after DB connection is established.
 */
async function ensureMainOptions() {
  try {
    const required = [
      { text: "Main option 1", detail_text: "Its the first main option" },
      { text: "Main option 2", detail_text: "Its the second main option" },
    ];

    for (const opt of required) {
      // case-insensitive search for existing main option with same text
      const existing = await VoteOption.findOne({
        isMain: true,
        text: { $regex: `^${escapeRegex(opt.text.trim())}$`, $options: "i" },
      });

      if (existing) {
        console.log(
          `✅ Main option already exists: "${existing.text}" (optionId=${existing.optionId})`
        );
        continue;
      }

      // create it
      const created = new VoteOption({
        text: opt.text,
        detail_text: opt.detail_text,
        isMain: true,
      });

      await created.save();
      console.log(
        `➕ Inserted main option: "${created.text}" (optionId=${created.optionId})`
      );
    }
  } catch (err) {
    console.error("ensureMainOptions error", err);
    // Do not crash the server — log and continue. If you prefer to fail fast, rethrow.
  }
}

/** helper to escape regex metachars for exact match */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------- Example: where to call it ----------

mongoose.connect(MONGODB_URI, { })
  .then(async () => {
    console.log('✅ MongoDB connected');

    // ensure main options exist BEFORE starting to listen
    await ensureMainOptions();

    app.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

-------------------------------------------------- */
module.exports = app;

