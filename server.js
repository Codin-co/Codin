// Codin backend — zero dependencies. Run: node server.js  (Node >= 18)
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib'), c = require('crypto');
const PORT = process.env.PORT || 3000, PUB = path.join(__dirname, 'public'), DIR = path.join(__dirname, 'data');
const DBF = path.join(DIR, 'db.json'), ADMIN = (process.env.ADMIN_EMAIL || '').toLowerCase();
fs.mkdirSync(DIR, { recursive: true });

// ---- storage (JSON file, atomic write) ----
let db = { users: [], messages: [] }; try { db = JSON.parse(fs.readFileSync(DBF)); } catch {}
let timer; const save = () => { clearTimeout(timer); timer = setTimeout(() => { fs.writeFileSync(DBF + '.tmp', JSON.stringify(db)); fs.renameSync(DBF + '.tmp', DBF); }, 150); };

// ---- crypto: scrypt passwords + HMAC signed tokens ----
const SF = path.join(DIR, '.secret');
const SECRET = process.env.SECRET || (fs.existsSync(SF) ? fs.readFileSync(SF, 'utf8') : (() => { const s = c.randomBytes(32).toString('hex'); fs.writeFileSync(SF, s); return s; })());
const mac = p => c.createHmac('sha256', SECRET).update(p).digest('base64url');
const sign = u => { const p = Buffer.from(JSON.stringify({ id: u.id, exp: Date.now() + 7 * 864e5 })).toString('base64url'); return p + '.' + mac(p); };
const same = (a, b) => a.length === b.length && c.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const who = req => { const [p, s] = (req.headers.authorization || '').replace('Bearer ', '').split('.'); if (!s || !same(s, mac(p))) return; try { const d = JSON.parse(Buffer.from(p, 'base64url')); return d.exp > Date.now() && db.users.find(u => u.id === d.id); } catch {} };
const hash = (pw, salt = c.randomBytes(16).toString('hex')) => salt + ':' + c.scryptSync(pw, salt, 64).toString('hex');
const verifyPw = (pw, h) => same(hash(pw, h.split(':')[0]), h);

// ---- helpers ----
const hits = new Map();
const limited = (ip, max) => { const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 6e4); a.push(now); hits.set(ip, a); return a.length > max; };
const str = (v, n) => String(v ?? '').trim().slice(0, n);
const isMail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const fail = (code, fa, en) => { throw { code, msg: [fa, en] }; };

// ---- API routes ----
const routes = {
  'POST /api/register': b => {
    const name = str(b.name, 60), email = str(b.email, 120).toLowerCase(), pw = String(b.password || '');
    if (name.length < 2 || !isMail(email) || pw.length < 8 || pw.length > 100) fail(400, 'اطلاعات واردشده معتبر نیست', 'Invalid data');
    if (db.users.some(u => u.email === email)) fail(409, 'این ایمیل قبلاً ثبت شده است', 'Email already registered');
    const u = { id: c.randomUUID(), name, email, pass: hash(pw), at: new Date().toISOString() };
    db.users.push(u); save(); return { token: sign(u), user: { name, email } };
  },
  'POST /api/login': b => {
    const u = db.users.find(x => x.email === str(b.email, 120).toLowerCase());
    if (!u || !verifyPw(String(b.password || ''), u.pass)) fail(401, 'ایمیل یا رمز عبور اشتباه است', 'Wrong email or password');
    return { token: sign(u), user: { name: u.name, email: u.email } };
  },
  'GET /api/me': (b, req) => { const u = who(req) || fail(401, 'وارد نشده‌اید', 'Not logged in'); return { user: { name: u.name, email: u.email } }; },
  'POST /api/contact': async b => {
    if (b.website) return { ok: true }; // honeypot
    const m = { id: c.randomUUID(), name: str(b.name, 60), email: str(b.email, 120), subject: str(b.subject, 120), message: str(b.message, 2000), at: new Date().toISOString() };
    if (m.name.length < 2 || !isMail(m.email) || m.message.length < 5) fail(400, 'لطفاً فرم را کامل پر کنید', 'Please complete the form');
    db.messages.push(m); save();
    const { TG_TOKEN, TG_CHAT } = process.env; // optional Telegram notification
    if (TG_TOKEN && TG_CHAT) fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text: `📩 ${m.name} <${m.email}>\n${m.subject}\n\n${m.message}` }) }).catch(() => {});
    return { ok: true };
  },
  'GET /api/messages': (b, req) => { const u = who(req); if (!u || !ADMIN || u.email !== ADMIN) fail(403, 'دسترسی ندارید', 'Forbidden'); return db.messages.slice().reverse(); },
};

// ---- static files (cached in memory, gzip) ----
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const cache = new Map();
function serve(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(PUB, p);
  if (!file.startsWith(PUB)) return res.writeHead(403).end();
  let e = cache.get(file), st;
  try { st = fs.statSync(file); } catch { return res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 | پیدا نشد'); }
  if (!e || e.mtime !== st.mtimeMs) {
    const raw = fs.readFileSync(file), ext = path.extname(file), text = /html|css|javascript|json|svg/.test(MIME[ext] || '');
    e = { mtime: st.mtimeMs, type: MIME[ext] || 'application/octet-stream', raw, gz: text ? zlib.gzipSync(raw, { level: 9 }) : null, etag: '"' + c.createHash('md5').update(raw).digest('hex').slice(0, 16) + '"', long: !ext.includes('html') };
    cache.set(file, e);
  }
  const h = { 'content-type': e.type, etag: e.etag, 'cache-control': e.long ? 'public, max-age=604800' : 'no-cache', vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === e.etag) return res.writeHead(304, h).end();
  const gz = e.gz && /gzip/.test(req.headers['accept-encoding'] || '');
  if (gz) h['content-encoding'] = 'gzip';
  res.writeHead(200, h).end(gz ? e.gz : e.raw);
}

// ---- server ----
http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!req.url.startsWith('/api/')) return serve(req, res);
  const lang = /^en/i.test(req.headers['accept-language'] || '') ? 1 : 0, ip = req.socket.remoteAddress;
  const send = (code, obj) => res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(obj));
  try {
    const route = routes[req.method + ' ' + req.url.split('?')[0]];
    if (!route) return send(404, { error: 'Not found' });
    if (limited(ip, req.method === 'POST' ? 12 : 60)) return send(429, { error: ['تعداد درخواست زیاد است، کمی صبر کنید', 'Too many requests'][lang] });
    let body = '', size = 0;
    for await (const ch of req) { if ((size += ch.length) > 10240) return send(413, { error: 'Too large' }); body += ch; }
    let data = {}; try { data = body ? JSON.parse(body) : {}; } catch { fail(400, 'درخواست نامعتبر', 'Bad request'); }
    send(200, await route(data, req));
  } catch (e) { e.code ? send(e.code, { error: e.msg[lang] }) : (console.error(e), send(500, { error: 'Server error' })); }
}).listen(PORT, () => console.log(`Codin running → http://localhost:${PORT}`));
