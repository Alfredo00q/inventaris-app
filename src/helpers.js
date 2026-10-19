const db = require('./db');
const BLN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const fmtDate = d => { if (!d) return '-'; const [y, m, t] = String(d).slice(0, 10).split('-'); return `${+t} ${BLN[+m - 1]} ${y}`; };
const fmtDateTime = d => d ? fmtDate(d) + ' ' + String(d).slice(11, 16) : '-';
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const log = (req, aksi, detail) =>
  db.query('INSERT INTO activity_logs (user_id,aksi,detail,ip) VALUES (?,?,?,?)', [req.session.user?.id || null, aksi, String(detail || '').slice(0, 250), req.ip]).catch(() => {});
function paginate(total, page, per = 10) {
  const pages = Math.max(1, Math.ceil(total / per)); page = Math.min(Math.max(+page || 1, 1), pages);
  return { total, page, pages, per, offset: (page - 1) * per };
}
const pick = (v, allowed, def) => (allowed.includes(v) ? v : def);
const str = (v, max = 255) => String(v ?? '').trim().slice(0, max);
const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
module.exports = { fmtDate, fmtDateTime, wrap, log, paginate, pick, str, todayISO, BLN };
