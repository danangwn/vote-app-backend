// backend/lib/mongoose.js
const mongoose = require('mongoose');

const PRIMARY_URI = process.env.MONGODB_URI; // e.g. mongodb+srv://...
const FALLBACK_URI = process.env.MONGODB_URI_FALLBACK; // optional non-srv mongodb://host1:27017,host2:27017,... 

if (!PRIMARY_URI && !FALLBACK_URI) {
  throw new Error('Missing MONGODB_URI and MONGODB_URI_FALLBACK env vars');
}

mongoose.set('strictQuery', false);
// Set true in production; set false while debugging to fail fast
mongoose.set('bufferCommands', true);

let cached = global._mongoose || (global._mongoose = { conn: null, promise: null });

async function tryConnect(uri, opts = {}) {
  return mongoose.connect(uri, opts).then(m => m);
}

async function connect() {
  if (cached.conn) return cached.conn;
  if (cached.promise) return cached.promise;

  const baseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4, // prefer IPv4 — helps some SRV issues
  };

  // Try primary first (SRV is likely here)
  cached.promise = tryConnect(PRIMARY_URI, baseOpts)
    .then(m => {
      console.log('MongoDB connected (primary URI)');
      cached.conn = m;
      return cached.conn;
    })
    .catch(async (err) => {
      console.error('Mongo primary connect error:', err && err.message ? err.message : err);

      // If SRV failed and we have a non-SRV fallback, try it
      if (FALLBACK_URI) {
        try {
          const fallbackConn = await tryConnect(FALLBACK_URI, baseOpts);
          console.log('MongoDB connected (fallback non-SRV URI)');
          cached.conn = fallbackConn;
          return cached.conn;
        } catch (err2) {
          console.error('Mongo fallback connect error:', err2 && err2.message ? err2.message : err2);
          throw err2;
        }
      }

      // No fallback provided — rethrow original error
      throw err;
    });

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connect, mongoose };
