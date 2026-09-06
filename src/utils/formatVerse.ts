// src/utils/formatVerse.ts

// Czysto kosmetyczne formatowanie WYŚWIETLANEGO numeru wersetu - nie zmienia
// zapisanych/przechowywanych danych (te zostają w formacie "59,06" itd, bo
// od tego zależy np. wyciąganie numeru rozdziału przez split(',')).
//
// "59,06"   -> "59, 6"
// "9,17"    -> "9, 17"
// "1,01a"   -> "1, 1a"    (litera z Estery zostaje)
// "103,8-17"-> "103, 8-17" (zakresy bez zmian poza spacją)
export function formatVerseNumber(raw: string): string {
  const commaIndex = raw.indexOf(',');
  if (commaIndex === -1) return raw;
  const chapter = raw.slice(0, commaIndex);
  const versePart = raw.slice(commaIndex + 1);
  const stripped = versePart.replace(/^0+(?=\d)/, '');
  return `${chapter}, ${stripped}`;
}
