import * as FileSystem from 'expo-file-system/legacy';

export interface WebProduct {
  id: number;
  cat: string;
  name: string;
  price: number;
  old?: number;
  img: string;
  badge?: string;
  sizes?: string[];
  desc?: string;
}

export interface PromoBanner {
  bg: string;
  eyebrow: string;
  title: string;
  msg: string;
  btnText: string;
}

export interface HeroCard {
  img: string;
  caption: string;
}

export interface StoreSettings {
  storeName: string;
  logoImg?: string;
  waNumberEnc: string;
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  bannerEyebrow?: string;
  bannerTitle?: string;
  bannerMsg?: string;
  bannerBg?: string;
  promoBanners?: PromoBanner[];
  adminPinHash?: string;
  heroTag?: string;
  heroCards?: HeroCard[];
  carouselEnabled?: boolean;
  carouselEyebrow?: string;
  carouselTitle?: string;
  carouselProductIds?: number[];
  marqueeItems?: string[];
  [key: string]: any;
}

// ==========================================
// Base64 & UTF-8 Utilities (Cross-Platform)
// ==========================================

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export function utf8ToBase64(str: string): string {
  try {
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(str)));
    }
  } catch (e) {
    // Fallback below
  }

  // Pure TypeScript Base64 Encoder for UTF-8
  const utf8Bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      utf8Bytes.push(charcode);
    } else if (charcode < 0x800) {
      utf8Bytes.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8Bytes.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      // surrogate pair
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8Bytes.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }

  let result = '';
  let i = 0;
  while (i < utf8Bytes.length) {
    const b1 = utf8Bytes[i++];
    const b2 = i < utf8Bytes.length ? utf8Bytes[i++] : NaN;
    const b3 = i < utf8Bytes.length ? utf8Bytes[i++] : NaN;

    const e1 = b1 >> 2;
    const e2 = ((b1 & 3) << 4) | (b2 >> 4);
    let e3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (b3 >> 6);
    let e4 = isNaN(b2) || isNaN(b3) ? 64 : b3 & 63;

    result +=
      B64_CHARS.charAt(e1) +
      B64_CHARS.charAt(e2) +
      B64_CHARS.charAt(e3) +
      B64_CHARS.charAt(e4);
  }
  return result;
}

export function base64ToUtf8(b64: string): string {
  const cleanB64 = b64.replace(/[\r\n\s]/g, '');
  try {
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(escape(atob(cleanB64)));
    }
  } catch (e) {
    // Fallback below
  }

  // Pure TypeScript Base64 Decoder to UTF-8
  const bytes: number[] = [];
  let i = 0;
  while (i < cleanB64.length) {
    const enc1 = B64_CHARS.indexOf(cleanB64.charAt(i++));
    const enc2 = B64_CHARS.indexOf(cleanB64.charAt(i++));
    const enc3 = B64_CHARS.indexOf(cleanB64.charAt(i++));
    const enc4 = B64_CHARS.indexOf(cleanB64.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    bytes.push(chr1);
    if (enc3 !== 64 && enc3 !== -1) bytes.push(chr2);
    if (enc4 !== 64 && enc4 !== -1) bytes.push(chr3);
  }

  let str = '';
  let pos = 0;
  while (pos < bytes.length) {
    const b1 = bytes[pos++];
    if (b1 < 0x80) {
      str += String.fromCharCode(b1);
    } else if (b1 > 0xbf && b1 < 0xe0) {
      const b2 = bytes[pos++];
      str += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else if (b1 >= 0xe0 && b1 < 0xf0) {
      const b2 = bytes[pos++];
      const b3 = bytes[pos++];
      str += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
    } else {
      const b2 = bytes[pos++];
      const b3 = bytes[pos++];
      const b4 = bytes[pos++];
      const code =
        (((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)) -
        0x10000;
      str += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
    }
  }
  return str;
}

export function decodeWaNumber(waNumberEnc?: string): string {
  if (!waNumberEnc) return '6281234567890';
  try {
    return base64ToUtf8(waNumberEnc);
  } catch (e) {
    return '6281234567890';
  }
}

export function encodeWaNumber(plainPhone: string): string {
  const digits = plainPhone.replace(/[^0-9]/g, '');
  return utf8ToBase64(digits);
}

// ==========================================
// Parsing & Code Generation for products.js
// ==========================================

export function parseProductsJs(fileContent: string): {
  settings: StoreSettings;
  products: WebProduct[];
} {
  let settings: StoreSettings = {
    storeName: 'Sahla Store',
    waNumberEnc: utf8ToBase64('6281234567890'),
    heroEyebrow: 'Ready stock • Update tiap hari',
    heroTitle: 'Koleksi Busana & Elektronik Terkini',
    heroLead: 'Pilihan lengkap, kualitas terjamin, pesan instan via WhatsApp.',
    promoBanners: [],
    heroCards: []
  };
  let products: WebProduct[] = [];

  try {
    // 1. Ekstrak STORE_SETTINGS
    const settingsMatch = fileContent.match(/const\s+STORE_SETTINGS\s*=\s*({[\s\S]*?});/);
    if (settingsMatch && settingsMatch[1]) {
      settings = JSON.parse(settingsMatch[1]);
    }

    // 2. Ekstrak PRODUCTS
    const productsMatch = fileContent.match(/const\s+PRODUCTS\s*=\s*(\[[\s\S]*?\]);?\s*$/);
    if (productsMatch && productsMatch[1]) {
      products = JSON.parse(productsMatch[1]);
    } else {
      // Fallback: coba match array PRODUCTS di mana saja
      const altProductsMatch = fileContent.match(/const\s+PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
      if (altProductsMatch && altProductsMatch[1]) {
        products = JSON.parse(altProductsMatch[1]);
      }
    }
  } catch (err: any) {
    console.error('Gagal parsing products.js:', err);
    throw new Error(`Format file products.js tidak valid atau rusak: ${err.message}`);
  }

  return { settings, products };
}

export function generateProductsJs(settings: StoreSettings, products: WebProduct[]): string {
  return `// KONFIGURASI TOKO & BANNER
const STORE_SETTINGS = ${JSON.stringify(settings, null, 2)};

function getStoreWaNumber() {
  if (typeof STORE_SETTINGS === "undefined") return "6281234567892";
  if (STORE_SETTINGS.waNumberEnc) {
    try {
      return atob(STORE_SETTINGS.waNumberEnc);
    } catch (e) {
      return STORE_SETTINGS.waNumber || "6281234567892";
    }
  }
  return STORE_SETTINGS.waNumber || "6281234567892";
}

const WA_NUMBER = getStoreWaNumber();

// DAFTAR PRODUK KATALOG
const PRODUCTS = ${JSON.stringify(products, null, 2)};
`;
}

// ==========================================
// GitHub REST API Integration Client
// ==========================================

export async function testGitHubConnection(
  token: string,
  repo: string = 'bie71/sahla-store'
): Promise<{
  success: boolean;
  username: string;
  repoName: string;
  canPush: boolean;
  error?: string;
}> {
  try {
    const cleanToken = token.trim();
    const cleanRepo = repo.trim();

    if (!cleanToken) {
      return { success: false, username: '', repoName: cleanRepo, canPush: false, error: 'Token GitHub kosong.' };
    }

    // 1. Cek User Profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'OrderLite-Mobile-App'
      }
    });

    if (!userRes.ok) {
      const errData = await userRes.json().catch(() => ({}));
      return {
        success: false,
        username: '',
        repoName: cleanRepo,
        canPush: false,
        error: errData.message || `Gagal autentikasi ke GitHub (HTTP ${userRes.status})`
      };
    }
    const userData = await userRes.json();

    // 2. Cek Akses ke Repository
    const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'OrderLite-Mobile-App'
      }
    });

    if (!repoRes.ok) {
      const errData = await repoRes.json().catch(() => ({}));
      return {
        success: false,
        username: userData.login || '',
        repoName: cleanRepo,
        canPush: false,
        error: `Repositori ${cleanRepo} tidak ditemukan atau token tidak punya izin akses: ${errData.message || ''}`
      };
    }

    const repoData = await repoRes.json();
    const canPush = repoData.permissions ? !!repoData.permissions.push : true;

    return {
      success: true,
      username: userData.login,
      repoName: repoData.full_name,
      canPush: canPush
    };
  } catch (err: any) {
    return {
      success: false,
      username: '',
      repoName: repo,
      canPush: false,
      error: err.message || 'Gagal terhubung ke jaringan GitHub.'
    };
  }
}

export async function fetchCatalogFromGitHub(
  token: string,
  repo: string = 'bie71/sahla-store',
  branch: string = 'main'
): Promise<{
  settings: StoreSettings;
  products: WebProduct[];
  sha: string;
}> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();
  const cleanBranch = branch.trim() || 'main';

  const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/products.js?ref=${cleanBranch}`;

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'OrderLite-Mobile-App'
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Gagal mengambil products.js (HTTP ${res.status})`);
  }

  const fileData = await res.json();
  const rawBase64 = fileData.content || '';
  const sha = fileData.sha || '';

  const fileContent = base64ToUtf8(rawBase64);
  const parsed = parseProductsJs(fileContent);

  return {
    settings: parsed.settings,
    products: parsed.products,
    sha: sha
  };
}

export async function uploadProductImage(
  token: string,
  repo: string = 'bie71/sahla-store',
  branch: string = 'main',
  localUri: string,
  customFileName?: string
): Promise<string> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();
  const cleanBranch = branch.trim() || 'main';

  // Baca file lokal dalam base64
  let base64Content = '';
  if (localUri.startsWith('data:')) {
    const commaIdx = localUri.indexOf(',');
    base64Content = commaIdx !== -1 ? localUri.slice(commaIdx + 1) : localUri;
  } else {
    base64Content = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64
    });
  }

  const fileName = customFileName || `p_${Date.now()}.jpg`;
  const targetPath = `img/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/${targetPath}`;

  // Cek apakah file sudah ada sebelumnya (untuk SHA jika overwrite)
  let sha: string | undefined = undefined;
  try {
    const checkRes = await fetch(`${apiUrl}?ref=${cleanBranch}`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'OrderLite-Mobile-App'
      }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      sha = checkData.sha;
    }
  } catch (e) {
    // Abaikan jika 404
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'OrderLite-Mobile-App'
    },
    body: JSON.stringify({
      message: `Upload foto produk ${fileName} via OrderLite Mobile`,
      content: base64Content,
      branch: cleanBranch,
      sha: sha
    })
  });

  if (!putRes.ok) {
    const errData = await putRes.json().catch(() => ({}));
    throw new Error(errData.message || `Gagal mengunggah foto ke GitHub (HTTP ${putRes.status})`);
  }

  return targetPath;
}

export async function publishCatalogToGitHub(
  token: string,
  repo: string = 'bie71/sahla-store',
  branch: string = 'main',
  settings: StoreSettings,
  products: WebProduct[],
  existingSha?: string
): Promise<{
  success: boolean;
  commitSha: string;
  newFileSha: string;
}> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim();
  const cleanBranch = branch.trim() || 'main';

  let sha = existingSha;

  // Jika SHA belum ada atau perlu verifikasi terkini, ambil SHA terbaru
  if (!sha) {
    const getRes = await fetch(
      `https://api.github.com/repos/${cleanRepo}/contents/products.js?ref=${cleanBranch}`,
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'OrderLite-Mobile-App'
        }
      }
    );
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }
  }

  // 1. Generate kode products.js
  const codeContent = generateProductsJs(settings, products);
  const base64Content = utf8ToBase64(codeContent);

  // 2. Commit PUT ke GitHub
  const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/products.js`;
  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'OrderLite-Mobile-App'
    },
    body: JSON.stringify({
      message: `Update katalog via OrderLite Mobile [${new Date().toLocaleString('id-ID')}]`,
      content: base64Content,
      branch: cleanBranch,
      sha: sha
    })
  });

  if (!putRes.ok) {
    const errData = await putRes.json().catch(() => ({}));
    throw new Error(errData.message || `Gagal melakukan commit ke GitHub (HTTP ${putRes.status})`);
  }

  const resultData = await putRes.json();

  return {
    success: true,
    commitSha: resultData.commit?.sha || '',
    newFileSha: resultData.content?.sha || ''
  };
}
