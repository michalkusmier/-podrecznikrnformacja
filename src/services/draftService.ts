// src/services/draftService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedReference, FormacjaJournalSource } from '../types';

export interface JournalDraft {
  date: string;
  notes: string;
  externalLight: string;
  internalLight: string;
  references: SavedReference[];
  formacjaSource?: FormacjaJournalSource;
}

// Szkic ekranu "Dziennik Modlitwy" (MyFormScreen) - wypełnianego zaraz po
// zakończonej modlitwie. includedFragmentKeys to zserializowany Set (klucze
// fragmentów odznaczonych/zaznaczonych do zapisu).
export interface MyFormDraft {
  notes: string;
  externalLight: string;
  internalLight: string;
  includedFragmentKeys: string[];
}

const STORAGE_PREFIX = 'journalDraft:';

// Z solidnym zapasem dłuższy niż typowy czas wyznaczony na modlitwę, żeby
// "Wstecz"/"Anuluj"/inny przycisk w trakcie i zaraz po modlitwie nigdy nie
// skasowały wpisanych już notatek.
const DEFAULT_TTL_MS = 3 * 60 * 60 * 1000; // 3 godziny

interface StoredDraft<T> {
  value: T;
  expiresAt: number;
}

// Niezapisane zmiany w formularzach dziennika (nowy wpis, edycja wpisu,
// "Dziennik Modlitwy" zaraz po modlitwie) - trzymane w AsyncStorage (nie w
// pamięci komponentu/kontekstu), żeby przetrwały odmontowanie ekranu przez
// dowolną ścieżkę nawigacji (Anuluj/Wstecz/zmiana zakładki), a nawet
// zamknięcie i ponowne otwarcie appki. Przy ponownym wejściu na ten sam
// formularz dane wracają zamiast zaczynać od zera - a znikają dopiero po
// realnym zapisaniu/usunięciu wpisu ALBO po upłynięciu TTL.
export async function getDraft<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return undefined;
    const parsed: StoredDraft<T> = JSON.parse(raw);
    if (Date.now() > parsed.expiresAt) {
      await AsyncStorage.removeItem(STORAGE_PREFIX + key);
      return undefined;
    }
    return parsed.value;
  } catch (e) {
    console.error('Nie udało się odczytać szkicu:', e);
    return undefined;
  }
}

export async function setDraft<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  try {
    const payload: StoredDraft<T> = { value, expiresAt: Date.now() + ttlMs };
    await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch (e) {
    console.error('Nie udało się zapisać szkicu:', e);
  }
}

export async function clearDraft(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    console.error('Nie udało się usunąć szkicu:', e);
  }
}
