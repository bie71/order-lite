import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as FileSystem from 'expo-file-system/legacy';
import { zip, unzip } from 'react-native-zip-archive';

const BACKUP_FILE_NAME = 'orderlite_full_backup.zip';
const DB_DIR = FileSystem.documentDirectory + 'SQLite/';
const DB_PATH = DB_DIR + 'orderlite.db';
const IMAGE_CACHE_DIR = FileSystem.cacheDirectory + 'ImagePicker/';
const BACKUP_STAGING_DIR = FileSystem.documentDirectory + 'backup_staging/';
const TEMP_ZIP_PATH = FileSystem.documentDirectory + 'orderlite_backup_temp.zip';

// Configure Google Signin with Drive Scope
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    webClientId: '82888828682-5oog04ot7f1dci1hjjc87h3n5qj7m4jc.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();

    const email = (userInfo as any)?.data?.user?.email || userInfo?.user?.email || 'Logged In';
    return { email, accessToken: tokens.accessToken };
  } catch (error: any) {
    console.error("Google Signin Error:", error);
    throw error;
  }
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Google Signout Error:", error);
  }
};

// Find existing backup file in Google Drive
const findBackupFileId = async (accessToken: string): Promise<string | null> => {
  try {
    // Search for both zip backup and legacy db backup name
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=(name='${BACKUP_FILE_NAME}' or name='orderlite_backup.db') and trashed=false&spaces=drive`;
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      // Prefer zip file if available
      const zipFile = data.files.find((f: any) => f.name === BACKUP_FILE_NAME);
      return zipFile ? zipFile.id : data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error finding backup file:", error);
    throw error;
  }
};

const PERMANENT_IMAGE_DIR = FileSystem.documentDirectory + 'images/';

// Prepare zip bundle containing database and permanent images
const createBackupZip = async (): Promise<string> => {
  // Clean staging
  await FileSystem.deleteAsync(BACKUP_STAGING_DIR, { idempotent: true });
  await FileSystem.makeDirectoryAsync(BACKUP_STAGING_DIR, { intermediates: true });

  const stagingDbDir = BACKUP_STAGING_DIR + 'SQLite/';
  await FileSystem.makeDirectoryAsync(stagingDbDir, { intermediates: true });

  // Copy database
  const fileInfo = await FileSystem.getInfoAsync(DB_PATH);
  if (!fileInfo.exists) {
    throw new Error("File database lokal tidak ditemukan.");
  }
  await FileSystem.copyAsync({ from: DB_PATH, to: stagingDbDir + 'orderlite.db' });

  // Copy Permanent images directory only (Ignore temporary ImagePicker cache)
  const permDirInfo = await FileSystem.getInfoAsync(PERMANENT_IMAGE_DIR);
  if (permDirInfo.exists && permDirInfo.isDirectory) {
    const stagingPermImgDir = BACKUP_STAGING_DIR + 'images/';
    await FileSystem.makeDirectoryAsync(stagingPermImgDir, { intermediates: true });
    
    const files = await FileSystem.readDirectoryAsync(PERMANENT_IMAGE_DIR);
    for (const file of files) {
      await FileSystem.copyAsync({
        from: PERMANENT_IMAGE_DIR + file,
        to: stagingPermImgDir + file,
      });
    }
  }

  // Delete temp zip if exists
  await FileSystem.deleteAsync(TEMP_ZIP_PATH, { idempotent: true });

  // Create Zip
  await zip(BACKUP_STAGING_DIR, TEMP_ZIP_PATH);

  // Clean staging after zip creation
  await FileSystem.deleteAsync(BACKUP_STAGING_DIR, { idempotent: true });

  return TEMP_ZIP_PATH;
};

// Backup SQLite Database & Images (Zip) to Google Drive
export const backupToGDrive = async (accessToken: string): Promise<string> => {
  try {
    const zipPath = await createBackupZip();

    // Find if file already exists on Drive
    const fileId = await findBackupFileId(accessToken);

    if (fileId) {
      // Overwrite existing backup file on Drive
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const result = await FileSystem.uploadAsync(uploadUrl, zipPath, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        httpMethod: 'PATCH',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (result.status !== 200) {
        throw new Error(`Upload gagal dengan status: ${result.status}`);
      }
    } else {
      // Create metadata first for new backup file
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: BACKUP_FILE_NAME,
          mimeType: 'application/zip',
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Gagal membuat metadata cadangan di Drive.");
      }

      const newFile = await createResponse.json();
      const newFileId = newFile.id;

      // Upload binary zip content
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`;
      const result = await FileSystem.uploadAsync(uploadUrl, zipPath, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        httpMethod: 'PATCH',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (result.status !== 200) {
        throw new Error(`Upload gagal dengan status: ${result.status}`);
      }
    }

    // Clean up local temp zip
    await FileSystem.deleteAsync(zipPath, { idempotent: true });

    return new Date().toLocaleString('id-ID');
  } catch (error: any) {
    console.error("GDrive Backup Error:", error);
    await FileSystem.deleteAsync(TEMP_ZIP_PATH, { idempotent: true });
    throw error;
  }
};

// Restore SQLite Database & Images from Google Drive
export const restoreFromGDrive = async (accessToken: string): Promise<boolean> => {
  const downloadZipPath = FileSystem.documentDirectory + 'orderlite_restore_download.zip';
  const restoreExtractDir = FileSystem.documentDirectory + 'restore_staging/';

  try {
    const fileId = await findBackupFileId(accessToken);
    if (!fileId) {
      throw new Error("File cadangan tidak ditemukan di Google Drive Anda.");
    }

    // Download backup file
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const downloadResult = await FileSystem.downloadAsync(downloadUrl, downloadZipPath, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (downloadResult.status !== 200) {
      throw new Error("Gagal mengunduh file cadangan.");
    }

    // Check if downloaded file is zip or raw db (legacy support)
    let isZip = true;
    try {
      await unzip(downloadZipPath, restoreExtractDir);
    } catch (e) {
      isZip = false;
    }

    if (isZip) {
      // Restore DB file from extract dir
      const extractedDb = restoreExtractDir + 'SQLite/orderlite.db';
      const dbInfo = await FileSystem.getInfoAsync(extractedDb);
      if (dbInfo.exists) {
        await FileSystem.makeDirectoryAsync(DB_DIR, { intermediates: true });
        await FileSystem.copyAsync({ from: extractedDb, to: DB_PATH });
      }

      // Restore ImagePicker cache folder if present
      const extractedImgDir = restoreExtractDir + 'ImagePicker/';
      const imgDirInfo = await FileSystem.getInfoAsync(extractedImgDir);
      if (imgDirInfo.exists && imgDirInfo.isDirectory) {
        await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
        const imgFiles = await FileSystem.readDirectoryAsync(extractedImgDir);
        for (const imgFile of imgFiles) {
          await FileSystem.copyAsync({
            from: extractedImgDir + imgFile,
            to: IMAGE_CACHE_DIR + imgFile,
          });
        }
      }

      // Restore Permanent images folder if present
      const extractedPermImgDir = restoreExtractDir + 'images/';
      const permImgDirInfo = await FileSystem.getInfoAsync(extractedPermImgDir);
      if (permImgDirInfo.exists && permImgDirInfo.isDirectory) {
        await FileSystem.makeDirectoryAsync(PERMANENT_IMAGE_DIR, { intermediates: true });
        const permImgFiles = await FileSystem.readDirectoryAsync(extractedPermImgDir);
        for (const imgFile of permImgFiles) {
          await FileSystem.copyAsync({
            from: extractedPermImgDir + imgFile,
            to: PERMANENT_IMAGE_DIR + imgFile,
          });
        }
      }
    } else {
      // Legacy backup format: raw SQLite file
      await FileSystem.makeDirectoryAsync(DB_DIR, { intermediates: true });
      await FileSystem.copyAsync({
        from: downloadZipPath,
        to: DB_PATH,
      });
    }

    // Clean up temporary restore artifacts
    await FileSystem.deleteAsync(downloadZipPath, { idempotent: true });
    await FileSystem.deleteAsync(restoreExtractDir, { idempotent: true });

    return true;
  } catch (error: any) {
    console.error("GDrive Restore Error:", error);
    await FileSystem.deleteAsync(downloadZipPath, { idempotent: true });
    await FileSystem.deleteAsync(restoreExtractDir, { idempotent: true });
    throw error;
  }
};
