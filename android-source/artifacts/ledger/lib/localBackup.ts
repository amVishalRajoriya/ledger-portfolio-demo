import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export async function saveLocalBackup(contents: string): Promise<boolean> {
  if (Platform.OS !== 'android') throw new Error('Local backup files are available in the Android app.');
  const access = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!access.granted) return false;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `ledger-backup-${stamp}.json`;
  const uri = await FileSystem.StorageAccessFramework.createFileAsync(
    access.directoryUri,
    fileName,
    'application/json',
  );
  await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
  return true;
}

export async function selectLocalBackup(): Promise<unknown | null> {
  if (Platform.OS !== 'android') throw new Error('Backup restore is available in the Android app.');
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (picked.canceled) return null;
  if (picked.result.size > 20 * 1024 * 1024) throw new Error('Backup file is too large to restore.');
  try {
    return JSON.parse(await picked.result.text()) as unknown;
  } catch {
    throw new Error('Could not read this backup file. Select a valid Ledger JSON backup.');
  }
}
