// src/services/bibliaService.ts
//
// Źródło danych: lokalny plik src/data/biblia.json, wygenerowany raz z pliku
// "Biblia-Tysiąclecia-Pallotinum.pdf" (transkrypcja PISMO-SW 3.0 BETA,
// Piotr Kłosowski, 1994-2002, tekst: Biblia Tysiąclecia, Wydawnictwo Pallottinum).
//
// UWAGA (ważne): to konkretne źródło PDF jest oznaczone przez autora jako "BETA"
// i ma jedną lukę - Księga Estery zawiera tylko 17 wersetów (fragment
// deuterokanoniczny "Dodatek A"), bez pełnego tekstu hebrajskiego rozdziałów 1-10.
// Wszystkie pozostałe 72 księgi mają kompletną, zweryfikowaną liczbę rozdziałów
// zgodną ze standardowym kanonem katolickim.
//
// Dane są wbudowane w aplikację (appka działa offline, nic nie jest pobierane
// z internetu w czasie działania).

import rawVerses from '../data/biblia.json';
import rawBooksMeta from '../data/biblia_books.json';

export interface BibleVerseEntry {
  number: string; // np. "1", "01", "01a" (Estera ma litery)
  text: string;
}

export interface BibleBook {
  skrot: string;
  nazwa: string;
  testament: 'ST' | 'NT';
  index: number; // kolejność w kanonie (0-based)
}

type VersesBySkrot = Record<string, Record<string, BibleVerseEntry[]>>;

const versesData = rawVerses as unknown as VersesBySkrot;
const booksMeta = rawBooksMeta as unknown as { order: string[]; names: Record<string, string> };

// Ostatnia księga Starego Testamentu w kolejności pliku to "Ml" (Malachiasza) -
// wszystko od "Mt" (Mateusza) w dół to Nowy Testament.
const LAST_OT_SKROT = 'Ml';

export const BIBLE_BOOKS: BibleBook[] = (() => {
  let isNT = false;
  return booksMeta.order.map((skrot, index) => {
    const book: BibleBook = {
      skrot,
      nazwa: booksMeta.names[skrot] ?? skrot,
      testament: isNT ? 'NT' : 'ST',
      index,
    };
    if (skrot === LAST_OT_SKROT) isNT = true;
    return book;
  });
})();

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // usuń znaki diakrytyczne do porównań
}

export interface GlobalSearchResult {
  skrot: string;
  bookName: string;
  bookIndex: number;
  chapter: number;
  verseNumber: string;
  text: string;
}

// Przeszukuje TEKST wszystkich wersetów w całej Biblii (nie nazwy ksiąg).
// Np. zapytanie "Królem" zwróci każdy werset, w którym to słowo występuje,
// z dowolnej księgi. `limit` chroni UI przed wyrenderowaniem tysięcy wyników
// naraz przy bardzo częstych słowach - `total` mówi ile naprawdę pasuje.
export function searchAllVerses(
  query: string,
  limit = 300
): { results: GlobalSearchResult[]; total: number } {
  const q = normalize(query.trim());
  if (!q || q.length < 2) return { results: [], total: 0 };

  const bookByskrot = new Map(BIBLE_BOOKS.map((b) => [b.skrot, b]));
  const results: GlobalSearchResult[] = [];
  let total = 0;

  for (const skrot of Object.keys(versesData)) {
    const book = bookByskrot.get(skrot);
    if (!book) continue;
    const chapters = versesData[skrot];
    for (const chapterKey of Object.keys(chapters)) {
      const chapterNum = parseInt(chapterKey, 10);
      for (const v of chapters[chapterKey]) {
        if (normalize(v.text).includes(q)) {
          total++;
          if (results.length < limit) {
            results.push({
              skrot,
              bookName: book.nazwa,
              bookIndex: book.index,
              chapter: chapterNum,
              verseNumber: v.number,
              text: v.text,
            });
          }
        }
      }
    }
  }

  return { results, total };
}

export function sortGlobalResults(
  results: GlobalSearchResult[],
  mode: 'kanon' | 'az'
): GlobalSearchResult[] {
  const copy = [...results];
  if (mode === 'az') {
    copy.sort(
      (a, b) =>
        a.bookName.localeCompare(b.bookName, 'pl') ||
        a.chapter - b.chapter ||
        a.verseNumber.localeCompare(b.verseNumber)
    );
  } else {
    copy.sort(
      (a, b) =>
        a.bookIndex - b.bookIndex ||
        a.chapter - b.chapter ||
        a.verseNumber.localeCompare(b.verseNumber)
    );
  }
  return copy;
}

export function searchBooks(query: string): BibleBook[] {
  const q = normalize(query.trim());
  if (!q) return BIBLE_BOOKS;
  return BIBLE_BOOKS.filter(
    (b) => normalize(b.nazwa).includes(q) || normalize(b.skrot).includes(q)
  );
}

export function sortBooks(books: BibleBook[], mode: 'kanon' | 'az'): BibleBook[] {
  const copy = [...books];
  if (mode === 'az') {
    copy.sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
  } else {
    copy.sort((a, b) => a.index - b.index);
  }
  return copy;
}

export function getChapterNumbers(skrot: string): number[] {
  const book = versesData[skrot];
  if (!book) return [];
  return Object.keys(book)
    .map((n) => parseInt(n, 10))
    .sort((a, b) => a - b);
}

export function getChapterVerses(skrot: string, chapter: number): BibleVerseEntry[] {
  const book = versesData[skrot];
  if (!book) return [];
  return book[String(chapter)] ?? [];
}

// Klucz sortowania wersetu - "01a" -> [1, 'a'], żeby sortowanie numeryczne
// działało też dla wersetów z literą (Estera).
function verseSortKey(v: BibleVerseEntry): [number, string] {
  const match = /^(\d+)([a-z]*)$/.exec(v.number);
  if (!match) return [0, v.number];
  return [parseInt(match[1], 10), match[2]];
}

export function searchVerses(verses: BibleVerseEntry[], query: string): BibleVerseEntry[] {
  const q = normalize(query.trim());
  if (!q) return verses;
  return verses.filter((v) => normalize(v.text).includes(q) || v.number.includes(q));
}

export function sortVerses(verses: BibleVerseEntry[], descending: boolean): BibleVerseEntry[] {
  const copy = [...verses].sort((a, b) => {
    const [an, al] = verseSortKey(a);
    const [bn, bl] = verseSortKey(b);
    if (an !== bn) return an - bn;
    return al.localeCompare(bl);
  });
  if (descending) copy.reverse();
  return copy;
}

// --- Rozpoznawanie cytatów liturgicznych (dla zakładki "Czytania dnia") ---
//
// Czytania mszalne pobierane są jako sam odnośnik (np. "1 Kor 1, 1-9" albo
// "Ps 145 (144), 2-3. 4-5. 6-7") + zeskrobany tekst czytania. Zamiast dzielić
// ten zeskrobany tekst na wersety (nie ma w nim widocznych numerów
// wersetów - byłoby to niemożliwe do zrobienia niezawodnie), rozpoznajemy
// odnośnik i wyciągamy właściwe wersety z lokalnych, sprawdzonych danych
// Biblii Tysiąclecia (te same dane co zakładka Biblia). To dokładniejsze i
// odporniejsze niż zgadywanie granic wersetów w tekście bez numeracji.

export interface ResolvedVerse {
  chapter: number;
  entry: BibleVerseEntry;
}

export interface ResolvedCitation {
  skrot: string;
  bookName: string;
  verses: ResolvedVerse[];
}

function verseBaseNumber(numberStr: string): number {
  const match = /^(\d+)/.exec(numberStr);
  return match ? parseInt(match[1], 10) : NaN;
}

// Dopasowanie skrótu księgi po znormalizowanym tekście (bez rozróżniania
// wielkości liter/znaków diakrytycznych) - drobne różnice w formacie cytatu
// (spacja, wielkość litery) nie powinny psuć dopasowania.
function findBookBySkrot(raw: string): BibleBook | null {
  const target = normalize(raw.trim());
  return BIBLE_BOOKS.find((b) => normalize(b.skrot) === target) ?? null;
}

// Parsuje odnośnik liturgiczny typu "1 Kor 1, 1-9" albo "Ps 145 (144), 2-3.
// 4-5. 6-7" na listę konkretnych wersetów z lokalnych danych. Zwraca null,
// jeśli nie uda się rozpoznać formatu (np. rzadkie cytaty rozciągnięte na
// wiele rozdziałów w bardziej złożony sposób niż obsługiwany niżej, typu
// czytania Męki Pańskiej) - wywołujący powinien wtedy pokazać cały
// zeskrobany tekst czytania jako jeden fragment zamiast pojedynczych
// wersetów.
export function resolveCitationVerses(citation: string): ResolvedCitation | null {
  const raw = citation.trim();

  // Główny wzorzec: "<księga> <rozdział>[ (numeracja LXX)], <specyfikacja>"
  const mainMatch = /^(.*?)(\d+)(?:\s*\([^)]*\))?\s*,\s*(.+)$/.exec(raw);
  if (!mainMatch) return null;

  const bookRaw = mainMatch[1].trim();
  const chapter = parseInt(mainMatch[2], 10);
  const verseSpec = mainMatch[3].trim();

  const book = findBookBySkrot(bookRaw);
  if (!book) return null;

  // Rzadki przypadek: cytat rozciągnięty na dwa rozdziały, np.
  // "1 Kor 12, 31 – 13, 13" (specyfikacja po pierwszym przecinku to
  // "31 – 13, 13"). Obsługujemy tylko ten prosty, dwuczłonowy przypadek.
  const crossChapterMatch = /^(\d+)[a-z]?\s*[–-]\s*(\d+)\s*,\s*(\d+)[a-z]?$/.exec(verseSpec);
  if (crossChapterMatch) {
    const startVerse = parseInt(crossChapterMatch[1], 10);
    const endChapter = parseInt(crossChapterMatch[2], 10);
    const endVerse = parseInt(crossChapterMatch[3], 10);
    if (endChapter < chapter || endChapter - chapter > 5) return null; // sanity check

    const verses: ResolvedVerse[] = [];
    for (let ch = chapter; ch <= endChapter; ch++) {
      const chapterVerses = getChapterVerses(book.skrot, ch);
      if (chapterVerses.length === 0) return null;
      for (const entry of chapterVerses) {
        const n = verseBaseNumber(entry.number);
        if (ch === chapter && n < startVerse) continue;
        if (ch === endChapter && n > endVerse) continue;
        verses.push({ chapter: ch, entry });
      }
    }
    return verses.length ? { skrot: book.skrot, bookName: book.nazwa, verses } : null;
  }

  const chapterVerses = getChapterVerses(book.skrot, chapter);
  if (chapterVerses.length === 0) return null;

  // "2-3. 4-5. 6-7" -> segmenty rozdzielone kropką, każdy to pojedynczy
  // numer albo zakres (litery na końcu, np. "12a", są ignorowane przy
  // dopasowaniu - appka nie ma podziału na połówki wersetów poza Esterą).
  const segments = verseSpec.split('.').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  const verses: ResolvedVerse[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    const rangeMatch = /^(\d+)[a-z]?\s*[-–]\s*(\d+)[a-z]?$/.exec(segment);
    const singleMatch = /^(\d+)[a-z]?$/.exec(segment);

    let start: number;
    let end: number;
    if (rangeMatch) {
      start = parseInt(rangeMatch[1], 10);
      end = parseInt(rangeMatch[2], 10);
    } else if (singleMatch) {
      start = end = parseInt(singleMatch[1], 10);
    } else {
      continue; // nierozpoznany segment - pomijamy go, nie przerywając reszty
    }

    for (const entry of chapterVerses) {
      const n = verseBaseNumber(entry.number);
      if (n >= start && n <= end && !seen.has(entry.number)) {
        seen.add(entry.number);
        verses.push({ chapter, entry });
      }
    }
  }

  return verses.length ? { skrot: book.skrot, bookName: book.nazwa, verses } : null;
}
