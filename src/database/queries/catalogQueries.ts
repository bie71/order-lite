import { getDatabase } from '../db';

export type CatalogConfig = {
  id: number;
  github_token: string | null;
  github_repo: string;
  github_branch: string;
  catalog_url: string;
  last_sync: string | null;
  last_publish: string | null;
};

export type CatalogCache = {
  id: number;
  settings_json: string | null;
  products_json: string | null;
  sha: string | null;
  updated_at: string;
};

export const getCatalogConfig = async (): Promise<CatalogConfig> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CatalogConfig>('SELECT * FROM catalog_config WHERE id = 1');
  if (!row) {
    await db.runAsync(
      `INSERT OR IGNORE INTO catalog_config (id, github_repo, github_branch, catalog_url)
       VALUES (1, 'bie71/sahla-store', 'main', 'https://sahla-store.vercel.app')`
    );
    const newRow = await db.getFirstAsync<CatalogConfig>('SELECT * FROM catalog_config WHERE id = 1');
    return newRow!;
  }
  return row;
};

export const saveCatalogConfig = async (
  token: string,
  repo: string = 'bie71/sahla-store',
  branch: string = 'main',
  catalogUrl: string = 'https://sahla-store.vercel.app'
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO catalog_config (id, github_token, github_repo, github_branch, catalog_url)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       github_token = excluded.github_token,
       github_repo = excluded.github_repo,
       github_branch = excluded.github_branch,
       catalog_url = excluded.catalog_url`,
    [token.trim(), repo.trim(), branch.trim(), catalogUrl.trim()]
  );
};

export const updateCatalogSyncTimestamps = async (
  type: 'sync' | 'publish',
  timestamp: string = new Date().toISOString()
): Promise<void> => {
  const db = await getDatabase();
  if (type === 'sync') {
    await db.runAsync('UPDATE catalog_config SET last_sync = ? WHERE id = 1', [timestamp]);
  } else {
    await db.runAsync('UPDATE catalog_config SET last_publish = ?, last_sync = ? WHERE id = 1', [timestamp, timestamp]);
  }
};

export const getCatalogCache = async (): Promise<CatalogCache | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CatalogCache>('SELECT * FROM catalog_cache WHERE id = 1');
  return row || null;
};

export const saveCatalogCache = async (
  settingsJson: string,
  productsJson: string,
  sha: string | null
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO catalog_cache (id, settings_json, products_json, sha, updated_at)
     VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       settings_json = excluded.settings_json,
       products_json = excluded.products_json,
       sha = excluded.sha,
       updated_at = CURRENT_TIMESTAMP`,
    [settingsJson, productsJson, sha]
  );
};

export const clearCatalogCache = async (): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM catalog_cache WHERE id = 1');
};
