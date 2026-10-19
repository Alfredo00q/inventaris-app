const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { wrap, log, paginate, pick, str } = require('../helpers');
const { flash, requireAdmin, resetSettings } = require('../middleware');

router.get('/profil', (req, res) => res.render('profil', { title: 'Profil Saya' }));
router.post('/profil', wrap(async (req, res) => {
  const { lama, baru, ulang } = req.body, [[u]] = await db.query('SELECT password_hash FROM users WHERE id=?', [req.session.user.id]);
  if (!(await bcrypt.compare(String(lama || ''), u.password_hash))) flash(req, 'danger', 'Password lama salah.');
  else if (String(baru || '').length < 6) flash(req, 'danger', 'Password baru minimal 6 karakter.');
  else if (baru !== ulang) flash(req, 'danger', 'Konfirmasi password tidak sama.');
  else { await db.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(baru, 10), req.session.user.id]); log(req, 'Ganti password', req.session.user.username); flash(req, 'success', 'Password diganti.'); }
  res.redirect('/profil');
}));

router.use(requireAdmin);
router.get('/log', wrap(async (req, res) => {
  const q = str(req.query.q, 80), w = q ? 'WHERE g.aksi LIKE ? OR g.detail LIKE ? OR u.nama LIKE ?' : '', a = q ? Array(3).fill('%' + q + '%') : [];
  const [[{ n }]] = await db.query(`SELECT COUNT(*) n FROM activity_logs g LEFT JOIN users u ON u.id=g.user_id ${w}`, a);
  const pager = paginate(n, req.query.page, 15);
  const [rows] = await db.query(`SELECT g.*, u.nama FROM activity_logs g LEFT JOIN users u ON u.id=g.user_id ${w} ORDER BY g.id DESC LIMIT ? OFFSET ?`, [...a, pager.per, pager.offset]);
  res.render('log/index', { title: 'Log Aktivitas', rows, pager, qs: q ? 'q=' + encodeURIComponent(q) : '', q: { q } });
}));

router.get('/pengguna', wrap(async (req, res) => { const [rows] = await db.query('SELECT id,nama,username,role,aktif,created_at FROM users ORDER BY id'); res.render('pengguna/index', { title: 'Pengguna', rows }); }));
async function lastAdminGuard(id, role, aktif) {
  if (role === 'admin' && aktif) return true;
  const [[{ n }]] = await db.query("SELECT COUNT(*) n FROM users WHERE role='admin' AND aktif=1 AND id<>?", [id]); return n > 0;
}
router.post('/pengguna', wrap(async (req, res) => {
  const b = req.body, nama = str(b.nama, 100), username = str(b.username, 50).toLowerCase();
  if (!nama || !/^[a-z0-9._-]{3,50}$/.test(username) || String(b.password || '').length < 6) flash(req, 'danger', 'Isi nama, username (3+ huruf/angka) dan password minimal 6 karakter.');
  else try { await db.query('INSERT INTO users (nama,username,password_hash,role) VALUES (?,?,?,?)', [nama, username, await bcrypt.hash(b.password, 10), pick(b.role, ['admin', 'staff'], 'staff')]); log(req, 'Tambah pengguna', username); flash(req, 'success', 'Pengguna ditambahkan.'); }
  catch (e) { if (e.code !== 'ER_DUP_ENTRY') throw e; flash(req, 'danger', 'Username sudah dipakai.'); }
  res.redirect('/pengguna');
}));
router.post('/pengguna/:id', wrap(async (req, res) => {
  const id = +req.params.id, b = req.body, role = pick(b.role, ['admin', 'staff'], 'staff'), aktif = b.aktif ? 1 : 0;
  if (!str(b.nama, 100)) flash(req, 'danger', 'Nama wajib diisi.');
  else if (id === req.session.user.id && (!aktif || role !== 'admin')) flash(req, 'danger', 'Anda tidak bisa menonaktifkan atau menurunkan akun sendiri.');
  else if (!(await lastAdminGuard(id, role, aktif))) flash(req, 'danger', 'Harus tersisa minimal satu admin aktif.');
  else {
    await db.query('UPDATE users SET nama=?, role=?, aktif=? WHERE id=?', [str(b.nama, 100), role, aktif, id]);
    if (b.password) { if (String(b.password).length < 6) { flash(req, 'danger', 'Password minimal 6 karakter.'); return res.redirect('/pengguna'); } await db.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(b.password, 10), id]); }
    log(req, 'Ubah pengguna', '#' + id); flash(req, 'success', 'Pengguna diperbarui.');
  }
  res.redirect('/pengguna');
}));
router.post('/pengguna/:id/hapus', wrap(async (req, res) => {
  const id = +req.params.id;
  if (id === req.session.user.id) flash(req, 'danger', 'Anda tidak bisa menghapus akun sendiri.');
  else if (!(await lastAdminGuard(id, 'staff', 0))) flash(req, 'danger', 'Harus tersisa minimal satu admin aktif.');
  else { await db.query('DELETE FROM users WHERE id=?', [id]); log(req, 'Hapus pengguna', '#' + id); flash(req, 'success', 'Pengguna dihapus.'); }
  res.redirect('/pengguna');
}));

router.get('/pengaturan', (req, res) => res.render('pengaturan', { title: 'Pengaturan' }));
router.post('/pengaturan', wrap(async (req, res) => {
  for (const [k, v] of [['nama_aplikasi', str(req.body.nama_aplikasi, 40) || 'SIMASET'], ['nama_instansi', str(req.body.nama_instansi, 120)]])
    await db.query('INSERT INTO settings (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)', [k, v]);
  resetSettings(); log(req, 'Ubah pengaturan', ''); flash(req, 'success', 'Pengaturan disimpan.'); res.redirect('/pengaturan');
}));
module.exports = router;
