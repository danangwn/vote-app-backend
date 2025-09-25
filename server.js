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

// Simple health
app.get('/', (req, res) => res.json({ ok: true, message: 'Vote app backend' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/votes', voteRoutes);

// Constants
const PORT = process.env.PORT || 4000;

// --- DB helpers -------------------------------------------------------------
/**
 * Ensure mongoose is connected using the shared connect() from lib/mongoose.
 * The lib/mongoose should implement caching & optional fallback (recommended).
 */
async function ensureConnected() {
  try {
    // connect() is expected to read process.env.MONGODB_URI and handle caching
    await connect();
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB connected (readyState=1)');
    } else {
      console.warn('MongoDB connected but readyState != 1:', mongoose.connection.readyState);
    }
  } catch (err) {
    console.error('ensureConnected error:', err && err.message ? err.message : err);
    throw err;
  }
}

// Initialize required "main options" in DB (run once after DB connection)
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

// --- Start server when run directly ----------------------------------------
let serverInstance = null;

async function startServer() {
  try {
    await ensureConnected();
    await ensureMainOptions();

    serverInstance = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

// If run directly (node backend/server.js) start an http server
if (require.main === module) {
  startServer();
}

// --- Graceful shutdown ------------------------------------------------------
async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  try {
    if (serverInstance) {
      await new Promise((resolve, reject) => {
        serverInstance.close((err) => (err ? reject(err) : resolve()));
      });
    }
    // close mongoose connection if present
    if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown', err && err.message ? err.message : err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// --- Exports for serverless / testing --------------------------------------
// For serverless platforms (and compatibility), expose both the express app
// and a serverless handler. Many platforms (including Vercel) will use the handler.
module.exports = app;
module.exports.handler = serverless(app);
