const router = require('express').Router();
const db = require('../db');
const { wrap, log, paginate, pick, str, todayISO } = require('../helpers');
const { flash } = require('../middleware');

const KONDISI = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');

router.get('/', wrap(async (req, res) => {
  const w = [], a = [], st = req.query.status;
  if (req.query.q) { w.push('(l.peminjam LIKE ? OR l.unit LIKE ? OR s.nama LIKE ? OR s.kode LIKE ?)'); a.push(...Array(4).fill('%' + str(req.query.q, 80) + '%')); }
  if (st === 'Dipinjam' || st === 'Dikembalikan') { w.push('l.status=?'); a.push(st); }
  if (st === 'Terlambat') w.push("l.status='Dipinjam' AND l.tgl_rencana_kembali < CURDATE()");
  const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
  const [[{ n }]] = await db.query(`SELECT COUNT(*) n FROM loans l JOIN assets s ON s.id=l.asset_id ${where}`, a);
  const pager = paginate(n, req.query.page);
  const [rows] = await db.query(`SELECT l.*, s.nama aset, s.kode, (l.status='Dipinjam' AND l.tgl_rencana_kembali < CURDATE()) terlambat FROM loans l JOIN assets s ON s.id=l.asset_id ${where} ORDER BY l.id DESC LIMIT ? OFFSET ?`, [...a, pager.per, pager.offset]);
  const qs = new URLSearchParams(Object.entries(req.query).filter(([k, v]) => k !== 'page' && v)).toString();
  res.render('peminjaman/index', { title: 'Peminjaman', rows, pager, qs, q: req.query, KONDISI });
}));

router.get('/baru', wrap(async (req, res) => {
  const [assets] = await db.query("SELECT id,kode,nama FROM assets WHERE status='Tersedia' ORDER BY nama");
  const t = todayISO(), plus = new Date(Date.now() + 7 * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  res.render('peminjaman/form', { title: 'Peminjaman Baru', assets, pre: +req.query.aset || 0, t, plus });
}));
router.post('/', wrap(async (req, res) => {
  const b = req.body, assetId = +b.asset_id, peminjam = str(b.peminjam, 100);
  if (!assetId || !peminjam || !isDate(b.tgl_pinjam) || !isDate(b.tgl_rencana_kembali) || b.tgl_rencana_kembali < b.tgl_pinjam) {
    flash(req, 'danger', 'Lengkapi aset, nama peminjam, dan tanggal (tanggal kembali tidak boleh sebelum tanggal pinjam).'); return res.redirect('/peminjaman/baru');
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[a]] = await conn.query('SELECT status,nama FROM assets WHERE id=? FOR UPDATE', [assetId]);
    if (!a || a.status !== 'Tersedia') { await conn.rollback(); flash(req, 'danger', 'Aset tidak tersedia untuk dipinjam.'); return res.redirect('/peminjaman/baru'); }
    await conn.query('INSERT INTO loans (asset_id,peminjam,unit,keperluan,tgl_pinjam,tgl_rencana_kembali,created_by) VALUES (?,?,?,?,?,?,?)',
      [assetId, peminjam, str(b.unit, 100) || null, str(b.keperluan) || null, b.tgl_pinjam, b.tgl_rencana_kembali, req.session.user.id]);
    await conn.query("UPDATE assets SET status='Dipinjam' WHERE id=?", [assetId]);
    await conn.commit(); log(req, 'Peminjaman', `${a.nama} oleh ${peminjam}`);
    flash(req, 'success', 'Peminjaman dicatat.'); res.redirect('/peminjaman');
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
router.post('/:id/kembali', wrap(async (req, res) => {
  const kondisi = pick(req.body.kondisi_kembali, KONDISI, 'Baik'), conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[l]] = await conn.query("SELECT l.*, s.nama FROM loans l JOIN assets s ON s.id=l.asset_id WHERE l.id=? AND l.status='Dipinjam' FOR UPDATE", [+req.params.id]);
    if (!l) { await conn.rollback(); flash(req, 'danger', 'Data peminjaman tidak ditemukan atau sudah dikembalikan.'); return res.redirect('/peminjaman'); }
    await conn.query("UPDATE loans SET status='Dikembalikan', tgl_kembali=CURDATE(), kondisi_kembali=?, catatan=? WHERE id=?", [kondisi, str(req.body.catatan) || null, l.id]);
    await conn.query('UPDATE assets SET status=?, kondisi=? WHERE id=?', [kondisi === 'Rusak Berat' ? 'Perbaikan' : 'Tersedia', kondisi, l.asset_id]);
    await conn.commit(); log(req, 'Pengembalian', `${l.nama} dari ${l.peminjam}`);
    flash(req, 'success', 'Pengembalian dicatat.'); res.redirect('/peminjaman');
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
module.exports = router;
