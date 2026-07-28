import { getDatabase } from '../db';

export interface OrderItemInput {
  id?: number;
  produk_id: number | null;
  produk_nama: string;
  produk_foto_path: string | null;
  harga_produk: number;
  jumlah: number;
  subtotal: number;
}

export interface OrderData {
  gudang_nama: string;
  marketer_cust_nama?: string;
  marketer_nama?: string;
  customer_nama?: string;
  produk_id?: number | null;
  produk_nama?: string;
  produk_foto_path?: string | null;
  harga_produk?: number;
  fee_marketer: number;
  ekspedisi_pengirim: string;
  ongkir: number;
  catatan?: string | null;
  items: OrderItemInput[];
}

export interface OrderRecord {
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
  catatan?: string | null;
  created_at: string;
  items: Array<{
    id: number;
    order_id: number;
    produk_id: number | null;
    produk_nama: string;
    produk_foto_path: string | null;
    harga_produk: number;
    jumlah: number;
    subtotal: number;
  }>;
}

export const insertOrder = async (order: OrderData): Promise<number> => {
  const db = await getDatabase();
  const marketerCust = order.marketer_cust_nama || [order.marketer_nama, order.customer_nama].filter(Boolean).join(' - ') || '-';
  
  // Calculate aggregated fallback values for legacy backward compatibility in orders table
  const items = order.items && order.items.length > 0 ? order.items : [];
  const primaryItem = items[0] || {
    produk_id: order.produk_id || null,
    produk_nama: order.produk_nama || '',
    produk_foto_path: order.produk_foto_path || null,
    harga_produk: order.harga_produk || 0,
    jumlah: 1,
    subtotal: order.harga_produk || 0,
  };

  const totalHargaProduk = items.reduce((sum, item) => sum + (item.subtotal || item.harga_produk * item.jumlah), 0);
  const mainProdukNama = items.length > 1 
    ? `${primaryItem.produk_nama} (+${items.length - 1} produk lainnya)`
    : primaryItem.produk_nama;

  const result = await db.runAsync(
    `INSERT INTO orders (
      gudang_nama, marketer_cust_nama, marketer_nama, customer_nama, produk_id, produk_nama, produk_foto_path, 
      harga_produk, fee_marketer, ekspedisi_pengirim, ongkir, catatan
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.gudang_nama, 
      marketerCust,
      order.marketer_nama || null,
      order.customer_nama || null,
      primaryItem.produk_id,
      mainProdukNama, 
      primaryItem.produk_foto_path, 
      totalHargaProduk, 
      order.fee_marketer, 
      order.ekspedisi_pengirim,
      order.ongkir || 0,
      order.catatan || null
    ]
  );

  const orderId = result.lastInsertRowId;

  // Insert items into order_items
  for (const item of items) {
    await db.runAsync(
      `INSERT INTO order_items (
        order_id, produk_id, produk_nama, produk_foto_path, harga_produk, jumlah, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        item.produk_id,
        item.produk_nama,
        item.produk_foto_path,
        item.harga_produk,
        item.jumlah,
        item.subtotal
      ]
    );
  }

  return orderId;
};

export const fetchAllOrders = async () => {
  const db = await getDatabase();
  const orders: any[] = await db.getAllAsync('SELECT * FROM orders ORDER BY created_at DESC');
  for (const order of orders) {
    const items: any[] = await db.getAllAsync('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [order.id]);
    order.items = items;
  }
  return orders as OrderRecord[];
};

export const updateOrder = async (id: number, order: OrderData): Promise<void> => {
  const db = await getDatabase();
  const marketerCust = order.marketer_cust_nama || [order.marketer_nama, order.customer_nama].filter(Boolean).join(' - ') || '-';
  
  const items = order.items && order.items.length > 0 ? order.items : [];
  const primaryItem = items[0] || {
    produk_id: order.produk_id || null,
    produk_nama: order.produk_nama || '',
    produk_foto_path: order.produk_foto_path || null,
    harga_produk: order.harga_produk || 0,
    jumlah: 1,
    subtotal: order.harga_produk || 0,
  };

  const totalHargaProduk = items.reduce((sum, item) => sum + (item.subtotal || item.harga_produk * item.jumlah), 0);
  const mainProdukNama = items.length > 1 
    ? `${primaryItem.produk_nama} (+${items.length - 1} produk lainnya)`
    : primaryItem.produk_nama;

  await db.runAsync(
    `UPDATE orders SET 
      gudang_nama = ?, marketer_cust_nama = ?, marketer_nama = ?, customer_nama = ?, produk_id = ?, produk_nama = ?, 
      produk_foto_path = ?, harga_produk = ?, fee_marketer = ?, ekspedisi_pengirim = ?,
      ongkir = ?, catatan = ?
    WHERE id = ?`,
    [
      order.gudang_nama, 
      marketerCust,
      order.marketer_nama || null,
      order.customer_nama || null,
      primaryItem.produk_id,
      mainProdukNama, 
      primaryItem.produk_foto_path, 
      totalHargaProduk, 
      order.fee_marketer, 
      order.ekspedisi_pengirim,
      order.ongkir || 0,
      order.catatan || null,
      id
    ]
  );

  // Replace order_items
  await db.runAsync('DELETE FROM order_items WHERE order_id = ?', [id]);
  for (const item of items) {
    await db.runAsync(
      `INSERT INTO order_items (
        order_id, produk_id, produk_nama, produk_foto_path, harga_produk, jumlah, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.produk_id,
        item.produk_nama,
        item.produk_foto_path,
        item.harga_produk,
        item.jumlah,
        item.subtotal
      ]
    );
  }
};

export const deleteOrder = async (id: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM order_items WHERE order_id = ?', [id]);
  await db.runAsync('DELETE FROM orders WHERE id = ?', [id]);
};

export const deleteOrdersBulk = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ids);
  await db.runAsync(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
};

export const getOrdersPaginated = async (searchQuery: string, limit: number, offset: number) => {
  const db = await getDatabase();
  const sql = `
    SELECT DISTINCT o.* FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.produk_nama LIKE ? 
       OR o.gudang_nama LIKE ? 
       OR o.marketer_cust_nama LIKE ?
       OR o.marketer_nama LIKE ?
       OR o.customer_nama LIKE ?
       OR o.catatan LIKE ?
       OR oi.produk_nama LIKE ?
    ORDER BY o.created_at DESC 
    LIMIT ? OFFSET ?
  `;
  const term = `%${searchQuery}%`;
  const allRows: any[] = await db.getAllAsync(sql, [term, term, term, term, term, term, term, limit, offset]);
  
  for (const order of allRows) {
    const items: any[] = await db.getAllAsync('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [order.id]);
    // Fallback if no order_items exist (legacy migration safety)
    if (items.length === 0 && order.produk_nama) {
      order.items = [{
        id: 0,
        order_id: order.id,
        produk_id: order.produk_id,
        produk_nama: order.produk_nama,
        produk_foto_path: order.produk_foto_path,
        harga_produk: order.harga_produk,
        jumlah: 1,
        subtotal: order.harga_produk,
      }];
    } else {
      order.items = items;
    }
  }

  return allRows as OrderRecord[];
};
