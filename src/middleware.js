const crypto = require('crypto');
const db = require('./db');
const { fmtDate, fmtDateTime } = require('./helpers');

const TONE = { Tersedia: 'success', Dipinjam: 'primary', Perbaikan: 'warning', Nonaktif: 'secondary', Baik: 'success', 'Rusak Ringan': 'warning', 'Rusak Berat': 'danger', Dikembalikan: 'success', Terlambat: 'danger', admin: 'primary', staff: 'secondary' };
const badge = v => `<span class="badge-soft tone-${TONE[v] || 'secondary'}">${String(v).replace(/[<>&"]/g, '')}</span>`;

let cache = { t: 0, v: {} };
async function getSettings(force) {
  if (!force && Date.now() - cache.t < 30000) return cache.v;
  const [rows] = await db.query('SELECT k,v FROM settings');
  cache = { t: Date.now(), v: Object.fromEntries(rows.map(r => [r.k, r.v])) };
  return cache.v;
}
const resetSettings = () => { cache.t = 0; };

async function locals(req, res, next) {
  const s = await getSettings().catch(() => ({}));
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  Object.assign(res.locals, {
    appName: s.nama_aplikasi || 'SIMASET', instansi: s.nama_instansi || '',
    user: req.session.user || null, csrfToken: req.session.csrf, path: req.path,
    flash: req.session.flash || null, fmtDate, fmtDateTime, badge, title: '',
  });
  delete req.session.flash;
  next();
}
const csrf = (req, res, next) => {
  if (req.method === 'POST') {
    const t = Buffer.from(String(req.body?._csrf || '')), s = Buffer.from(req.session.csrf || '');
    if (t.length !== s.length || !crypto.timingSafeEqual(t, s)) return res.status(403).render('error', { title: 'Ditolak', code: 403, msg: 'Sesi formulir tidak valid. Muat ulang halaman lalu coba lagi.', layout: 'auth' });
  }
  next();
};
const flash = (req, type, text) => { req.session.flash = { type, text }; };
const requireLogin = (req, res, next) => (req.session.user ? next() : res.redirect('/login'));
const requireAdmin = (req, res, next) => (req.session.user?.role === 'admin' ? next() : res.status(403).render('error', { title: 'Akses ditolak', code: 403, msg: 'Halaman ini hanya untuk admin.' }));
module.exports = { locals, csrf, flash, requireLogin, requireAdmin, getSettings, resetSettings };
