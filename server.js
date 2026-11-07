// Codin backend — zero dependencies. Run: node server.js  (Node >= 18)
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib'), c = require('crypto');
const PORT = process.env.PORT || 3000, PUB = path.join(__dirname, 'public'), DIR = path.join(__dirname, 'data');
const DBF = path.join(DIR, 'db.json'), ADMIN = (process.env.ADMIN_EMAIL || '').toLowerCase();
fs.mkdirSync(DIR, { recursive: true });

// ---- storage (JSON file, atomic write) ----
let db = { users: [], messages: [], orders: [], seq: 1000 }; try { db = JSON.parse(fs.readFileSync(DBF)); } catch {}
db.users ||= []; db.messages ||= []; db.orders ||= []; db.seq ||= 1000;
let timer; const save = () => { clearTimeout(timer); timer = setTimeout(() => { try { fs.writeFileSync(DBF + '.tmp', JSON.stringify(db)); fs.renameSync(DBF + '.tmp', DBF); } catch (e) { console.error('db save failed:', e.message); } }, 150); };

const flush = () => { clearTimeout(timer); try { fs.writeFileSync(DBF + '.tmp', JSON.stringify(db)); fs.renameSync(DBF + '.tmp', DBF); } catch {} };
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { flush(); process.exit(0); }); // don't lose the last changes on stop/restart

// ---- crypto: scrypt passwords + HMAC signed tokens ----
const SF = path.join(DIR, '.secret');
const SECRET = process.env.SECRET || (fs.existsSync(SF) ? fs.readFileSync(SF, 'utf8') : (() => { const s = c.randomBytes(32).toString('hex'); try { fs.writeFileSync(SF, s); } catch (e) { console.error('secret save failed:', e.message); } return s; })());
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


// ---- orders / account helpers ----
const TYPES = ['web', 'mobile', 'ai', 'security', 'other'], STATUS = ['new', 'review', 'progress', 'delivered', 'cancelled'];
const isAdmin = u => !!(ADMIN && u && u.email === ADMIN);
const needUser = req => who(req) || fail(401, 'ابتدا وارد حساب خود شوید', 'Please log in first');
const needAdmin = req => { const u = needUser(req); if (!isAdmin(u)) fail(403, 'دسترسی ندارید', 'Forbidden'); return u; };
const pubOrder = o => ({ id: o.id, code: o.code, type: o.type, title: o.title, desc: o.desc, budget: o.budget, status: o.status, at: o.at, upd: o.upd, log: o.log });
const notify = text => { const { TG_TOKEN, TG_CHAT } = process.env; if (TG_TOKEN && TG_CHAT) fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text }) }).catch(() => {}); };
const ownOrder = (u, id) => db.orders.find(o => o.id === str(id, 60) && o.userId === u.id) || fail(404, 'سفارش پیدا نشد', 'Order not found');
const addLog = (o, by, text, status) => { const e = { at: new Date().toISOString(), by, text: str(text, 600) }; if (status) e.status = status; o.log.push(e); o.upd = e.at; };

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
  'GET /api/me': (b, req) => { const u = who(req) || fail(401, 'وارد نشده‌اید', 'Not logged in'); return { user: { name: u.name, email: u.email, at: u.at, admin: isAdmin(u) } }; },
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

  // ---- account: profile ----
  'POST /api/profile': (b, req) => {
    const u = needUser(req); const name = str(b.name, 60);
    if (name.length < 2) fail(400, 'نام معتبر نیست', 'Invalid name');
    u.name = name; save(); return { user: { name: u.name, email: u.email } };
  },
  // ---- account: orders ----
  'GET /api/orders': (b, req) => { const u = needUser(req); return db.orders.filter(o => o.userId === u.id).slice().reverse().map(pubOrder); },
  'POST /api/orders': (b, req) => {
    const u = needUser(req), type = str(b.type, 20), title = str(b.title, 80), desc = str(b.desc, 1500), budget = str(b.budget, 40);
    if (!TYPES.includes(type) || title.length < 3 || desc.length < 10) fail(400, 'لطفاً عنوان و توضیحات سفارش را کامل کنید', 'Please complete the order title and description');
    if (db.orders.filter(o => o.userId === u.id && ['new', 'review', 'progress'].includes(o.status)).length >= 20) fail(429, 'تعداد سفارش‌های فعال شما به حداکثر رسیده است', 'Too many active orders');
    const now = new Date().toISOString(), o = { id: c.randomUUID(), code: 'CD-' + (++db.seq), userId: u.id, type, title, desc, budget, status: 'new', at: now, upd: now, log: [] };
    addLog(o, 'system', '', 'new'); db.orders.push(o); save();
    notify(`🧾 سفارش جدید ${o.code}\n${u.name} <${u.email}>\n${type} | ${title}\n\n${desc}`);
    return pubOrder(o);
  },
  'POST /api/orders/note': (b, req) => {
    const u = needUser(req), o = ownOrder(u, b.id), text = str(b.text, 600);
    if (text.length < 2) fail(400, 'پیام خالی است', 'Empty message');
    addLog(o, 'user', text); save(); notify(`💬 پیام روی ${o.code} از ${u.name}\n${text}`); return pubOrder(o);
  },
  'POST /api/orders/cancel': (b, req) => {
    const u = needUser(req), o = ownOrder(u, b.id);
    if (!['new', 'review'].includes(o.status)) fail(409, 'این سفارش دیگر قابل لغو نیست', 'This order can no longer be cancelled');
    o.status = 'cancelled'; addLog(o, 'user', '', 'cancelled'); save(); notify(`❌ ${o.code} توسط ${u.name} لغو شد`); return pubOrder(o);
  },
  // ---- admin: manage all orders ----
  'GET /api/admin/orders': (b, req) => {
    needAdmin(req); const users = new Map(db.users.map(x => [x.id, x]));
    return db.orders.slice().reverse().map(o => ({ ...pubOrder(o), user: { name: users.get(o.userId)?.name || '-', email: users.get(o.userId)?.email || '-' } }));
  },
  'POST /api/admin/order': (b, req) => {
    needAdmin(req); const o = db.orders.find(x => x.id === str(b.id, 60)) || fail(404, 'سفارش پیدا نشد', 'Order not found');
    const status = str(b.status, 20), note = str(b.note, 600);
    if (status && !STATUS.includes(status)) fail(400, 'وضعیت نامعتبر است', 'Invalid status');
    if (!status && !note) fail(400, 'چیزی برای ثبت نیست', 'Nothing to save');
    if (status && status !== o.status) o.status = status;
    addLog(o, 'admin', note, status || undefined); save(); return pubOrder(o);
  },
  'POST /api/password': (b, req) => {
    const u = needUser(req), cur = String(b.current || ''), pw = String(b.password || '');
    if (!verifyPw(cur, u.pass)) fail(401, 'رمز فعلی اشتباه است', 'Current password is wrong');
    if (pw.length < 8 || pw.length > 100) fail(400, 'رمز جدید باید حداقل ۸ کاراکتر باشد', 'New password must be at least 8 characters');
    u.pass = hash(pw); save(); return { ok: true };
  },
};

// ---- static files (cached in memory, gzip) ----
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.webm': 'video/webm', '.woff2': 'font/woff2' };
const cache = new Map();
function serve(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(PUB, p);
  if (!file.startsWith(PUB)) return res.writeHead(403).end();
  let e = cache.get(file), st;
  try { st = fs.statSync(file); } catch { return res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 | پیدا نشد'); }
  if (!e || e.mtime !== st.mtimeMs) {
    const raw = fs.readFileSync(file), ext = path.extname(file), text = /html|css|javascript|json|svg/.test(MIME[ext] || '');
    e = { mtime: st.mtimeMs, type: MIME[ext] || 'application/octet-stream', raw, gz: text ? zlib.gzipSync(raw, { level: 9 }) : null, br: text && raw.length < 600000 ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }) : null, etag: '"' + c.createHash('md5').update(raw).digest('hex').slice(0, 16) + '"', long: !/\.(html|js|css)$/.test(ext) };
    cache.set(file, e);
  }
  const h = { 'content-type': e.type, etag: e.etag, 'cache-control': e.long ? 'public, max-age=604800' : 'no-cache', vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === e.etag) return res.writeHead(304, h).end();
  h['accept-ranges'] = 'bytes';
  const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (rg && !e.gz) {
    let a = rg[1] === '' ? Math.max(0, e.raw.length - +rg[2]) : +rg[1], z = rg[1] === '' || rg[2] === '' ? e.raw.length - 1 : Math.min(+rg[2], e.raw.length - 1);
    if (a > z || a >= e.raw.length) return res.writeHead(416, { 'content-range': 'bytes */' + e.raw.length }).end();
    h['content-range'] = `bytes ${a}-${z}/${e.raw.length}`; h['content-length'] = z - a + 1;
    return res.writeHead(206, h).end(e.raw.subarray(a, z + 1));
  }
  const ae = req.headers['accept-encoding'] || '', br = e.br && /\bbr\b/.test(ae), gz = !br && e.gz && /gzip/.test(ae);
  if (br) h['content-encoding'] = 'br'; else if (gz) h['content-encoding'] = 'gzip';
  res.writeHead(200, h).end(br ? e.br : gz ? e.gz : e.raw);
}

// ---- server ----
http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!req.url.startsWith('/api/')) return serve(req, res);
  const lang = /^en/i.test(req.headers['accept-language'] || '') ? 1 : 0, ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim();
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
