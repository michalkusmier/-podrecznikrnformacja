// src/types.ts
// Wspólne typy danych odpowiadające strukturze podrecznik.json

export interface Sigla {
  name: string;
  number?: string;
  ratio?: string;
}

export interface Reference {
  sigla?: Sigla;
  quote: string;
}

export interface Subsubsection {
  references: Reference[];
}

export interface Subsection {
  [subsubsection: string]: Subsubsection;
}

export interface Section {
  [subsection: string]: Subsection;
}

export interface GuidanceData {
  [section: string]: Section;
}

// Odnośnik do zapisu w dzienniku modlitwy - tylko sigla (np. "Ps" 23,1),
// bez treści wersetu (treść zawsze można doczytać w Biblii po odnośniku).
export interface SavedReference {
  name: string;
  number: string;
}

// Powiązanie wpisu dziennika z konkretnym dniem Formacji - wypełnione tylko
// dla przemyśleń zapisanych bezpośrednio z ekranu dnia Formacji (przycisk
// "Zapisz przemyślenie"). Pozwala pokazać te wpisy zarówno przy danym dniu
// Formacji, jak i oznaczyć je w ogólnej Historii Dziennika.
export interface FormacjaJournalSource {
  weekId: string;
  weekNumber: number;
  dayId: string;
  dayNumber: number;
  dayTitle: string;
}

export interface SavedFormEntry {
  id: string; // unikalny identyfikator wpisu - potrzebny do edycji/usuwania
  date: string; // czytelna data po polsku, np. "3 lipca 2026"
  notes: string;
  externalLight: string; // światła zewnętrzne - wydarzenia
  internalLight: string; // światła wewnętrzne - poruszenia wewnętrzne
  references: SavedReference[];
  formacjaSource?: FormacjaJournalSource;
}

// Typy parametrów nawigacji - im więcej ekranów, tym bardziej się to przyda.
//
// Struktura: dolny pasek zakładek (zawsze widoczny) z dwiema zakładkami:
// - GlownaTab: stos ekranów (Home - zawiera wybór fragmentów wprost na
//   sobie, Wstęp, Biblia, Imiona i tytuły Boga, Formacja, świeca, formularz)
// - DziennikTab: Historia Dziennika, dostępna z każdego miejsca w appce
export type MainStackParamList = {
  // resetAt - opcjonalny "token" (np. Date.now()) wymuszający reset wyboru
  // sekcji na Głównej. Potrzebny, bo Adoracja/Proklamacja/Biblia/Czytania to
  // stan WEWNĄTRZ ekranu Home (nie osobne ekrany) - nawigacja do already-
  // focused "Home" sama w sobie nic nie zmienia i nie odpala useFocusEffect,
  // ale zmiana parametrów owszem, więc to jedyny niezawodny sposób na reset
  // z zewnątrz (np. z zakładki "Główna" na dolnym pasku).
  Home: { resetAt?: number } | undefined;
  Wstep: undefined;
  Biblia: { openBook?: string; openChapter?: number; openVerseNumber?: string } | undefined;
  DivineTitles: undefined;
  Formacja: undefined;
  FormacjaWeek: { weekId: string };
  FormacjaDay: { weekId: string; dayId: string };
  SelectedItems: { selectedItems: Reference[]; minutesInput?: number };
  MyForm: undefined;
  // undefined/brak entryId -> nowy wpis "poza modlitwą" (bez fragmentów);
  // entryId ustawiony -> edycja istniejącego wpisu z Historii Dziennika.
  // formacjaSource - wypełniany tylko przy tworzeniu NOWEGO wpisu z ekranu
  // dnia Formacji (przycisk "Zapisz przemyślenie"), żeby oznaczyć powiązanie.
  JournalEntry: { entryId?: string; formacjaSource?: FormacjaJournalSource } | undefined;
};

export type TabParamList = {
  GlownaTab: import('@react-navigation/native').NavigatorScreenParams<MainStackParamList> | undefined;
  ModlitwaTab: undefined;
  DziennikTab: undefined;
};
