// src/services/journalBackupService.ts
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { SavedFormEntry } from '../types';
import { getFormDataList, saveMergedFormDataList } from './formDataService';
import { getCompletedMap, mergeCompletedMap, getLastOpenedDay, setLastOpenedDay } from './formacjaService';

// Kopia zapasowa dziennika do pliku. Dziennik celowo zostaje tylko na
// telefonie (bez chmury) - ten plik to jedyny sposób, żeby nie stracić go
// przy zgubieniu/zmianie telefonu. Użytkownik sam decyduje, gdzie plik
// trafi (Dysk Google, mail, pamięć telefonu) przez systemowe "Udostępnij".
// Szkice (draftService) celowo pomijamy - są tymczasowe.

const BACKUP_APP = 'podrecznik-modlitwy';
const BACKUP_KIND = 'journal-backup';
const BACKUP_VERSION = 1;

export interface JournalBackup {
  app: typeof BACKUP_APP;
  kind: typeof BACKUP_KIND;
  version: number;
  exportedAt: string;
  entries: SavedFormEntry[];
  formacjaCompletedTasks: Record<string, string[]>;
  // Cel "Kontynuuj" w Formacji. Opcjonalne - starsze kopie go nie mają.
  formacjaLastOpenedDay?: string;
}

export type ParseResult = { ok: true; backup: JournalBackup } | { ok: false; error: string };

const NOT_A_BACKUP = 'To nie jest kopia dziennika Podręcznika Modlitwy.';

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isValidEntry(e: unknown): e is SavedFormEntry {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    o.id.length > 0 &&
    typeof o.date === 'string' &&
    typeof o.notes === 'string' &&
    typeof o.externalLight === 'string' &&
    typeof o.internalLight === 'string' &&
    Array.isArray(o.references)
  );
}

// Czysta walidacja - nie rzuca wyjątków, zwraca komunikat po polsku.
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: NOT_A_BACKUP };
  const o = data as Record<string, unknown>;
  if (o.app !== BACKUP_APP || o.kind !== BACKUP_KIND) return { ok: false, error: NOT_A_BACKUP };
  if (typeof o.version !== 'number' || o.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: 'Ta kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.',
    };
  }
  if (!Array.isArray(o.entries) || !o.entries.every(isValidEntry)) {
    return { ok: false, error: 'Plik kopii jest uszkodzony (nieprawidłowe wpisy).' };
  }
  const tasks = o.formacjaCompletedTasks ?? {};
  if (typeof tasks !== 'object' || Array.isArray(tasks) || !Object.values(tasks).every(isStringArray)) {
    return { ok: false, error: 'Plik kopii jest uszkodzony (nieprawidłowy postęp Formacji).' };
  }
  const lastDay = typeof o.formacjaLastOpenedDay === 'string' ? o.formacjaLastOpenedDay : undefined;
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      kind: BACKUP_KIND,
      version: o.version,
      exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : '',
      entries: o.entries,
      formacjaCompletedTasks: tasks as Record<string, string[]>,
      formacjaLastOpenedDay: lastDay,
    },
  };
}

export interface MergePlan {
  merged: SavedFormEntry[];
  addedCount: number;
  duplicateCount: number;
}

// Czysta funkcja scalania. Wpisy rozpoznajemy po id: istniejące lokalnie
// zostają bez zmian, brakujące są wstawiane zaraz za poprzednim (w kolejności
// z kopii) wpisem, który już jest na liście - dzięki temu przywrócone wpisy
// lądują na swoim miejscu w chronologii, a nie na końcu listy.
export function planMerge(local: SavedFormEntry[], incoming: SavedFormEntry[]): MergePlan {
  const merged = [...local];
  const ids = new Set(local.map((e) => e.id));
  let insertAt = 0;
  let addedCount = 0;
  let duplicateCount = 0;

  for (const entry of incoming) {
    if (ids.has(entry.id)) {
      duplicateCount++;
      insertAt = merged.findIndex((e) => e.id === entry.id) + 1;
      continue;
    }
    merged.splice(insertAt, 0, entry);
    ids.add(entry.id);
    insertAt++;
    addedCount++;
  }

  return { merged, addedCount, duplicateCount };
}

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type ExportResult = { ok: true } | { ok: false; error: string };

export async function exportBackup(): Promise<ExportResult> {
  const entries = await getFormDataList();
  if (entries.length === 0) {
    return { ok: false, error: 'Dziennik jest pusty - nie ma czego zapisać.' };
  }
  if (!(await Sharing.isAvailableAsync())) {
    return { ok: false, error: 'Udostępnianie plików nie jest dostępne na tym urządzeniu.' };
  }

  const backup: JournalBackup = {
    app: BACKUP_APP,
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
    formacjaCompletedTasks: await getCompletedMap(),
    formacjaLastOpenedDay: (await getLastOpenedDay()) ?? undefined,
  };

  try {
    const file = new File(Paths.cache, `podrecznik-modlitwy-dziennik-${todayStamp()}.json`);
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(backup, null, 2));
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Zapisz kopię dziennika',
      UTI: 'public.json',
    });
    return { ok: true };
  } catch (e) {
    console.error('Nie udało się wyeksportować dziennika:', e);
    return { ok: false, error: 'Nie udało się zapisać pliku kopii.' };
  }
}

// Krok 1 importu: wybór i sprawdzenie pliku, policzenie zmian - BEZ zapisu.
// null = użytkownik anulował wybór pliku.
export type ImportPreview =
  | { ok: true; plan: MergePlan; backup: JournalBackup }
  | { ok: false; error: string };

export async function pickBackupForImport(): Promise<ImportPreview | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Wszystkie typy - Dysk Google i komunikatory często oznaczają plik .json
    // jako "application/octet-stream". Treść i tak sprawdza parseBackup.
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  let text: string;
  try {
    text = await new File(result.assets[0].uri).text();
  } catch (e) {
    console.error('Nie udało się odczytać pliku kopii:', e);
    return { ok: false, error: 'Nie udało się odczytać wybranego pliku.' };
  }

  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;

  const local = await getFormDataList();
  return { ok: true, plan: planMerge(local, parsed.backup.entries), backup: parsed.backup };
}

// Krok 2 importu (po potwierdzeniu): zapis scalonej listy i postępu Formacji.
export async function applyImport(preview: { plan: MergePlan; backup: JournalBackup }): Promise<void> {
  if (preview.plan.addedCount > 0) {
    await saveMergedFormDataList(preview.plan.merged);
  }
  await mergeCompletedMap(preview.backup.formacjaCompletedTasks);
  // Nie nadpisujemy "Kontynuuj" na telefonie, na którym już ktoś pracuje.
  const lastDay = preview.backup.formacjaLastOpenedDay;
  if (lastDay && !(await getLastOpenedDay())) await setLastOpenedDay(lastDay);
}
