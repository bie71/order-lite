import { getDatabase } from '../db';

export interface CustomerData {
  nama_customer: string;
  telepon: string | null;
  alamat: string | null;
}

export const insertCustomer = async (customer: CustomerData): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO customers (nama_customer, telepon, alamat) VALUES (?, ?, ?)',
    [customer.nama_customer, customer.telepon, customer.alamat]
  );
  return result.lastInsertRowId;
};

export const updateCustomer = async (id: number, customer: CustomerData): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE customers SET nama_customer = ?, telepon = ?, alamat = ? WHERE id = ?',
    [customer.nama_customer, customer.telepon, customer.alamat, id]
  );
};

export const deleteCustomer = async (id: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
};

export const deleteCustomersBulk = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM customers WHERE id IN (${placeholders})`, ids);
};

export const getCustomers = async () => {
  const db = await getDatabase();
  const allRows = await db.getAllAsync('SELECT * FROM customers ORDER BY nama_customer ASC');
  return allRows as Array<{
    id: number;
    nama_customer: string;
    telepon: string | null;
    alamat: string | null;
    created_at: string;
  }>;
};

export const getCustomersPaginated = async (searchQuery: string, limit: number, offset: number) => {
  const db = await getDatabase();
  const sql = `
    SELECT * FROM customers 
    WHERE nama_customer LIKE ? 
       OR telepon LIKE ? 
       OR alamat LIKE ?
    ORDER BY nama_customer ASC 
    LIMIT ? OFFSET ?
  `;
  const term = `%${searchQuery}%`;
  const allRows = await db.getAllAsync(sql, [term, term, term, limit, offset]);
  return allRows as Array<{
    id: number;
    nama_customer: string;
    telepon: string | null;
    alamat: string | null;
    created_at: string;
  }>;
};
