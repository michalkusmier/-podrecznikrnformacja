// src/navigation/handleReminderTap.ts
import { navigationRef } from './navigationRef';
import type { ReminderKind } from '../services/reminderService';
import { findContinueTarget } from '../data/formacja';
import { getAllCompletedCounts, getLastOpenedDay } from '../services/formacjaService';

// Stuknięcie w powiadomienie przypomnienia - otwiera właściwe miejsce appki.
// Wywoływane z App.tsx (ReminderBridge) dopiero, gdy nawigacja jest gotowa i
// wiadomo, czy jest sesja.
export async function handleReminderTap(kind: ReminderKind, loggedIn: boolean): Promise<void> {
  if (!navigationRef.isReady()) return;

  if (kind === 'czytania' || kind === 'adoracja') {
    navigationRef.navigate('GlownaTab', {
      screen: 'Home',
      params: { openSection: kind, openAt: Date.now() },
      // pop - wróć do istniejącego Home na stosie zamiast dokładać nowy
      // (React Navigation 7 bez tego zawsze dokłada ekran).
      pop: true,
    });
    return;
  }

  // Formacja: lista zawsze pod spodem (żeby "Wstecz" z dnia wracało na
  // listę), a dzień z "Kontynuuj" tylko po zalogowaniu - bez sesji zostajemy
  // na liście, która sama pokazuje logowanie (FormacjaAccessGate).
  navigationRef.navigate('GlownaTab', { screen: 'Formacja', pop: true });
  if (!loggedIn) return;
  const [lastDayId, counts] = await Promise.all([getLastOpenedDay(), getAllCompletedCounts()]);
  const target = findContinueTarget(lastDayId, counts);
  if (!target) return;
  navigationRef.navigate('GlownaTab', {
    screen: 'FormacjaDay',
    params: { weekId: target.week.id, dayId: target.day.id },
  });
}
