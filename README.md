# OrderLite 📦

OrderLite adalah aplikasi pencatatan pesanan dan manajemen produk berkinerja tinggi yang dirancang dengan arsitektur **Offline-First**. Aplikasi ini sangat cocok untuk agen, marketer, atau pemilik toko yang membutuhkan pencatatan cepat tanpa hambatan koneksi internet.

Keunggulan utama aplikasi ini terletak pada performa kompresi gambarnya. Melalui **Expo Modules API** dan **Native Rust**, gambar produk dikompresi dalam hitungan milidetik secara native sebelum disimpan, menghasilkan ukuran file yang sangat kecil (~100 KB) dengan kualitas visual yang tetap terjaga. 

Selain itu, keamanan data dijamin melalui fitur integrasi sinkronisasi file database SQLite ke **Google Drive**.

---

## 🛠 Teknologi yang Digunakan

Aplikasi ini menggunakan teknologi modern (State-of-the-Art) untuk ekosistem Mobile:

1. **Framework Utama:** [Expo](https://expo.dev/) (React Native) + TypeScript.
2. **Database Lokal:** `expo-sqlite` (dengan mode WAL untuk performa baca-tulis tingkat tinggi).
3. **Kompresi Gambar (Native):** Bahasa pemrograman **Rust** (library `image` & `webp`), diintegrasikan melalui Expo Modules C-FFI Bridge.
4. **Manajemen File:** `expo-file-system` & `react-native-zip-archive`.
5. **Cloud Sync:** Google Drive REST API (Autentikasi via `@react-native-google-signin/google-signin`).
6. **Ekspor Gambar:** `react-native-view-shot` & `expo-sharing`.

---

## 🏗 Struktur Direktori Utama

```text
OrderLite/
├── src/
│   ├── components/      # Komponen Modular (PinchableImage, dll.)
│   ├── database/        # Logika expo-sqlite (Tabel & CRUD)
│   │   ├── db.ts               # Inisialisasi Database & Migrasi
│   │   └── queries/            # Fungsi Manajemen Data (Orders, Products, Marketers, Expeditions)
│   ├── screens/         # Tampilan UI (Screens)
│   │   ├── AddProductScreen.tsx
│   │   ├── OrderFormScreen.tsx
│   │   ├── OrdersListScreen.tsx
│   │   ├── ProductsListScreen.tsx
│   │   ├── MarketersListScreen.tsx
│   │   ├── ExpeditionsListScreen.tsx
│   │   └── SettingsScreen.tsx
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

## 🌐 Integrasi Google Drive (Backup & Restore)

Agar fitur **Backup** & **Restore** ke Google Drive dapat berjalan secara riil di Android, ikuti langkah-langkah di bawah ini:

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
     * Kosongkan bagian Authorized JavaScript origins & Authorized redirect URIs (atau isi `http://localhost` jika dipaksa).
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
Untuk menjalankan aplikasi dengan pemantauan kode real-time (*Hot Reload*):
* **Lokal (Android):**
  ```bash
  npx expo run:android
  ```
* **Lokal (iOS):**
  ```bash
  npx expo run:ios
  ```

### 2. Mode Production / Release (Produksi)
Untuk mengompilasi aplikasi ke dalam paket siap edar:

#### A. Build Lokal via Gradle (Offline & Cepat)
* **Build APK Release (Untuk di-install langsung / dibagikan):**
  ```bash
  cd android && ./gradlew assembleRelease
  ```
  *Output file:* `android/app/build/outputs/apk/release/app-release.apk`
  
* **Build AAB Release (Untuk diunggah ke Google Play Store):**
  ```bash
  cd android && ./gradlew bundleRelease
  ```
  *Output file:* `android/app/build/outputs/bundle/release/app-release.aab`

#### B. Alternatif Eksekusi Build Release Lokal Langsung ke Perangkat
Untuk mem-build versi rilis dan langsung memasangnya pada HP yang tersambung melalui USB Debugging:
```bash
npx expo run:android --variant release
```

#### C. Build via Cloud (Expo EAS)
Jika Anda ingin membangun file installer di server cloud Expo:
```bash
eas build --platform android --profile production
```

---

## 🔗 Catatan Penting tentang Modul Rust (rust-compressor)

Agar Expo Modules (C++) dapat membaca kode Rust secara sempurna, pastikan Anda mendaftarkan modul lokal pada `package.json` utama:
```json
"dependencies": {
  "rust-compressor": "file:./modules/rust-compressor"
}
```
Saat Expo melakukan kompilasi, Native Bridge (JNI/C++) akan mencari fungsi FFI `compress_image` yang telah dibuat dengan atribut `#[no_mangle]` pada `lib.rs`.

**Selamat Mengembangkan OrderLite! 🎉**
