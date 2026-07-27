import { getDatabase } from '../db';

export const insertProduct = async (nama: string, harga: number, fotoPath: string | null) => {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO products (nama_produk, harga_dasar, foto_path) VALUES (?, ?, ?)',
    [nama, harga, fotoPath]
  );
};

export const getProducts = async () => {
  const db = await getDatabase();
  const allRows = await db.getAllAsync('SELECT * FROM products ORDER BY id DESC');
  return allRows as Array<{
    id: number;
    nama_produk: string;
    harga_dasar: number;
    foto_path: string | null;
  }>;
};

export const getProductsPaginated = async (searchQuery: string, limit: number, offset: number) => {
  const db = await getDatabase();
  const sql = `
    SELECT * FROM products 
    WHERE nama_produk LIKE ? 
    ORDER BY id DESC 
    LIMIT ? OFFSET ?
  `;
  const allRows = await db.getAllAsync(sql, [`%${searchQuery}%`, limit, offset]);
  return allRows as Array<{
    id: number;
    nama_produk: string;
    harga_dasar: number;
    foto_path: string | null;
  }>;
};

export const updateProduct = async (id: number, nama: string, harga: number, fotoPath: string | null) => {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE products SET nama_produk = ?, harga_dasar = ?, foto_path = ? WHERE id = ?',
    [nama, harga, fotoPath, id]
  );
};

export const deleteProduct = async (id: number) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
};
