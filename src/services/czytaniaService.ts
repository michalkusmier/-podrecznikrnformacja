// src/services/czytaniaService.ts
//
// Czytania liturgiczne na dziś (online, pobierane na żądanie z paulus.org.pl -
// oficjalna strona Towarzystwa Świętego Pawła publikująca codzienne czytania
// mszalne wg lekcjonarza Kościoła katolickiego). W przeciwieństwie do reszty
// appki (Biblia, Podręcznik, Imiona i tytuły Boga) ta funkcja WYMAGA
// internetu - czytania zmieniają się codziennie i zależą od ruchomego
// kalendarza liturgicznego (Wielkanoc, trzyletni cykl A/B/C, dwuletni I/II),
// więc nie da się ich sensownie wbudować na stałe tak jak Biblii.
//
// UWAGA (kruchość): parser opiera się na stałych formułach liturgicznych
// ("PIERWSZE CZYTANIE (...)", "Oto słowo Boże.", "EWANGELIA (...)", "Oto
// słowo Pańskie.") zamiast na strukturze HTML strony (klasy/id), bo te
// formuły są ustalone przez Kościół i raczej się nie zmienią - ale jeśli
// paulus.org.pl przebuduje układ strony w sposób zmieniający te fragmenty,
// parser może przestać znajdować dopasowania. W takiej sytuacji
// fetchTodaysReadings zwróci pustą listę odczytów (nie awaria appki, tylko
// czytelny komunikat "nie udało się rozpoznać czytań") - warto to od czasu
// do czasu sprawdzić ręcznie, otwierając sourceUrl w przeglądarce.
//
// Prawa autorskie: tekst czytań to oficjalny przekład liturgiczny (ten sam
// tekst co Biblia Tysiąclecia + formuły Kościoła), własność Wydawnictwa
// Pallottinum/Episkopatu. Appka nie zapisuje pobranych czytań na stałe -
// pobiera je od nowa przy każdym wejściu w tę zakładkę, i pokazuje źródło.

export interface CzytanieItem {
  key: string; // 'pierwsze' | 'psalm' | 'drugie' | 'ewangelia'
  label: string; // np. "Pierwsze czytanie"
  reference: string; // np. "1 Kor 1, 1-9"
  text: string;
}

export interface CzytaniaDnia {
  dateLabel: string; // np. "czwartek, 27 sierpnia 2026"
  sourceUrl: string;
  items: CzytanieItem[];
}

const MIESIACE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
const DNI_TYGODNIA = [
  'niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota',
];

function formatPolishDate(d: Date): string {
  return `${DNI_TYGODNIA[d.getDay()]}, ${d.getDate()} ${MIESIACE[d.getMonth()]} ${d.getFullYear()}`;
}

function dateUrlParam(d: Date): string {
  // paulus.org.pl przyjmuje datę w formacie rok-miesiąc-dzień, bez zer
  // wiodących (np. "2026-8-27", nie "2026-08-27")
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function stripHtml(html: string): string {
  let text = html
    // usuń całe bloki script/style, żeby ich zawartość nie trafiła do tekstu
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // zamień znaczniki blokowe na znak nowej linii, żeby zachować akapity
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])[^>]*>/gi, '\n')
    // usuń resztę znaczników
    .replace(/<[^>]+>/g, ' ');

  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]*\n+/g, '\n\n')
    .replace(/ *\n */g, '\n');

  return text.trim();
}

function cleanBody(body: string): string {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

interface Extracted {
  reference: string;
  body: string;
  endIndex: number;
}

// Wyszukuje sekcję typu "ETYKIETA (odnośnik)" zaczynając od fromIndex, i
// wycina jej treść aż do najbliższego z podanych znaczników końcowych.
// Sekwencyjne przeszukiwanie "od fromIndex w przód" (zamiast od początku
// całego tekstu za każdym razem) zapobiega przypadkowemu dopasowaniu tej
// samej frazy występującej wcześniej na stronie.
function extractSection(
  text: string,
  fromIndex: number,
  label: string,
  endMarkers: string | string[]
): Extracted | null {
  const labelIdx = text.indexOf(label, fromIndex);
  if (labelIdx === -1) return null;

  const afterLabel = text.slice(labelIdx + label.length);
  // Uwaga: cytaty Psalmów mają czasem zagnieżdżony nawias z numeracją wg
  // Septuaginty, np. "(Ps 145 (144), 2-3. 4-5. 6-7)" - zwykły "wszystko poza
  // )" nie złapałby całości (zatrzymałby się na pierwszym ")" z "(144)").
  // Ten wzorzec dopuszcza jeden poziom zagnieżdżenia nawiasów.
  const parenMatch = /^\s*\(((?:[^()]|\([^()]*\))*)\)/.exec(afterLabel);
  if (!parenMatch) return null;

  const reference = parenMatch[1].trim();
  const bodyStart = labelIdx + label.length + parenMatch[0].length;

  const markers = Array.isArray(endMarkers) ? endMarkers : [endMarkers];
  let endIdx = text.length;
  for (const marker of markers) {
    const idx = text.indexOf(marker, bodyStart);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }

  return {
    reference,
    body: cleanBody(text.slice(bodyStart, endIdx)),
    endIndex: endIdx,
  };
}

export async function fetchTodaysReadings(): Promise<CzytaniaDnia> {
  const today = new Date();
  const sourceUrl = `https://www.paulus.org.pl/czytania?data=${dateUrlParam(today)}`;

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać czytań (HTTP ${response.status}).`);
  }
  const html = await response.text();
  const text = stripHtml(html);

  const items: CzytanieItem[] = [];
  let cursor = 0;

  const pierwsze = extractSection(text, cursor, 'PIERWSZE CZYTANIE', 'Oto słowo Boże.');
  if (pierwsze) {
    items.push({ key: 'pierwsze', label: 'Pierwsze czytanie', reference: pierwsze.reference, text: pierwsze.body });
    cursor = pierwsze.endIndex;
  }

  const psalm = extractSection(text, cursor, 'PSALM RESPONSORYJNY', [
    'DRUGIE CZYTANIE',
    'ŚPIEW PRZED EWANGELIĄ',
    'SEKWENCJA',
  ]);
  if (psalm) {
    items.push({ key: 'psalm', label: 'Psalm responsoryjny', reference: psalm.reference, text: psalm.body });
    cursor = psalm.endIndex;
  }

  // "Drugie czytanie" pojawia się tylko w niedziele i uroczystości - jeśli go
  // nie ma na dzisiejszej stronie, po prostu je pomijamy.
  const spiewIdx = text.indexOf('ŚPIEW PRZED EWANGELIĄ', cursor);
  const drugieIdx = text.indexOf('DRUGIE CZYTANIE', cursor);
  if (drugieIdx !== -1 && (spiewIdx === -1 || drugieIdx < spiewIdx)) {
    const drugie = extractSection(text, cursor, 'DRUGIE CZYTANIE', 'Oto słowo Boże.');
    if (drugie) {
      items.push({ key: 'drugie', label: 'Drugie czytanie', reference: drugie.reference, text: drugie.body });
      cursor = drugie.endIndex;
    }
  }

  const ewangelia = extractSection(text, cursor, 'EWANGELIA', 'Oto słowo Pańskie.');
  if (ewangelia) {
    items.push({ key: 'ewangelia', label: 'Ewangelia', reference: ewangelia.reference, text: ewangelia.body });
  }

  return {
    dateLabel: formatPolishDate(today),
    sourceUrl,
    items,
  };
}
