import { getDatabase } from '../db';

export interface OrderData {
  gudang_nama: string;
  marketer_cust_nama?: string;
  marketer_nama?: string;
  customer_nama?: string;
  produk_id: number | null;
  produk_nama: string;
  produk_foto_path: string | null;
  harga_produk: number;
  fee_marketer: number;
  ekspedisi_pengirim: string;
  ongkir: number;
}

export const insertOrder = async (order: OrderData): Promise<number> => {
  const db = await getDatabase();
  const marketerCust = order.marketer_cust_nama || [order.marketer_nama, order.customer_nama].filter(Boolean).join(' - ') || '-';
  const result = await db.runAsync(
    `INSERT INTO orders (
      gudang_nama, marketer_cust_nama, marketer_nama, customer_nama, produk_id, produk_nama, produk_foto_path, 
      harga_produk, fee_marketer, ekspedisi_pengirim, ongkir
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.gudang_nama, 
      marketerCust,
      order.marketer_nama || null,
      order.customer_nama || null,
      order.produk_id,
      order.produk_nama, 
      order.produk_foto_path, 
      order.harga_produk, 
      order.fee_marketer, 
      order.ekspedisi_pengirim,
      order.ongkir || 0
    ]
  );
  return result.lastInsertRowId;
};

export const fetchAllOrders = async () => {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM orders ORDER BY created_at DESC');
};

export const updateOrder = async (id: number, order: OrderData): Promise<void> => {
  const db = await getDatabase();
  const marketerCust = order.marketer_cust_nama || [order.marketer_nama, order.customer_nama].filter(Boolean).join(' - ') || '-';
  await db.runAsync(
    `UPDATE orders SET 
      gudang_nama = ?, marketer_cust_nama = ?, marketer_nama = ?, customer_nama = ?, produk_id = ?, produk_nama = ?, 
      produk_foto_path = ?, harga_produk = ?, fee_marketer = ?, ekspedisi_pengirim = ?,
      ongkir = ?
    WHERE id = ?`,
    [
      order.gudang_nama, 
      marketerCust,
      order.marketer_nama || null,
      order.customer_nama || null,
      order.produk_id,
      order.produk_nama, 
      order.produk_foto_path, 
      order.harga_produk, 
      order.fee_marketer, 
      order.ekspedisi_pengirim,
      order.ongkir || 0,
      id
    ]
  );
};

export const deleteOrder = async (id: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM orders WHERE id = ?', [id]);
};

export const deleteOrdersBulk = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
};

export const getOrdersPaginated = async (searchQuery: string, limit: number, offset: number) => {
  const db = await getDatabase();
  const sql = `
    SELECT * FROM orders 
    WHERE produk_nama LIKE ? 
       OR gudang_nama LIKE ? 
       OR marketer_cust_nama LIKE ?
       OR marketer_nama LIKE ?
       OR customer_nama LIKE ?
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;
  const term = `%${searchQuery}%`;
  const allRows = await db.getAllAsync(sql, [term, term, term, term, term, limit, offset]);
  return allRows as Array<{
    id: number;
    gudang_nama: string;
    marketer_cust_nama: string;
    marketer_nama?: string;
    customer_nama?: string;
    produk_id: number | null;
    produk_nama: string;
    produk_foto_path: string | null;
    harga_produk: number;
    fee_marketer: number;
    ekspedisi_pengirim: string;
    ongkir: number;
    created_at: string;
  }>;
};
