// lib/mongoose.js
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error("Missing MONGODB_URI env var");

mongoose.set("strictQuery", false); // optional
mongoose.set("bufferCommands", true); // set false to fail-fast while debugging

// Cache connection for serverless hot-reuse
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // reduce server selection time for faster failures:
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        family: 4, // force IPv4 DNS
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connect, mongoose };
