# OrderLite 📦

OrderLite adalah aplikasi pencatatan pesanan, manajemen produk, dan pengelolaan web katalog online berkinerja tinggi yang dirancang dengan arsitektur **Offline-First**. Aplikasi ini sangat cocok untuk agen, marketer, pemilik toko online, atau reseller yang membutuhkan pencatatan pesanan cepat dan pengelolaan katalog toko online langsung dari genggaman ponsel.

Keunggulan utama aplikasi ini terletak pada performa kompresi gambarnya. Melalui **Expo Modules API** dan **Native Rust**, gambar produk dikompresi dalam hitungan milidetik secara native sebelum disimpan, menghasilkan ukuran file yang sangat kecil (~100 KB) dengan kualitas visual yang tetap terjaga. 

Selain itu, keamanan data dijamin melalui fitur integrasi sinkronisasi file database SQLite ke **Google Drive**, serta integrasi langsung ke **Web Katalog Online (Sahla Store)** via GitHub PAT dan auto-deploy Vercel.

---

## 🌟 Fitur Utama & Pembaruan Terkini

### 1. 🌐 Integrasi Web Katalog Online (Sahla Store) via GitHub PAT
Kini OrderLite terhubung langsung dengan web katalog online pelanggan ([sahla-store.vercel.app](https://sahla-store.vercel.app)) yang terintegrasi dengan repositori GitHub (`bie71/sahla-store`):
- **Cukup Masukkan GitHub PAT (Personal Access Token)**: Sekali konfigurasi di menu Pengaturan, seluruh perubahan produk, visual, dan banner bisa langsung dipublikasikan dari HP.
- **Dashboard Manajemen Katalog**:
  - Ringkasan metrik real-time: Total Produk Web, Jumlah Kategori, Jumlah Banner Promo, dan Status Carousel 3D.
  - Kartu identitas toko lengkap dengan logo, nomor WhatsApp pemesanan, dan tautan langsung ke web live.
  - Indikator status sinkronisasi draf lokal vs web live.
- **Upload & Update Logo Toko**:
  - Ganti logo toko langsung dari galeri atau kamera ponsel dengan kompresi otomatis.
  - Logo langsung ditampilkan pada header navigasi dan footer web online.
- **3 Kartu Hero 3D (3D Perspective Stack)**:
  - Kelola 3 gambar kartu hero ber-efek 3D tilt di panggung halaman depan web (Tengah/Depan, Kiri/Belakang, Kanan/Belakang).
  - Unggah foto dan ubah teks caption untuk masing-masing kartu.
- **Floating Badge Hero & Teks Halaman Depan**:
  - Atur label mengambang 3D (`heroTag`, contoh: *"New Arrival"* atau *"Promo Spesial"*).
  - Ubah teks hero (eyebrow, judul utama, slogan pengantar, dan running text marquee ticker).
- **Background Parallax & Multi-Banner Promo**:
  - Mengelola section banner promo dengan background gambar ber-efek parallax dan slider otomatis (*autoplay*).
  - Tambah banner baru, ganti gambar background dari galeri/kamera, serta atur format pesan WhatsApp otomatis saat tombol order diklik pelanggan.
- **Carousel 3D Produk Unggulan**:
  - Switch toggle ON/OFF untuk menampilkan atau menyembunyikan section Carousel 3D di web.
  - Pemilih produk interaktif (checklist) untuk menentukan produk mana saja yang masuk ke slider carousel 3D.
- **Manajemen Produk Web & Full Gambar (Tanpa Crop)**:
  - Pemilihan foto produk kini mengambil **foto asli utuh (full image tanpa crop paksa)**.
  - Tampilan harga coret (diskon) telah dioptimalkan agar tetap muncul berdampingan di tampilan layar mobile web olshop.
  - Fitur **Quick Import ("Salin dari Master OrderLite")**: Impor barang dari database lokal SQLite ke katalog web hanya dengan 1-klik tanpa ketik ulang.
- **1-Click Publish ke GitHub & Vercel**:
  - Tombol 🚀 **"Publikasikan Sekarang ke Web"** otomatis mengunggah seluruh foto baru (logo, hero 3D, banner promo, produk) ke repositori GitHub dan meng-commit pembaruan `products.js`. Vercel me-redeploy web live dalam ~30 detik dengan batas cache maksimal 3 menit.

### 2. ⚡ Multi-Product Orders & Manajemen Pesanan
- Input pesanan dengan dukungan banyak produk sekaligus dalam 1 nota pesanan (*multi-product order*).
- Kalkulasi otomatis subtotal, fee marketer, ongkos kirim (ongkir), dan total tagihan.
- Catatan pesanan khusus per transaksi.
- Ekspor nota pesanan ke format gambar siap bagi via WhatsApp.

### 3. 📂 Manajemen Master Data Lengkap
- Master Produk lokal dengan pencarian instan, filter, dan pagination.
- Master Customer (nama, telepon, alamat).
- Master Marketer (nama, email, telepon).
- Master Ekspedisi (JNE, J&T, SiCepat, dll.).

### 4. ☁️ Google Drive Cloud Backup & Restore
- Pencadangan satu klik seluruh database SQLite dan foto produk ke Google Drive pengguna.
- Pemulihan data (*restore*) kapan saja saat berganti perangkat.

---

## 🛠 Teknologi yang Digunakan

1. **Framework Utama:** [Expo](https://expo.dev/) (React Native v0.86, Expo SDK 57) + TypeScript.
2. **Database Lokal:** `expo-sqlite` (dengan mode WAL untuk performa baca-tulis tingkat tinggi).
3. **Kompresi Gambar (Native):** Bahasa pemrograman **Rust** (library `image` & `webp`), diintegrasikan melalui Expo Modules C-FFI Bridge.
4. **Manajemen File & Image Manipulation:** `expo-file-system`, `expo-image-picker`, `expo-image-manipulator`, & `react-native-zip-archive`.
5. **Web Catalog Engine:** GitHub REST API v3 Contents Client (OAuth Bearer PAT) + Vercel Deployment Sync.
6. **Cloud Sync:** Google Drive REST API (Autentikasi via `@react-native-google-signin/google-signin`).
7. **Ekspor Gambar:** `react-native-view-shot` & `expo-sharing`.

---

## 🏗 Struktur Direktori Utama

```text
OrderLite/
├── src/
│   ├── components/      # Komponen Modular
│   │   ├── CopyFromOrderLiteModal.tsx   # Modal Salin Produk Lokal ke Web
│   │   ├── DropdownPicker.tsx           # Komponen Dropdown Kustom
│   │   ├── PinchableImage.tsx           # Komponen Zoom Gambar Pinch
│   │   └── WebCatalogConfigModal.tsx    # Modal Pengaturan GitHub PAT
│   ├── database/        # Logika expo-sqlite (Tabel & CRUD)
│   │   ├── db.ts               # Inisialisasi Database, Skema & Migrasi
│   │   └── queries/            # Query Modules
│   │       ├── catalogQueries.ts       # Query Konfigurasi & Cache Katalog Web
│   │       ├── customerQueries.ts      # Query Master Customer
│   │       ├── expeditionQueries.ts    # Query Master Ekspedisi
│   │       ├── marketerQueries.ts      # Query Master Marketer
│   │       ├── orderQueries.ts         # Query Transaksi Pesanan & Items
│   │       └── productQueries.ts       # Query Master Produk
│   ├── navigation/      # Navigasi Aplikasi
│   │   └── AppNavigator.tsx    # Tab & Stack Navigation
│   ├── screens/         # Layar Tampilan (Screens)
│   │   ├── AddCustomerScreen.tsx
│   │   ├── AddExpeditionScreen.tsx
│   │   ├── AddMarketerScreen.tsx
│   │   ├── AddProductScreen.tsx
│   │   ├── CustomersListScreen.tsx
│   │   ├── ExpeditionsListScreen.tsx
│   │   ├── MarketersListScreen.tsx
│   │   ├── OrderFormScreen.tsx
│   │   ├── OrdersListScreen.tsx
│   │   ├── ProductsListScreen.tsx
│   │   ├── SettingsScreen.tsx          # Pengaturan Backup Drive & Akses Web
│   │   ├── WebCatalogScreen.tsx        # Dashboard, Produk, Hero 3D, Banner, & Publikasi
│   │   └── WebProductEditScreen.tsx    # Form Tambah/Edit Produk Web Full Image
│   ├── services/        # Service API Eksternal
│   │   └── githubCatalogService.ts     # Client GitHub REST API & Code Generator
│   └── utils/           # Utility Pendukung (gdriveBackup.ts, dll.)
├── modules/
│   └── rust-compressor/ # Local Native Module (Rust Core)
```

---

## 🚀 Panduan Menjalankan Aplikasi (Development)

Karena proyek ini mengandung **Native Code (Rust/C++)**, Anda harus menjalankan *Development Build* atau *Prebuild*.

### Persiapan Sistem (Prerequisites)
Pastikan Anda telah menginstal:
- Node.js (v18+)
- Rust & Cargo (target Android: `rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android`)
- Android Studio & NDK
- Xcode (khusus macOS untuk iOS)

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Generate Native Code (Prebuild)
```bash
npx expo prebuild --clean
```

### 3. Menjalankan Server Development
```bash
npx expo start
```

---

## 🌐 Panduan Menghubungkan Web Katalog (Sahla Store)

1. Buka aplikasi **OrderLite** -> Masuk ke tab **Pengaturan**.
2. Pada kartu **Katalog Web Online (Sahla Store)**, klik **Pengaturan GitHub Token (PAT)**.
3. Masukkan Personal Access Token GitHub Anda (buat token klasik di [github.com/settings/tokens](https://github.com/settings/tokens) dengan centang izin `repo`).
4. Repositori default: `bie71/sahla-store`, branch default: `main`.
5. Klik **"Tes Koneksi & Cek Akses Repo"** untuk memastikan token valid, lalu klik **"Simpan Pengaturan"**.
6. Masuk ke **Kelola Katalog Web** untuk mulai mengatur produk, logo, hero 3D, dan banner promo.
7. Tekan 🚀 **"Publikasikan Sekarang ke Web"** untuk langsung memperbarui web live pelanggan dalam ~30 detik.

---

## ☁️ Integrasi Google Drive (Backup & Restore)

Agar fitur **Backup** & **Restore** ke Google Drive dapat berjalan secara riil di Android, ikuti langkah-langkah berikut:

### Langkah 1: Dapatkan SHA-1 Fingerprint Perangkat
Jalankan perintah ini pada folder root proyek:
```bash
cd android && ./gradlew signingReport
```
Cari bagian output `Variant: debug` dan salin kode **SHA-1** (contoh: `5E:8F:16:C2:...`).

### Langkah 2: Konfigurasi di Google Cloud Console
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat atau pilih proyek Anda.
3. Buka **APIs & Services > Library**, cari **Google Drive API** lalu klik **Enable**.
4. Buka **APIs & Services > Credentials**, lalu klik **Create Credentials > OAuth client ID**:
   * **Client ID ke-1 (Android)**:
     * Application type: **Android**
     * Package name: `com.orderlite.app`
     * SHA-1 fingerprint: *Tempelkan kode SHA-1 dari Langkah 1.*
   * **Client ID ke-2 (Web Application - WAJIB)**:
     * Application type: **Web application**
     * Salin **Client ID** Web Application yang berakhiran `.apps.googleusercontent.com`.

### Langkah 3: Konfigurasi di Aplikasi
Buka file `src/utils/gdriveBackup.ts` dan masukkan Web Client ID yang disalin pada variabel konfigurasi:
```typescript
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    webClientId: 'MASUKKAN_WEB_CLIENT_ID_ANDA.apps.googleusercontent.com',
    offlineAccess: true,
  });
};
```

---

## 📦 Perintah Build & Mode Eksekusi

### 1. Mode Development (Pengembangan)
* **Lokal (Android):**
  ```bash
  npx expo run:android
  ```
* **Lokal (iOS):**
  ```bash
  npx expo run:ios
  ```

### 2. Mode Production / Release (Produksi)

#### A. Build APK Release Lokal via Gradle
```bash
cd android && ./gradlew assembleRelease
```
*Output file:* `android/app/build/outputs/apk/release/app-release.apk`

#### B. Build AAB Release (Google Play Store)
```bash
cd android && ./gradlew bundleRelease
```
*Output file:* `android/app/build/outputs/bundle/release/app-release.aab`

#### C. Build via Cloud (Expo EAS)
```bash
eas build --platform android --profile production
```

---

## 🔗 Catatan Penting tentang Modul Rust (rust-compressor)

Agar Expo Modules (C++) dapat membaca kode Rust secara sempurna, pastikan modul lokal terdaftar pada `package.json` utama:
```json
"dependencies": {
  "rust-compressor": "file:./modules/rust-compressor"
}
```
Saat Expo melakukan kompilasi, Native Bridge (JNI/C++) akan mencari fungsi FFI `compress_image` yang telah dibuat dengan atribut `#[no_mangle]` pada `lib.rs`.

**Selamat Mengembangkan OrderLite! 🎉**
