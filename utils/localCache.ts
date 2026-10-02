import * as FileSystem from 'expo-file-system';
import { devLog } from './logger';

// Локальне сховище даних у файлах (а не в AsyncStorage, бо там ліміт ~6 МБ на Android,
// а аватарки зберігаються як base64 і можуть швидко його вичерпати).
const CACHE_DIR = `${FileSystem.documentDirectory}eborg-cache/`;

let dirReady: Promise<void> | null = null;
const ensureDir = () => {
  if (!dirReady) {
    dirReady = FileSystem.getInfoAsync(CACHE_DIR)
      .then(info => {
        if (!info.exists) {
          return FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        }
      })
      .catch(error => {
        dirReady = null;
        throw error;
      });
  }
  return dirReady;
};

// Записи в один файл виконуються по черзі, щоб не перетирати один одного
const writeQueues: Record<string, Promise<void>> = {};

export async function readJson<T>(name: string): Promise<T | null> {
  try {
    const path = CACHE_DIR + name;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(path)) as T;
  } catch (error) {
    devLog(`Local cache read error (${name}):`, error);
    return null;
  }
}

export function writeJson(name: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data);
  const previous = writeQueues[name] ?? Promise.resolve();
  const next = previous
    .then(ensureDir)
    .then(() => FileSystem.writeAsStringAsync(CACHE_DIR + name, content))
    .catch(error => devLog(`Local cache write error (${name}):`, error));
  writeQueues[name] = next;
  return next;
}

export function removeJson(name: string): Promise<void> {
  const previous = writeQueues[name] ?? Promise.resolve();
  const next = previous
    .then(() => FileSystem.deleteAsync(CACHE_DIR + name, { idempotent: true }))
    .catch(error => devLog(`Local cache delete error (${name}):`, error));
  writeQueues[name] = next;
  return next;
}
