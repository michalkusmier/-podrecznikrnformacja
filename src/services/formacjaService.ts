// src/services/formacjaService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'formacjaCompletedTasks';

// Mapa: dayId -> lista id ukończonych zadań tego dnia.
type CompletedMap = Record<string, string[]>;

async function readMap(): Promise<CompletedMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Nie udało się odczytać postępu formacji:', e);
    return {};
  }
}

async function writeMap(map: CompletedMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Nie udało się zapisać postępu formacji:', e);
  }
}

export async function getCompletedTaskIds(dayId: string): Promise<string[]> {
  const map = await readMap();
  return map[dayId] ?? [];
}

export async function setTaskCompleted(
  dayId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  const map = await readMap();
  const current = new Set(map[dayId] ?? []);
  if (completed) {
    current.add(taskId);
  } else {
    current.delete(taskId);
  }
  await writeMap({ ...map, [dayId]: Array.from(current) });
}

// Liczba ukończonych zadań na dzień - do wyświetlenia "X/Y" na liście dni.
export async function getAllCompletedCounts(): Promise<Record<string, number>> {
  const map = await readMap();
  const counts: Record<string, number> = {};
  for (const dayId of Object.keys(map)) {
    counts[dayId] = map[dayId].length;
  }
  return counts;
}

// Cały postęp naraz - do kopii zapasowej dziennika (journalBackupService).
export async function getCompletedMap(): Promise<Record<string, string[]>> {
  return readMap();
}

// Przywracanie z kopii: suma zbiorów - zadanie ukończone w kopii albo na tym
// telefonie zostaje ukończone. Nigdy niczego nie odznacza.
export async function mergeCompletedMap(incoming: Record<string, string[]>): Promise<void> {
  const map = await readMap();
  const merged: CompletedMap = { ...map };
  for (const dayId of Object.keys(incoming)) {
    merged[dayId] = Array.from(new Set([...(map[dayId] ?? []), ...incoming[dayId]]));
  }
  await writeMap(merged);
}
