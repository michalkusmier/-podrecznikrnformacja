// src/services/reminderService.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Przypomnienia - lokalne powiadomienia planowane przez sam telefon (bez
// serwera i bez internetu). Każde przypomnienie ma włącznik, jedną godzinę i
// wybrane dni tygodnia; na każdy wybrany dzień planujemy osobne powiadomienie
// tygodniowe. Specyfikacja: docs/superpowers/specs/2026-10-12-przypomnienia-design.md

export type ReminderKind = 'czytania' | 'formacja' | 'adoracja';

export interface ReminderSetting {
  enabled: boolean;
  hour: number;
  minute: number;
  // 1 = poniedziałek ... 7 = niedziela (po polsku, od poniedziałku).
  weekdays: number[];
}

export type ReminderSettings = Record<ReminderKind, ReminderSetting>;

// Kolejność kart na ekranie - tak, jak wypadają w ciągu dnia przy domyślnych godzinach.
export const REMINDER_KINDS: ReminderKind[] = ['czytania', 'formacja', 'adoracja'];

export const REMINDER_LABELS: Record<ReminderKind, string> = {
  czytania: 'Czytania dnia',
  formacja: 'Formacja',
  adoracja: 'Adoracja / modlitwa',
};

const REMINDER_CONTENT: Record<ReminderKind, { title: string; body: string }> = {
  czytania: { title: 'Czytania dnia', body: 'Słowo Boże na dziś czeka na Ciebie.' },
  formacja: { title: 'Formacja', body: 'Czas na Formację. Kontynuuj swój dzień.' },
  adoracja: { title: 'Czas na modlitwę', body: 'Zatrzymaj się na chwilę z Panem.' },
};

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  czytania: { enabled: false, hour: 6, minute: 30, weekdays: ALL_DAYS },
  formacja: { enabled: false, hour: 7, minute: 0, weekdays: ALL_DAYS },
  adoracja: { enabled: false, hour: 20, minute: 0, weekdays: ALL_DAYS },
};

const STORAGE_KEY = 'reminderSettings';
const CHANNEL_ID = 'przypomnienia';

function isIntIn(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

// Czysta - uzupełnia brakujące/uszkodzone pola domyślnymi (np. zapis ze
// starszej wersji appki albo uszkodzony JSON), pole po polu.
export function normalizeReminderSettings(raw: unknown): ReminderSettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result = {} as ReminderSettings;
  for (const kind of REMINDER_KINDS) {
    const def = DEFAULT_REMINDER_SETTINGS[kind];
    const r = src[kind] && typeof src[kind] === 'object' ? (src[kind] as Record<string, unknown>) : {};
    const weekdays = Array.isArray(r.weekdays)
      ? Array.from(new Set(r.weekdays.filter((d): d is number => isIntIn(d, 1, 7)))).sort((a, b) => a - b)
      : [...def.weekdays];
    result[kind] = {
      enabled: typeof r.enabled === 'boolean' ? r.enabled : def.enabled,
      hour: isIntIn(r.hour, 0, 23) ? r.hour : def.hour,
      minute: isIntIn(r.minute, 0, 59) ? r.minute : def.minute,
      weekdays,
    };
  }
  return result;
}

export interface PlannedReminder {
  kind: ReminderKind;
  // Numeracja expo-notifications: 1 = niedziela ... 7 = sobota.
  expoWeekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

// Czysta - jedno powiadomienie na każdy wybrany dzień włączonego przypomnienia.
export function planReminders(settings: ReminderSettings): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const kind of REMINDER_KINDS) {
    const s = settings[kind];
    if (!s.enabled) continue;
    for (const day of s.weekdays) {
      planned.push({
        kind,
        expoWeekday: (day % 7) + 1, // pn(1) -> 2, ..., sob(6) -> 7, nd(7) -> 1
        hour: s.hour,
        minute: s.minute,
        ...REMINDER_CONTENT[kind],
      });
    }
  }
  return planned;
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return normalizeReminderSettings(raw ? JSON.parse(raw) : null);
  } catch (e) {
    console.error('Nie udało się odczytać ustawień przypomnień:', e);
    return normalizeReminderSettings(null);
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Nie udało się zapisać ustawień przypomnień:', e);
  }
}

// Sprawdza zgodę bez pytania (np. przy starcie appki).
export async function hasNotificationPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

// Pyta o zgodę, jeśli jeszcze nie pytano - wywoływane dopiero przy pierwszym
// włączeniu któregoś przypomnienia, nie przy starcie appki.
export async function ensureNotificationPermission(): Promise<'granted' | 'denied'> {
  if (await hasNotificationPermission()) return 'granted';
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted ? 'granted' : 'denied';
}

// Kasuje wszystkie zaplanowane powiadomienia appki (innych lokalnych
// powiadomień appka nie ma) i planuje od nowa według ustawień.
async function runSync(settings: ReminderSettings): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Przypomnienia',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of planReminders(settings)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, data: { reminderKind: r.kind } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: r.expoWeekday,
        hour: r.hour,
        minute: r.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
}

// Przeplanowania idą po kolei, nigdy równolegle: szybkie zmiany na ekranie
// (np. odznaczenie pn, a zaraz wt) inaczej nakładałyby się i zostawiały
// odznaczone albo podwójne powiadomienia. Gdy przeplanowanie trwa, kolejne
// prośby czekają, a wykonuje się tylko najnowsza. Rzuca, jeśli nie udało się
// ostatnie przeplanowanie - ekran pokazuje wtedy komunikat.
let syncRunning: Promise<void> | null = null;
let syncPending: ReminderSettings | null = null;

export function syncScheduledReminders(settings: ReminderSettings): Promise<void> {
  syncPending = settings;
  if (!syncRunning) {
    syncRunning = (async () => {
      let lastError: unknown = null;
      try {
        while (syncPending) {
          const next = syncPending;
          syncPending = null;
          try {
            await runSync(next);
            lastError = null;
          } catch (e) {
            lastError = e;
          }
        }
      } finally {
        syncRunning = null;
      }
      if (lastError) throw lastError;
    })();
  }
  return syncRunning;
}
