// src/utils/shareEntry.ts
import { Share } from 'react-native';
import type { SavedFormEntry } from '../types';
import { formatVerseNumber } from './formatVerse';

// Składa wpis z Dziennika w czytelny tekst i otwiera systemowe okno
// "Udostępnij" (SMS, WhatsApp, e-mail, kopiuj do schowka itd. - cokolwiek
// użytkownik ma zainstalowane). Używa wbudowanego React Native Share API,
// bez dodatkowych zależności.
export function formatEntryForSharing(entry: SavedFormEntry): string {
  const parts: string[] = [entry.date];

  if (entry.notes.trim()) {
    parts.push('', 'Notatki:', entry.notes.trim());
  }
  if (entry.externalLight.trim()) {
    parts.push('', 'Światła zewnętrzne:', entry.externalLight.trim());
  }
  if (entry.internalLight.trim()) {
    parts.push('', 'Światła wewnętrzne:', entry.internalLight.trim());
  }
  if ((entry.references ?? []).length > 0) {
    parts.push(
      '',
      'Fragmenty:',
      ...entry.references.map((ref) => `- ${ref.name} ${formatVerseNumber(ref.number)}`)
    );
  }

  return parts.join('\n');
}

export async function shareJournalEntry(entry: SavedFormEntry): Promise<void> {
  try {
    await Share.share({ message: formatEntryForSharing(entry) });
  } catch (e) {
    console.error('Nie udało się udostępnić wpisu:', e);
  }
}
