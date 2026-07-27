import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDatabase = (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('orderlite.db');
  }
  return dbPromise;
};

export const initDatabase = async () => {
  try {
    const db = await getDatabase();
    
    // Run PRAGMAs separately with error catching
    try {
      await db.execAsync('PRAGMA journal_mode = WAL;');
    } catch (e) {
      console.warn("PRAGMA journal_mode = WAL failed:", e);
    }

    try {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.warn("PRAGMA foreign_keys = ON failed:", e);
    }

    // Create tables individually to prevent multi-statement execution bugs on Android
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_produk TEXT NOT NULL,
        harga_dasar REAL NOT NULL,
        foto_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gudang_nama TEXT NOT NULL,
        marketer_cust_nama TEXT NOT NULL,
        produk_id INTEGER,
        produk_nama TEXT NOT NULL,
        produk_foto_path TEXT,
        harga_produk REAL NOT NULL,
        fee_marketer REAL NOT NULL,
        ekspedisi_pengirim TEXT NOT NULL,
        ongkir REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (produk_id) REFERENCES products (id) ON DELETE SET NULL
      );
    `);

    // Migration for existing databases to add ongkir column
    try {
      await db.execAsync('ALTER TABLE orders ADD COLUMN ongkir REAL DEFAULT 0;');
    } catch (e) {
      // Column might already exist, safe to ignore
    }

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS marketers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_marketer TEXT NOT NULL,
        email TEXT,
        telepon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expeditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_ekspedisi TEXT NOT NULL,
        kode_ekspedisi TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_customer TEXT NOT NULL,
        telepon TEXT,
        alamat TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration for existing database orders table
    try {
      await db.execAsync('ALTER TABLE orders ADD COLUMN marketer_nama TEXT;');
    } catch (e) {
      // Column might already exist
    }
    try {
      await db.execAsync('ALTER TABLE orders ADD COLUMN customer_nama TEXT;');
    } catch (e) {
      // Column might already exist
    }

    console.log("Database OrderLite & Tabel berhasil diinisialisasi.");
  } catch (error) {
    console.error("Gagal menginisialisasi database:", error);
  }
};
