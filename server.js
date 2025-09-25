// backend/server.js
require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const { connect, mongoose } = require('./lib/mongoose'); // expect lib/mongoose to export connect() and mongoose
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const voteRoutes = require('./routes/votes');
const VoteOption = require('./models/VoteOption');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  const uptimeMs = Date.now() - serverStart; // how long server has been running
  const uptimeSec = Math.floor(uptimeMs / 1000);

  res.json({
    ok: true,
    message: "Vote app backend",
    timestamp: `${uptimeSec} seconds`,
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/votes", voteRoutes);

// Simple health
app.get('/', (req, res) => res.json({ ok: true, message: 'Vote app backend' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/votes', voteRoutes);

// Constants
const PORT = process.env.PORT || 4000;

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
}

if (require.main === module) {
  ensureConnected()
    .then(async () => {
      await ensureMainOptions(); // if needed
      app.listen(PORT, () => console.log("Connected"));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

const VoteOption = require("./models/VoteOption");
async function ensureMainOptions() {
  try {
    const required = [
      { text: 'Main option 1', detail_text: "Its the first main option" },
      { text: 'Main option 2', detail_text: "Its the second main option" },
    ];

    for (const opt of required) {
      const existing = await VoteOption.findOne({
        isMain: true,
        text: { $regex: `^${escapeRegex(opt.text.trim())}$`, $options: 'i' },
      });

      if (existing) continue;

      const created = new VoteOption({
        text: opt.text,
        detail_text: opt.detail_text,
        isMain: true,
      });
      await created.save();
      console.log('ensureMainOptions: created', opt.text);
    }
  } catch (err) {
    console.error('ensureMainOptions error', err && err.message ? err.message : err);
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = app;
