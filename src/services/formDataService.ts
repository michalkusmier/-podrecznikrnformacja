// src/services/formDataService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedFormEntry } from '../types';

const STORAGE_KEY = 'prayerJournalEntries';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function persist(list: SavedFormEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Nie udało się zapisać dziennika:', e);
  }
}

// Dziennik modlitwy: data, notatki, użyte odnośniki. Async (AsyncStorage
// zamiast localStorage - prawdziwy trwały zapis na urządzeniu).
//
// Migracja: wpisy zapisane przed wprowadzeniem edycji/usuwania nie mają
// pola "id" - przy pierwszym odczycie dopisujemy im id i od razu zapisujemy
// z powrotem, żeby były stabilne (to samo id) przy kolejnych odczytach.
export async function getFormDataList(): Promise<SavedFormEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list: SavedFormEntry[] = raw ? JSON.parse(raw) : [];

    let needsMigration = false;
    const withIds = list.map((entry) => {
      if (entry.id) return entry;
      needsMigration = true;
      return { ...entry, id: generateId() };
    });

    if (needsMigration) {
      await persist(withIds);
    }

    return withIds;
  } catch (e) {
    console.error('Nie udało się odczytać zapisanych formularzy:', e);
    return [];
  }
}

export async function getFormDataEntry(id: string): Promise<SavedFormEntry | undefined> {
  const list = await getFormDataList();
  return list.find((e) => e.id === id);
}

// Przemyślenia zapisane bezpośrednio z konkretnego dnia Formacji (przycisk
// "Zapisz przemyślenie") - używane, żeby pokazać je od razu przy tym dniu,
// oprócz ogólnej Historii Dziennika. Najnowsze pierwsze.
export async function getFormDataListForFormacjaDay(dayId: string): Promise<SavedFormEntry[]> {
  const list = await getFormDataList();
  return list.filter((e) => e.formacjaSource?.dayId === dayId).reverse();
}

// Dodaje nowy wpis - używane zarówno po modlitwie (Mój Formularz, z
// fragmentami z SelectionContext), jak i przy ręcznym dodaniu wpisu z
// poziomu Historii Dziennika (bez przechodzenia przez modlitwę, zwykle bez
// fragmentów). Zwraca zapisany wpis (z nadanym id).
export async function addFormDataEntry(
  entry: Omit<SavedFormEntry, 'id'>
): Promise<SavedFormEntry> {
  const list = await getFormDataList();
  const saved: SavedFormEntry = { ...entry, id: generateId() };
  await persist([...list, saved]);
  return saved;
}

export async function updateFormDataEntry(
  id: string,
  patch: Partial<Omit<SavedFormEntry, 'id'>>
): Promise<void> {
  const list = await getFormDataList();
  const next = list.map((e) => (e.id === id ? { ...e, ...patch } : e));
  await persist(next);
}

export async function deleteFormDataEntry(id: string): Promise<void> {
  const list = await getFormDataList();
  await persist(list.filter((e) => e.id !== id));
}
