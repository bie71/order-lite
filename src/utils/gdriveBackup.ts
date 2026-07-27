import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

const BACKUP_FILE_NAME = 'orderlite_backup.db';
const DB_PATH = FileSystem.documentDirectory + 'SQLite/orderlite.db';

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

    // Support older and newer versions of google-signin package format
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
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&spaces=drive`;
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
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error finding backup file:", error);
    throw error;
  }
};

// Backup SQLite Database to Google Drive
export const backupToGDrive = async (accessToken: string): Promise<string> => {
  try {
    // Check if SQLite file exists
    const fileInfo = await FileSystem.getInfoAsync(DB_PATH);
    if (!fileInfo.exists) {
      throw new Error("File database lokal tidak ditemukan.");
    }

    // Find if the file already exists on Drive
    const fileId = await findBackupFileId(accessToken);

    if (fileId) {
      // Overwrite existing backup file on Drive
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const result = await FileSystem.uploadAsync(uploadUrl, DB_PATH, {
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
          mimeType: 'application/octet-stream',
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Gagal membuat metadata cadangan di Drive.");
      }

      const newFile = await createResponse.json();
      const newFileId = newFile.id;

      // Upload binary database content
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`;
      const result = await FileSystem.uploadAsync(uploadUrl, DB_PATH, {
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

    return new Date().toLocaleString('id-ID');
  } catch (error: any) {
    console.error("GDrive Backup Error:", error);
    throw error;
  }
};

// Restore SQLite Database from Google Drive
export const restoreFromGDrive = async (accessToken: string): Promise<boolean> => {
  const tempDbPath = FileSystem.documentDirectory + 'SQLite/orderlite_backup_temp.db';
  try {
    const fileId = await findBackupFileId(accessToken);
    if (!fileId) {
      throw new Error("File cadangan tidak ditemukan di Google Drive Anda.");
    }

    // Download backup file to temp path
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const downloadResult = await FileSystem.downloadAsync(downloadUrl, tempDbPath, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (downloadResult.status !== 200) {
      throw new Error("Gagal mengunduh file cadangan.");
    }

    // Replace actual database file with backup file
    await FileSystem.copyAsync({
      from: tempDbPath,
      to: DB_PATH,
    });

    // Clean up temp file
    await FileSystem.deleteAsync(tempDbPath, { idempotent: true });
    return true;
  } catch (error: any) {
    console.error("GDrive Restore Error:", error);
    // Clean up temp file in case of error
    await FileSystem.deleteAsync(tempDbPath, { idempotent: true });
    throw error;
  }
};
