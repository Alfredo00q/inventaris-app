# SIMASET - Sistem Inventaris dan Peminjaman Aset

Aplikasi web untuk mencatat aset, kategori, dan peminjaman, lengkap dengan dashboard, log aktivitas, dan manajemen pengguna.
Dibangun dengan **Node.js + Express + EJS + MySQL** (Bootstrap 5, Chart.js).

## Cara menjalankan (Windows + XAMPP + VS Code)

1. Pasang **Node.js LTS** dari https://nodejs.org (sekali saja).
2. Buka **XAMPP Control Panel**, lalu klik **Start** pada **MySQL**.
3. Buka folder proyek ini di **VS Code**, lalu buka terminal (Ctrl + `).
4. Jalankan perintah berikut satu per satu:

```bash
npm install
copy .env.example .env      # di Mac/Linux: cp .env.example .env
npm run setup               # membuat database, tabel, akun admin, dan data contoh
npm run dev                 # menjalankan aplikasi
```

5. Buka http://localhost:3000 dan login:
   - Username: `admin`
   - Password: `admin123` (segera ganti lewat menu Profil)

Jika MySQL kamu memakai password, isi `DB_PASS` di file `.env`.
Untuk memulai tanpa data contoh, pakai `npm run setup:kosong`.

## Fitur
- Login dengan dua peran: Admin dan Staf
- Dashboard: ringkasan, grafik, peminjaman aktif, aktivitas terbaru
- Data aset: tambah, ubah, hapus, cari, saring, halaman, ekspor CSV, riwayat per aset
- Kategori, peminjaman (dengan status terlambat), dan pengembalian
- Log aktivitas, manajemen pengguna, pengaturan nama aplikasi/instansi
- Mode terang dan gelap, tampilan responsif untuk HP

## Struktur folder
```
src/server.js        titik masuk aplikasi
src/db.js            koneksi MySQL
src/middleware.js    sesi, CSRF, hak akses
src/routes/          alur tiap fitur (assets, loans, categories, admin, auth, dashboard)
src/views/           halaman (EJS)
public/              CSS dan JavaScript tampilan
database/schema.sql  struktur tabel
scripts/setup-db.js  pembuat database
```

## Catatan keamanan
- Password disimpan dengan bcrypt; semua query memakai parameter (aman dari SQL injection).
- Ada perlindungan CSRF, header keamanan (helmet), dan batas percobaan login.
- Ganti `SESSION_SECRET` di `.env` dengan teks acak sebelum dipakai di server sungguhan.
