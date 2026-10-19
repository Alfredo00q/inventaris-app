const router = require('express').Router();
const db = require('../db');
const { wrap, log, paginate, pick, str } = require('../helpers');
const { flash } = require('../middleware');

const KONDISI = ['Baik', 'Rusak Ringan', 'Rusak Berat'], STATUS = ['Tersedia', 'Dipinjam', 'Perbaikan', 'Nonaktif'];
const cats = () => db.query('SELECT id,nama FROM categories ORDER BY nama').then(r => r[0]);

function filters(q) {
  const w = [], a = [];
  if (q.q) { w.push('(a.kode LIKE ? OR a.nama LIKE ? OR a.merk LIKE ? OR a.lokasi LIKE ?)'); a.push(...Array(4).fill('%' + str(q.q, 80) + '%')); }
  if (+q.kategori) { w.push('a.category_id=?'); a.push(+q.kategori); }
  if (STATUS.includes(q.status)) { w.push('a.status=?'); a.push(q.status); }
  if (KONDISI.includes(q.kondisi)) { w.push('a.kondisi=?'); a.push(q.kondisi); }
  return { where: w.length ? 'WHERE ' + w.join(' AND ') : '', args: a };
}
function body(b) {
  const th = parseInt(b.tahun_perolehan, 10);
  return {
    kode: str(b.kode, 30), nama: str(b.nama, 150), category_id: +b.category_id || null, merk: str(b.merk, 100) || null,
    tahun_perolehan: th >= 1900 && th <= 2100 ? th : null, kondisi: pick(b.kondisi, KONDISI, 'Baik'),
    lokasi: str(b.lokasi, 100) || null, penanggung_jawab: str(b.penanggung_jawab, 100) || null,
    status: pick(b.status, STATUS, 'Tersedia'), catatan: str(b.catatan, 2000) || null,
  };
}

router.get('/', wrap(async (req, res) => {
  const { where, args } = filters(req.query);
  const [[{ n }]] = await db.query(`SELECT COUNT(*) n FROM assets a ${where}`, args);
  const pager = paginate(n, req.query.page);
  const [rows] = await db.query(`SELECT a.*, c.nama kategori FROM assets a LEFT JOIN categories c ON c.id=a.category_id ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`, [...args, pager.per, pager.offset]);
  const qs = new URLSearchParams(Object.entries(req.query).filter(([k, v]) => k !== 'page' && v)).toString();
  res.render('aset/index', { title: 'Data Aset', rows, pager, qs, q: req.query, categories: await cats(), KONDISI, STATUS });
}));

router.get('/export.csv', wrap(async (req, res) => {
  const { where, args } = filters(req.query);
  const [rows] = await db.query(`SELECT a.kode,a.nama,c.nama kategori,a.merk,a.tahun_perolehan,a.kondisi,a.lokasi,a.penanggung_jawab,a.status FROM assets a LEFT JOIN categories c ON c.id=a.category_id ${where} ORDER BY a.kode`, args);
  const head = ['Kode', 'Nama', 'Kategori', 'Merk', 'Tahun', 'Kondisi', 'Lokasi', 'Penanggung Jawab', 'Status'];
  const esc = v => { v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const csv = '\ufeff' + [head, ...rows.map(r => Object.values(r))].map(r => r.map(esc).join(',')).join('\r\n');
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="data-aset.csv"' }).send(csv);
}));

router.get('/baru', wrap(async (req, res) => res.render('aset/form', { title: 'Tambah Aset', a: { kondisi: 'Baik', status: 'Tersedia' }, categories: await cats(), KONDISI, STATUS, action: '/aset' })));
router.post('/', wrap(async (req, res) => {
  const d = body(req.body);
  if (!d.nama) { flash(req, 'danger', 'Nama aset wajib diisi.'); return res.redirect('/aset/baru'); }
  if (!d.kode) { const [[{ m }]] = await db.query('SELECT COALESCE(MAX(id),0)+1 m FROM assets'); d.kode = 'AST-' + String(m).padStart(4, '0'); }
  const [r] = await db.query('INSERT INTO assets SET ?', d);
  log(req, 'Tambah aset', `${d.kode} - ${d.nama}`); flash(req, 'success', 'Aset berhasil ditambahkan.'); res.redirect('/aset/' + r.insertId);
}));

router.get('/:id', wrap(async (req, res, next) => {
  const [[a]] = await db.query('SELECT a.*, c.nama kategori FROM assets a LEFT JOIN categories c ON c.id=a.category_id WHERE a.id=?', [+req.params.id]);
  if (!a) return next();
  const [loans] = await db.query('SELECT * FROM loans WHERE asset_id=? ORDER BY id DESC LIMIT 20', [a.id]);
  res.render('aset/show', { title: a.nama, a, loans });
}));
router.get('/:id/edit', wrap(async (req, res, next) => {
  const [[a]] = await db.query('SELECT * FROM assets WHERE id=?', [+req.params.id]);
  if (!a) return next();
  res.render('aset/form', { title: 'Ubah Aset', a, categories: await cats(), KONDISI, STATUS, action: `/aset/${a.id}` });
}));
router.post('/:id', wrap(async (req, res, next) => {
  const [[old]] = await db.query('SELECT * FROM assets WHERE id=?', [+req.params.id]);
  if (!old) return next();
  const d = body(req.body);
  if (!d.nama || !d.kode) { flash(req, 'danger', 'Kode dan nama aset wajib diisi.'); return res.redirect(`/aset/${old.id}/edit`); }
  if (old.status === 'Dipinjam') d.status = 'Dipinjam'; // status dikelola lewat peminjaman
  await db.query('UPDATE assets SET ? WHERE id=?', [d, old.id]);
  log(req, 'Ubah aset', `${d.kode} - ${d.nama}`); flash(req, 'success', 'Perubahan disimpan.'); res.redirect('/aset/' + old.id);
}));
router.post('/:id/hapus', wrap(async (req, res, next) => {
  const [[a]] = await db.query('SELECT kode,nama FROM assets WHERE id=?', [+req.params.id]);
  if (!a) return next();
  try { await db.query('DELETE FROM assets WHERE id=?', [+req.params.id]); }
  catch (e) { if (e.code === 'ER_ROW_IS_REFERENCED_2') { flash(req, 'danger', 'Aset punya riwayat peminjaman, jadi tidak bisa dihapus. Ubah statusnya menjadi Nonaktif.'); return res.redirect('/aset/' + req.params.id); } throw e; }
  log(req, 'Hapus aset', `${a.kode} - ${a.nama}`); flash(req, 'success', 'Aset dihapus.'); res.redirect('/aset');
}));
module.exports = router;
