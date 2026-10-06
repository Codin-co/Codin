// Codin backend — zero dependencies. Requires Node >= 22.13 (built-in node:sqlite).
// Run:  node server.js     (then open http://localhost:3000)
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const TOKEN_TTL = 7 * 24 * 3600; // seconds
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*"; // in production: "https://yourdomain.com"

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- secret (env or persisted random) ----------
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const f = path.join(DATA_DIR, ".jwt_secret");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8").trim();
  const s = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}
const SECRET = loadSecret();

// ---------- database ----------
const db = new DatabaseSync(path.join(DATA_DIR, "codin.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
const q = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userById: db.prepare("SELECT id, name, email FROM users WHERE id = ?"),
  insertUser: db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"),
  insertContact: db.prepare("INSERT INTO contacts (name, email, subject, message, ip) VALUES (?, ?, ?, ?, ?)"),
};

// ---------- messages (fa / en) ----------
const T = {
  fa: {
    badJson: "درخواست نامعتبر است.", tooBig: "حجم درخواست زیاد است.", notFound: "یافت نشد.",
    fields: "لطفاً همه فیلدها را درست پر کنید.", name: "نام باید حداقل ۲ حرف باشد.",
    email: "ایمیل نامعتبر است.", pass: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
    exists: "این ایمیل قبلاً ثبت شده است.", creds: "ایمیل یا رمز عبور اشتباه است.",
    rate: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.", auth: "ابتدا وارد شوید.",
    server: "خطای سرور. دوباره تلاش کنید.",
  },
  en: {
    badJson: "Invalid request.", tooBig: "Request too large.", notFound: "Not found.",
    fields: "Please fill in all fields correctly.", name: "Name must be at least 2 characters.",
    email: "Invalid email address.", pass: "Password must be at least 8 characters.",
    exists: "This email is already registered.", creds: "Incorrect email or password.",
    rate: "Too many requests. Please try again later.", auth: "Please log in first.",
    server: "Server error. Please try again.",
  },
};

class HttpError extends Error {
  constructor(status, key) { super(key); this.status = status; this.key = key; }
}

// ---------- passwords (scrypt) ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}
function verifyPassword(pw, stored) {
  const [saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(pw, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
const DUMMY_HASH = hashPassword("dummy-password"); // keeps login timing similar for unknown emails

// ---------- tokens (HS256 JWT) ----------
const b64u = (b) => Buffer.from(b).toString("base64url");
function signToken(payload) {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }));
  const sig = crypto.createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const sig = crypto.createHmac("sha256", SECRET).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], "base64url");
  if (given.length !== sig.length || !crypto.timingSafeEqual(given, sig)) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}

// ---------- rate limit (in-memory, per IP + bucket) ----------
const hits = new Map();
function rateLimit(ip, bucket, max, windowMs) {
  const key = `${bucket}:${ip}`, now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  if (arr.length > max) throw new HttpError(429, "rate");
}
setInterval(() => { // prevent unbounded growth
  const now = Date.now();
  for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k);
}, 600e3).unref();

// ---------- helpers ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v) => (typeof v === "string" ? v.trim() : "");
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

function clientIp(req) {
  // Only trust X-Forwarded-For if you run behind a reverse proxy: set TRUST_PROXY=1
  if (process.env.TRUST_PROXY && req.headers["x-forwarded-for"])
    return String(req.headers["x-forwarded-for"]).split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}
function readJson(req, limit = 20 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, "tooBig")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { const j = JSON.parse(Buffer.concat(chunks).toString() || "{}"); resolve(j && typeof j === "object" ? j : {}); }
      catch { reject(new HttpError(400, "badJson")); }
    });
    req.on("error", reject);
  });
}
function send(res, status, obj, extra = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), ...extra });
  res.end(body);
}

// ---------- routes ----------
const routes = {
  "POST /api/register": async (req) => {
    rateLimit(clientIp(req), "auth", 20, 15 * 60e3);
    const b = await readJson(req);
    const name = str(b.name), email = str(b.email).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
    if (name.length < 2 || name.length > 100) throw new HttpError(400, "name");
    if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, "email");
    if (password.length < 8 || password.length > 200) throw new HttpError(400, "pass");
    if (q.userByEmail.get(email)) throw new HttpError(409, "exists");
    let id;
    try { id = Number(q.insertUser.run(name, email, hashPassword(password)).lastInsertRowid); }
    catch (e) { if (/UNIQUE/i.test(String(e.message))) throw new HttpError(409, "exists"); throw e; }
    const user = { id, name, email };
    return [201, { token: signToken({ sub: id }), user }];
  },

  "POST /api/login": async (req) => {
    rateLimit(clientIp(req), "auth", 20, 15 * 60e3);
    const b = await readJson(req);
    const email = str(b.email).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
    if (!email || !password || password.length > 200) throw new HttpError(400, "fields");
    const u = q.userByEmail.get(email);
    const ok = verifyPassword(password, u ? u.password_hash : DUMMY_HASH);
    if (!u || !ok) throw new HttpError(401, "creds");
    return [200, { token: signToken({ sub: u.id }), user: publicUser(u) }];
  },

  "GET /api/me": async (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    const p = m && verifyToken(m[1]);
    const u = p && q.userById.get(p.sub);
    if (!u) throw new HttpError(401, "auth");
    return [200, { user: u }];
  },

  "POST /api/contact": async (req) => {
    const ip = clientIp(req);
    rateLimit(ip, "contact", 5, 60 * 60e3);
    const b = await readJson(req);
    const name = str(b.name), email = str(b.email), subject = str(b.subject), message = str(b.message);
    if (!name || name.length > 100 || !subject || subject.length > 200 || !message || message.length > 5000)
      throw new HttpError(400, "fields");
    if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, "email");
    q.insertContact.run(name, email, subject, message, ip);
    console.log(`[contact] ${name} <${email}>: ${subject}`);
    return [201, { ok: true }];
  },
};

// ---------- static files ----------
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json" };
function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); } // path traversal guard
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const lang = /^en/i.test(req.headers["accept-language"] || "") ? "en" : "fa";
  const baseHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept-Language",
    "X-Content-Type-Options": "nosniff",
  };
  for (const [k, v] of Object.entries(baseHeaders)) res.setHeader(k, v);

  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const pathname = new URL(req.url, "http://x").pathname;
  if (pathname.startsWith("/api/")) {
    const handler = routes[`${req.method} ${pathname}`];
    try {
      if (!handler) throw new HttpError(404, "notFound");
      const [status, body] = await handler(req);
      send(res, status, body);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: T[lang][e.key] });
      console.error(e);
      send(res, 500, { error: T[lang].server });
    }
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);
  res.writeHead(405); res.end();
});

server.listen(PORT, () => console.log(`Codin running on http://localhost:${PORT}`));
