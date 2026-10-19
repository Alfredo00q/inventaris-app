const router = require('express').Router();
const db = require('../db');
const { wrap, BLN } = require('../helpers');

router.get('/', wrap(async (req, res) => {
  const [[a]] = await db.query("SELECT COUNT(*) total, COALESCE(SUM(status='Tersedia'),0) tersedia, COALESCE(SUM(status='Dipinjam'),0) dipinjam, COALESCE(SUM(status='Perbaikan'),0) perbaikan FROM assets");
  const [[{ terlambat }]] = await db.query("SELECT COUNT(*) terlambat FROM loans WHERE status='Dipinjam' AND tgl_rencana_kembali < CURDATE()");
  const [kategori] = await db.query("SELECT COALESCE(c.nama,'Tanpa kategori') label, COUNT(*) n FROM assets a LEFT JOIN categories c ON c.id=a.category_id GROUP BY label ORDER BY n DESC");
  const [kondisi] = await db.query('SELECT kondisi label, COUNT(*) n FROM assets GROUP BY kondisi');
  const [bulan] = await db.query("SELECT DATE_FORMAT(tgl_pinjam,'%Y-%m') ym, COUNT(*) n FROM loans WHERE tgl_pinjam >= DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'), INTERVAL 5 MONTH) GROUP BY ym");
  const [aktif] = await db.query("SELECT l.*, a.nama aset, a.kode FROM loans l JOIN assets a ON a.id=l.asset_id WHERE l.status='Dipinjam' ORDER BY l.tgl_rencana_kembali ASC LIMIT 6");
  const [logs] = await db.query('SELECT g.*, u.nama FROM activity_logs g LEFT JOIN users u ON u.id=g.user_id ORDER BY g.id DESC LIMIT 6');

  const map = Object.fromEntries(bulan.map(b => [b.ym, b.n])), months = [], now = new Date();
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; months.push({ label: BLN[d.getMonth()], n: map[k] || 0 }); }
  const chartData = JSON.stringify({ kategori, months }).replace(/</g, '\\u003c');
  res.render('dashboard', { title: 'Dashboard', stats: { total: +a.total, tersedia: +a.tersedia, dipinjam: +a.dipinjam, perbaikan: +a.perbaikan, terlambat: +terlambat }, kondisi, aktif, logs, chartData, charts: true });
}));
module.exports = router;
