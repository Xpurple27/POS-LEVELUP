# LEVELUP — POS & Manajemen Coffee Shop

Next.js App Router, React, TypeScript strict, Tailwind CSS, Lucide dan Supabase. Semua pembayaran dalam versi ini adalah **simulasi**, termasuk ketika tersambung ke Supabase. Tidak ada penagihan Midtrans atau dana yang dipindahkan.

## Jalankan

Gunakan Node.js 22 LTS dan npm.

```sh
npm ci
npm run dev
```

Tanpa variabel Supabase, aplikasi otomatis menggunakan mode demo dengan katalog awal dan satu tiket contoh. Data demo disimpan di localStorage dan disinkronkan antar tab pada browser/origin yang sama. Mode demo tidak menyinkronkan perangkat berbeda. Jangan masukkan data pribadi nyata dalam demo. Untuk menghapus data demo, hapus key localStorage `levelup-demo-v2` melalui browser.

- `/pos`: pencarian dan kategori menu, keranjang, simpan bill, bayar bill atau langsung bayar simulasi.
- `/kds`: pesanan berbayar masuk ke antrean, mulai dibuat, lalu selesai. Kasir hanya dapat melihat; barista dan manajer dapat mengubah status.
- `/dashboard`: laporan berdasarkan tanggal WIB, transaksi terbaru, tambah/edit/hapus menu dan ketersediaan. Hanya manajer.

## Supabase

1. Buat proyek Supabase **baru** dan jalankan `database_schema.sql` di SQL Editor sekali. Ini menggantikan rancangan tahap pertama, bukan migrasi otomatis dari skema sebelumnya. Jangan jalankan pada database yang sudah berisi tabel dengan nama sama; siapkan migrasi terpisah bila sudah memiliki data.
2. Salin `.env.example` ke `.env.local`, lalu isi URL proyek dan anon key publik. Jika salah satu variabel diisi tetapi lainnya kosong, aplikasi menampilkan error konfigurasi, bukan beralih diam-diam ke demo.
3. Buat akun melalui Supabase Authentication. Tetapkan role di SQL Editor menggunakan UUID akun yang sebenarnya:

```sql
insert into public.staff_profiles (id, role)
values ('UUID-AKUN-DARI-AUTH', 'manager');
```

Role tersedia: `manager`, `cashier`, `barista`. Gunakan akun staf tersebut di layar masuk. Pengguna tanpa role tidak mendapat akses data. Browser hanya menerima anon key dan sesi pengguna; service role tidak diperlukan dan tidak boleh digunakan dalam variabel publik.

4. Orders dan products diaktifkan dalam publication `supabase_realtime` oleh SQL. KDS memakai `supabase.channel` dengan cleanup, memuat ulang saat berlangganan tersambung kembali, serta polling cadangan 30 detik. Uji dengan akun dan browser/perangkat berbeda pada proyek yang sama.
5. Rebuild setelah mengganti variabel `NEXT_PUBLIC_*`, karena Next.js menanamnya saat build.

Database menghitung harga dari katalog, menyimpan snapshot nama/harga, membuat pesanan dan item dalam satu transaksi, serta mengunci dan memvalidasi ID permintaan untuk percobaan ulang idempoten. RLS memisahkan hak staf; perubahan pembayaran dan status melalui RPC terbatas. Menu yang sudah digunakan tidak dapat dihapus karena foreign key; nonaktifkan ketersediaannya.

## Pemeriksaan dan deployment

```sh
npm run typecheck
npm test
npm run build
npm start
```

Tes mencakup perhitungan total, input keranjang, serta skema/RPC/RLS dalam PostgreSQL WASM (PGlite) dengan auth tiruan. Tes ini tidak menggantikan uji autentikasi, jaringan, dan Realtime pada Supabase hosted. Laporan membatasi 1.000 pesanan terbaru dan menyebutkan batas tersebut di UI; gunakan pagination server dan laporan agregasi untuk volume produksi. Snapshot item dimuat dengan pagination agar tidak terpotong batas respons Supabase.

**Batas kesiapan produksi:** versi ini adalah aplikasi operasional dengan pembayaran simulasi. Sebelum penggunaan komersial, integrasikan gateway pembayaran nyata dan webhook terverifikasi, jalankan pengujian Supabase hosted, siapkan backup/restore, pemantauan, kebijakan retensi, dan kontrol deployment. Jangan gunakan angka pembayaran simulasi untuk pembukuan nyata.

Skema lama tahap pertama dan utilitas Midtrans tidak digunakan oleh versi ini. Kontrak data mengikuti permintaan terbaru (`customer_name`, `status`) dengan tambahan `payment_status` untuk membedakan bill tersimpan dan pesanan berbayar.
