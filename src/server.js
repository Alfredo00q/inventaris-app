require('dotenv').config();
const path = require('path'), crypto = require('crypto');
const express = require('express'), session = require('express-session'), helmet = require('helmet'), layouts = require('express-ejs-layouts');
const { locals, csrf, requireLogin } = require('./middleware');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.disable('x-powered-by');
app.use(layouts);
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:'], formAction: ["'self'"], upgradeInsecureRequests: null,
  } },
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  name: 'sid', secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 3600 * 1000 },
}));
app.use(locals);
app.use(csrf);

app.use(require('./routes/auth'));
app.use(requireLogin);
app.use('/', require('./routes/dashboard'));
app.use('/aset', require('./routes/assets'));
app.use('/kategori', require('./routes/categories'));
app.use('/peminjaman', require('./routes/loans'));
app.use('/', require('./routes/admin'));

app.use((req, res) => res.status(404).render('error', { title: 'Tidak ditemukan', code: 404, msg: 'Halaman yang Anda cari tidak ada.' }));
app.use((err, req, res, next) => {
  console.error(err);
  const dup = err.code === 'ER_DUP_ENTRY', ref = err.code === 'ER_ROW_IS_REFERENCED_2';
  res.status(500).render('error', { title: 'Terjadi kesalahan', code: 500, msg: dup ? 'Data dengan nilai tersebut sudah ada.' : ref ? 'Data ini masih dipakai data lain sehingga tidak bisa dihapus.' : 'Terjadi kesalahan pada server. Periksa koneksi database di file .env.' });
});

const port = +process.env.PORT || 3000;
app.listen(port, () => console.log(`Aplikasi berjalan di http://localhost:${port}`));
