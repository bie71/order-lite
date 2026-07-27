import { getDatabase } from '../db';

export interface MarketerData {
  nama_marketer: string;
  email: string | null;
  telepon: string | null;
}

export const insertMarketer = async (marketer: MarketerData): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO marketers (nama_marketer, email, telepon) VALUES (?, ?, ?)',
    [marketer.nama_marketer, marketer.email, marketer.telepon]
  );
  return result.lastInsertRowId;
};

export const updateMarketer = async (id: number, marketer: MarketerData): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE marketers SET nama_marketer = ?, email = ?, telepon = ? WHERE id = ?',
    [marketer.nama_marketer, marketer.email, marketer.telepon, id]
  );
};

export const deleteMarketer = async (id: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM marketers WHERE id = ?', [id]);
};

export const getMarketers = async () => {
  const db = await getDatabase();
  const allRows = await db.getAllAsync('SELECT * FROM marketers ORDER BY nama_marketer ASC');
  return allRows as Array<{
    id: number;
    nama_marketer: string;
    email: string | null;
    telepon: string | null;
    created_at: string;
  }>;
};

export const getMarketersPaginated = async (searchQuery: string, limit: number, offset: number) => {
  const db = await getDatabase();
  const sql = `
    SELECT * FROM marketers 
    WHERE nama_marketer LIKE ? 
       OR email LIKE ? 
       OR telepon LIKE ?
    ORDER BY nama_marketer ASC 
    LIMIT ? OFFSET ?
  `;
  const term = `%${searchQuery}%`;
  const allRows = await db.getAllAsync(sql, [term, term, term, limit, offset]);
  return allRows as Array<{
    id: number;
    nama_marketer: string;
    email: string | null;
    telepon: string | null;
    created_at: string;
  }>;
};
