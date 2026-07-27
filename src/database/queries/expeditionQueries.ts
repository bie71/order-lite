import { getDatabase } from '../db';

export interface ExpeditionData {
  nama_ekspedisi: string;
  kode_ekspedisi: string | null;
}

export const insertExpedition = async (expedition: ExpeditionData): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO expeditions (nama_ekspedisi, kode_ekspedisi) VALUES (?, ?)',
    [expedition.nama_ekspedisi, expedition.kode_ekspedisi]
  );
  return result.lastInsertRowId;
};

export const updateExpedition = async (id: number, expedition: ExpeditionData): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE expeditions SET nama_ekspedisi = ?, kode_ekspedisi = ? WHERE id = ?',
    [expedition.nama_ekspedisi, expedition.kode_ekspedisi, id]
  );
};

export const deleteExpedition = async (id: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM expeditions WHERE id = ?', [id]);
};

export const deleteExpeditionsBulk = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM expeditions WHERE id IN (${placeholders})`, ids);
};

export const getExpeditions = async () => {
  const db = await getDatabase();
  const allRows = await db.getAllAsync('SELECT * FROM expeditions ORDER BY nama_ekspedisi ASC');
  return allRows as Array<{
    id: number;
    nama_ekspedisi: string;
    kode_ekspedisi: string | null;
    created_at: string;
  }>;
};

export const getExpeditionsPaginated = async (searchQuery: string, limit: number, offset: number) => {
  const db = await getDatabase();
  const sql = `
    SELECT * FROM expeditions 
    WHERE nama_ekspedisi LIKE ? 
       OR kode_ekspedisi LIKE ?
    ORDER BY nama_ekspedisi ASC 
    LIMIT ? OFFSET ?
  `;
  const term = `%${searchQuery}%`;
  const allRows = await db.getAllAsync(sql, [term, term, limit, offset]);
  return allRows as Array<{
    id: number;
    nama_ekspedisi: string;
    kode_ekspedisi: string | null;
    created_at: string;
  }>;
};
