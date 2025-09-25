// lib/mongoose.js
const mongoose = require('mongoose');

const PRIMARY_URI = process.env.MONGODB_URI; // main env var
const FALLBACK_URI = process.env.MONGODB_URI_NON_SRV || process.env.MONGODB_URI_FALLBACK; // optional fallback

if (!PRIMARY_URI) {
  throw new Error('Missing MONGODB_URI env var');
}

mongoose.set('strictQuery', false);
// you can set bufferCommands=false while debugging to surface errors immediately
mongoose.set('bufferCommands', true);

let cached = global._mongoose || (global._mongoose = { conn: null, promise: null });

async function tryConnect(uri, opts = {}) {
  return mongoose.connect(uri, opts).then(m => m);
}

async function connect() {
  if (cached.conn) return cached.conn;

  const baseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // fail faster
    socketTimeoutMS: 45000,
    family: 4 // << force IPv4 which often fixes SRV DNS issues on some hosts
  };

  // try primary (SRV or standard) first
  cached.promise = tryConnect(PRIMARY_URI, baseOpts)
    .then(m => {
      cached.conn = m;
      console.log('MongoDB connected (primary)');
      return cached.conn;
    })
    .catch(async (err) => {
      console.error('Mongo primary connect error:', err && err.message ? err.message : err);
      if (FALLBACK_URI) {
        try {
          const conn = await tryConnect(FALLBACK_URI, baseOpts);
          cached.conn = conn;
          console.log('MongoDB connected (fallback)');
          return cached.conn;
        } catch (err2) {
          console.error('Mongo fallback connect error:', err2 && err2.message ? err2.message : err2);
          throw err2;
        }
      }
      throw err;
    });

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connect, mongoose };
