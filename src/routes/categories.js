const router = require('express').Router();
const db = require('../db');
const { wrap, log, str } = require('../helpers');
const { flash } = require('../middleware');

router.get('/', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT c.*, COUNT(a.id) jumlah FROM categories c LEFT JOIN assets a ON a.category_id=c.id GROUP BY c.id ORDER BY c.nama');
  res.render('kategori/index', { title: 'Kategori', rows });
}));
router.post('/', wrap(async (req, res) => {
  const nama = str(req.body.nama, 100);
  if (!nama) flash(req, 'danger', 'Nama kategori wajib diisi.');
  else try { await db.query('INSERT INTO categories (nama,deskripsi) VALUES (?,?)', [nama, str(req.body.deskripsi) || null]); log(req, 'Tambah kategori', nama); flash(req, 'success', 'Kategori ditambahkan.'); }
  catch (e) { if (e.code !== 'ER_DUP_ENTRY') throw e; flash(req, 'danger', 'Nama kategori sudah ada.'); }
  res.redirect('/kategori');
}));
router.post('/:id', wrap(async (req, res) => {
  const nama = str(req.body.nama, 100);
  if (!nama) flash(req, 'danger', 'Nama kategori wajib diisi.');
  else try { await db.query('UPDATE categories SET nama=?, deskripsi=? WHERE id=?', [nama, str(req.body.deskripsi) || null, +req.params.id]); log(req, 'Ubah kategori', nama); flash(req, 'success', 'Kategori diperbarui.'); }
  catch (e) { if (e.code !== 'ER_DUP_ENTRY') throw e; flash(req, 'danger', 'Nama kategori sudah ada.'); }
  res.redirect('/kategori');
}));
router.post('/:id/hapus', wrap(async (req, res) => {
  const [[{ n }]] = await db.query('SELECT COUNT(*) n FROM assets WHERE category_id=?', [+req.params.id]);
  if (n) flash(req, 'danger', `Kategori masih dipakai ${n} aset, pindahkan aset itu dulu.`);
  else { await db.query('DELETE FROM categories WHERE id=?', [+req.params.id]); log(req, 'Hapus kategori', '#' + req.params.id); flash(req, 'success', 'Kategori dihapus.'); }
  res.redirect('/kategori');
}));
module.exports = router;
