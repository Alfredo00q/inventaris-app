const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { wrap, log, str } = require('../helpers');
const { flash, requireLogin } = require('../middleware');

const tries = new Map(); // pembatas percobaan login per IP (sederhana)
const blocked = ip => { const t = tries.get(ip); return t && t.n >= 5 && Date.now() - t.at < 10 * 60e3; };

router.get('/login', (req, res) => req.session.user ? res.redirect('/') : res.render('login', { layout: 'auth', title: 'Masuk' }));
router.post('/login', wrap(async (req, res) => {
  const ip = req.ip;
  if (blocked(ip)) { flash(req, 'danger', 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.'); return res.redirect('/login'); }
  const [[u]] = await db.query('SELECT * FROM users WHERE username=? AND aktif=1', [str(req.body.username, 50)]);
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) {
    const t = tries.get(ip) || { n: 0 }; tries.set(ip, { n: t.n + 1, at: Date.now() });
    flash(req, 'danger', 'Username atau password salah.'); return res.redirect('/login');
  }
  tries.delete(ip);
  const csrf = req.session.csrf;
  req.session.regenerate(err => {
    if (err) throw err;
    req.session.csrf = csrf; req.session.user = { id: u.id, nama: u.nama, username: u.username, role: u.role };
    log(req, 'Login', u.username); res.redirect('/');
  });
}));
router.post('/logout', requireLogin, (req, res) => { log(req, 'Logout', req.session.user.username); req.session.destroy(() => res.redirect('/login')); });
module.exports = router;
