// Membuat database + tabel + akun admin (+ data contoh). Jalankan: npm run setup
require('dotenv').config();
const fs = require('fs'), path = require('path'), mysql = require('mysql2/promise'), bcrypt = require('bcryptjs');
const ssl = process.env.DB_SSL_CA_PATH
  ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8'), rejectUnauthorized: true }
  : process.env.DB_SSL_CA
    ? { ca: process.env.DB_SSL_CA, rejectUnauthorized: true }
    : undefined;
const kosong = process.argv.includes('--kosong');
(async () => {
  const name = process.env.DB_NAME || 'db_inventaris';
const db = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: name,
  ssl,
  multipleStatements: true,
}); 

  await db.query(fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8'));

  const [[{ n }]] = await db.query('SELECT COUNT(*) n FROM users');
  if (!n) {
    const pw = process.env.ADMIN_PASSWORD || 'admin123';
    await db.query("INSERT INTO users (nama,username,password_hash,role) VALUES ('Administrator','admin',?,'admin')", [await bcrypt.hash(pw, 10)]);
    console.log('Akun admin dibuat -> username: admin | password:', pw);
  }
  await db.query("INSERT IGNORE INTO settings (k,v) VALUES ('nama_aplikasi','SIMASET'),('nama_instansi','Nama Instansi Anda')");

  const [[{ c }]] = await db.query('SELECT COUNT(*) c FROM assets');
  if (!kosong && !c) {
    await db.query("INSERT IGNORE INTO categories (nama,deskripsi) VALUES ('Elektronik','Komputer, printer, dan perangkat elektronik'),('Furnitur','Meja, kursi, lemari'),('Jaringan','Router, switch, dan perangkat jaringan')");
    const [cats] = await db.query('SELECT id,nama FROM categories'); const id = Object.fromEntries(cats.map(x => [x.nama, x.id]));
    const A = [
      ['AST-0001','Laptop Lenovo ThinkPad E14','Elektronik','Lenovo',2023,'Baik','Ruang IT','Bagian Umum','Tersedia'],
      ['AST-0002','PC Desktop Dell OptiPlex','Elektronik','Dell',2021,'Baik','Ruang Staf','Bagian Umum','Dipinjam'],
      ['AST-0003','Printer Epson L3250','Elektronik','Epson',2022,'Baik','Ruang Administrasi','Bagian Umum','Tersedia'],
      ['AST-0004','Proyektor Epson EB-X06','Elektronik','Epson',2020,'Rusak Ringan','Ruang Rapat','Bagian Umum','Perbaikan'],
      ['AST-0005','Router MikroTik RB951','Jaringan','MikroTik',2022,'Baik','Ruang Server','Bidang Jaringan','Tersedia'],
      ['AST-0006','Switch TP-Link 24 Port','Jaringan','TP-Link',2021,'Baik','Ruang Server','Bidang Jaringan','Tersedia'],
      ['AST-0007','Meja Kerja Staf','Furnitur','Olympic',2019,'Baik','Ruang Staf','Bagian Umum','Tersedia'],
      ['AST-0008','Kursi Kerja Ergonomis','Furnitur','Chitose',2020,'Baik','Ruang Staf','Bagian Umum','Tersedia'],
      ['AST-0009','Lemari Arsip 4 Laci','Furnitur','Brother',2018,'Rusak Ringan','Ruang Arsip','Bagian Umum','Tersedia'],
      ['AST-0010','Laptop ASUS VivoBook 14','Elektronik','ASUS',2024,'Baik','Ruang IT','Bagian Umum','Dipinjam'],
      ['AST-0011','Access Point Ubiquiti UniFi','Jaringan','Ubiquiti',2023,'Baik','Lobi','Bidang Jaringan','Tersedia'],
      ['AST-0012','UPS APC 1200VA','Elektronik','APC',2021,'Rusak Berat','Ruang Server','Bidang Jaringan','Perbaikan']];
    for (const a of A) await db.query('INSERT INTO assets (kode,nama,category_id,merk,tahun_perolehan,kondisi,lokasi,penanggung_jawab,status) VALUES (?,?,?,?,?,?,?,?,?)', [a[0],a[1],id[a[2]],a[3],a[4],a[5],a[6],a[7],a[8]]);
    const d = n => `DATE_SUB(CURDATE(), INTERVAL ${n} DAY)`;
    await db.query(`INSERT INTO loans (asset_id,peminjam,unit,keperluan,tgl_pinjam,tgl_rencana_kembali,tgl_kembali,status,kondisi_kembali) VALUES
      (2,'Budi Santoso','Bidang Keuangan','Penyusunan laporan',${d(10)},${d(3)},NULL,'Dipinjam',NULL),
      (10,'Siti Rahma','Sekretariat','Rapat luar kantor',${d(2)},DATE_ADD(CURDATE(), INTERVAL 5 DAY),NULL,'Dipinjam',NULL),
      (1,'Andi Pratama','Bidang Umum','Pelatihan',${d(40)},${d(35)},${d(36)},'Dikembalikan','Baik'),
      (3,'Rina Lestari','Bagian Umum','Pencetakan dokumen',${d(75)},${d(70)},${d(71)},'Dikembalikan','Baik'),
      (5,'Joko Widodo','Bidang Jaringan','Instalasi jaringan',${d(100)},${d(95)},${d(94)},'Dikembalikan','Baik')`);
    console.log('Data contoh dimasukkan (pakai "npm run setup:kosong" jika tidak mau data contoh).');
  }
  console.log(`Selesai. Database "${name}" siap dipakai.`);
  await db.end();
})().catch(e => { console.error('Gagal:', e.message); process.exit(1); });
