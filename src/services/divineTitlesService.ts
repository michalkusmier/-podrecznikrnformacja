// src/services/divineTitlesService.ts
import rawVerses from '../data/biblia.json';
import { DivineTitle } from '../data/divineTitles';
import { Reference } from '../types';
import { BIBLE_BOOKS } from './bibliaService';

type VersesBySkrot = Record<string, Record<string, { number: string; text: string }[]>>;
const versesData = rawVerses as unknown as VersesBySkrot;

const BOOK_NAME_BY_SKROT = new Map(BIBLE_BOOKS.map((b) => [b.skrot, b.nazwa]));

export function bookNameForSkrot(skrot: string): string {
  return BOOK_NAME_BY_SKROT.get(skrot) ?? skrot;
}

// Nieregularna odmiana najczęstszych rzeczowników (nie da się jej złapać
// prostym "rdzeń + końcówka" - np. Bóg -> Boże to zmiana g/ż, nie dopisanie
// końcówki). Klucz: forma mianownika (małe litery). Wartość: wszystkie
// dopuszczalne formy do wyszukania.
const IRREGULAR_FORMS: Record<string, string[]> = {
  bóg: ['bóg', 'boże', 'boga', 'bogu', 'bogiem', 'bogowie', 'bogów'],
  pan: ['pan', 'panie', 'pana', 'panu', 'panem', 'panowie', 'panów'],
  ojciec: ['ojciec', 'ojcze', 'ojca', 'ojcu', 'ojcem', 'ojcowie', 'ojców'],
  jezus: ['jezus', 'jezu', 'jezusa', 'jezusowi', 'jezusem', 'jezusie'],
  palec: ['palec', 'palca', 'palcu', 'palcem', 'palcowi', 'palce'],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// UWAGA: w JavaScript \w i \b są tylko dla ASCII (a-z, A-Z, 0-9, _) - NIE
// obejmują polskich znaków (ą, ć, ę, ł, ń, ó, ś, ź, ż). Bez tej poprawki
// dopasowywanie końcówek odmiany urywałoby się w połowie słowa. Dlatego
// używamy własnej klasy znaków "litera" i lookaroundów zamiast \w/\b.
const PL_LETTER = 'a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ';
const PL_WORD_CHARS = `[${PL_LETTER}]*`;
const BOUNDARY_BEFORE = `(?<![${PL_LETTER}])`;
const BOUNDARY_AFTER = `(?![${PL_LETTER}])`;

// Buduje wzorzec dla jednego słowa: albo alternatywa znanych form
// nieregularnych, albo "rdzeń + dowolna końcówka" (z bezpiecznym minimalnym
// rdzeniem, żeby nie łapać przypadkowych, niepowiązanych słów).
function wordPattern(word: string): string {
  const lower = word.toLowerCase();
  const irregular = IRREGULAR_FORMS[lower];
  if (irregular) {
    return '(?:' + irregular.map(escapeRegExp).join('|') + ')' + PL_WORD_CHARS;
  }
  const minStemLen = 4;
  let cut = 2;
  if (word.length - cut < minStemLen) {
    cut = Math.max(0, word.length - minStemLen);
  }
  const stem = word.slice(0, word.length - cut);
  return escapeRegExp(stem) + PL_WORD_CHARS;
}

function buildPattern(words: string[]): RegExp {
  const parts = words.map(wordPattern);
  return new RegExp(BOUNDARY_BEFORE + parts.join('\\s+') + BOUNDARY_AFTER, 'i');
}

export interface TitleSearchResult {
  skrot: string;
  chapter: number;
  verseNumber: string;
  text: string;
  matched: string;
}

// Cache skompilowanych wzorcow - budowanie regexu dla 91 tytulow przy
// kazdym wyszukiwaniu byloby zbedne.
const patternCache = new Map<string, RegExp>();

function getPattern(title: DivineTitle): RegExp {
  let rx = patternCache.get(title.id);
  if (!rx) {
    rx = buildPattern(title.words);
    patternCache.set(title.id, rx);
  }
  return rx;
}

export function findVersesForTitle(title: DivineTitle, limit = 200): TitleSearchResult[] {
  if (title.manualCitation) {
    const { skrot, chapter, verseNumber } = title.manualCitation;
    const verse = versesData[skrot]?.[String(chapter)]?.find((v) => v.number === verseNumber);
    if (verse) {
      return [{ skrot, chapter, verseNumber, text: verse.text, matched: title.name }];
    }
  }

  const rx = getPattern(title);
  const results: TitleSearchResult[] = [];

  for (const skrot of Object.keys(versesData)) {
    const chapters = versesData[skrot];
    for (const chapterKey of Object.keys(chapters)) {
      for (const v of chapters[chapterKey]) {
        const m = rx.exec(v.text);
        if (m) {
          results.push({
            skrot,
            chapter: parseInt(chapterKey, 10),
            verseNumber: v.number,
            text: v.text,
            matched: m[0],
          });
          if (results.length >= limit) return results;
        }
      }
    }
  }
  return results;
}

export function resultToReference(r: TitleSearchResult): Reference {
  return {
    sigla: { name: bookNameForSkrot(r.skrot), number: `${r.chapter},${r.verseNumber}` },
    quote: r.text,
  };
}
