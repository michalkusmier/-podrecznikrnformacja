// src/components/BibliaBrowser.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useSelection } from '../context/SelectionContext';
import { formatVerseNumber } from '../utils/formatVerse';
import {
  BIBLE_BOOKS,
  BibleBook,
  BibleVerseEntry,
  GlobalSearchResult,
  getChapterNumbers,
  getChapterVerses,
  searchAllVerses,
  searchBooks,
  searchVerses,
  sortBooks,
  sortGlobalResults,
  sortVerses,
} from '../services/bibliaService';

type Tab = 'search' | 'browse';
type BrowseMode = 'books' | 'chapters' | 'verses';

export interface BibliaDeepLink {
  openBook: string;
  openChapter?: number;
  openVerseNumber?: string;
}

interface BibliaBrowserProps {
  // Wywoływane po kliknięciu "Modlitwa (n)" - przejście do kolejki wybranych
  // fragmentów. Ekran-właściciel (BibliaScreen albo HomeScreen) decyduje,
  // jak nawigować dalej.
  goToQueue: () => void;
  // Opcjonalny deep-link "otwórz od razu ten werset" (używany przez
  // BibliaScreen z Historii Dziennika). Przy zmianie tego obiektu komponent
  // otwiera wskazaną księgę/rozdział/werset.
  deepLink?: BibliaDeepLink | null;
  // Wywoływane raz po obsłużeniu deepLink, żeby właściciel mógł wyczyścić
  // swój stan/parametry (np. navigation.setParams).
  onDeepLinkHandled?: () => void;
}

// Przeglądarka Biblii Tysiąclecia (dane lokalne, offline). Współdzielony
// komponent używany zarówno przez samodzielny ekran "Biblia" (BibliaScreen,
// dostępny też przez deep-link z Historii Dziennika), jak i osadzony
// bezpośrednio wewnątrz ekranu głównego (HomeScreen), po kliknięciu kafelka
// "Biblia Tysiąclecia".
//
// Dwie zakładki:
// - "Szukaj w tekście": pełnotekstowe wyszukiwanie słowa/frazy w całej Biblii
//   (nie po nazwach ksiąg) - np. "Królem" zwraca każdy pasujący werset z
//   dowolnej księgi.
// - "Przeglądaj księgi": księga -> rozdział -> wersety, z wyszukiwaniem i
//   sortowaniem w obrębie rozdziału.
//
// W obu przypadkach zaznaczone wersety trafiają do tej samej wspólnej
// kolejki (SelectionContext), tak jak na ekranie głównym.
export default function BibliaBrowser({ goToQueue, deepLink, onDeepLinkHandled }: BibliaBrowserProps) {
  const { colors } = useAppTheme();

  const [tab, setTab] = useState<Tab>('search');
  const { fragments: selectedFragments, toggleFragment: toggleFragmentRef, isSelected: isRefSelected } = useSelection();

  // --- Zakładka: szukaj w tekście (cała Biblia) ---
  const [globalQuery, setGlobalQuery] = useState('');
  const [debouncedGlobalQuery, setDebouncedGlobalQuery] = useState('');
  const [globalSort, setGlobalSort] = useState<'kanon' | 'az'>('kanon');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedGlobalQuery(globalQuery), 250);
    return () => clearTimeout(t);
  }, [globalQuery]);

  const globalSearch = useMemo(() => searchAllVerses(debouncedGlobalQuery), [debouncedGlobalQuery]);
  const globalResults = useMemo(
    () => sortGlobalResults(globalSearch.results, globalSort),
    [globalSearch, globalSort]
  );

  // --- Zakładka: przeglądaj księgi ---
  const [browseMode, setBrowseMode] = useState<BrowseMode>('books');
  const [bookQuery, setBookQuery] = useState('');
  const [bookSort, setBookSort] = useState<'kanon' | 'az'>('kanon');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [chapters, setChapters] = useState<number[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<BibleVerseEntry[]>([]);
  const [verseQuery, setVerseQuery] = useState('');
  const [verseSortDesc, setVerseSortDesc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightVerseNumber, setHighlightVerseNumber] = useState<string | null>(null);
  const versesListRef = useRef<FlatList<BibleVerseEntry>>(null);

  const visibleBooks = useMemo(
    () => sortBooks(searchBooks(bookQuery), bookSort),
    [bookQuery, bookSort]
  );

  const visibleVerses = useMemo(
    () => sortVerses(searchVerses(verses, verseQuery), verseSortDesc),
    [verses, verseQuery, verseSortDesc]
  );

  // Deep-link (np. z Historii Dziennika, przekazany przez ekran-właściciela):
  // "otwórz od razu ten werset". Dla zakresów (np. "8-17") podświetlamy i
  // przewijamy tylko do pierwszego wersetu zakresu, nie do całego zakresu.
  useEffect(() => {
    if (!deepLink?.openBook) return;
    const { openBook: dlBookName, openChapter: dlChapter, openVerseNumber: dlVerseNumber } = deepLink;

    const book = BIBLE_BOOKS.find((b) => b.nazwa === dlBookName);
    if (book) {
      setTab('browse');
      setSelectedBook(book);
      const chapterNums = getChapterNumbers(book.skrot);
      setChapters(chapterNums);
      const chapterToOpen =
        dlChapter && chapterNums.includes(dlChapter) ? dlChapter : chapterNums[0];
      if (chapterToOpen) {
        const chapterVerses = getChapterVerses(book.skrot, chapterToOpen);
        setSelectedChapter(chapterToOpen);
        setVerses(chapterVerses);
        setVerseQuery('');
        setVerseSortDesc(false);
        setBrowseMode('verses');
        setHighlightVerseNumber(dlVerseNumber ?? null);

        if (dlVerseNumber) {
          const targetIndex = chapterVerses.findIndex((v) => v.number === dlVerseNumber);
          if (targetIndex >= 0) {
            // Malutkie opóźnienie, żeby FlatList zdążył się wyrenderować
            // zanim spróbujemy do niego przewinąć.
            setTimeout(() => {
              versesListRef.current?.scrollToIndex({
                index: targetIndex,
                animated: true,
                viewPosition: 0.25,
              });
            }, 150);
          }
        }
      } else {
        setBrowseMode('chapters');
      }
    }
    // Informujemy właściciela, że deep-link został obsłużony, żeby mógł
    // wyczyścić swój stan (np. navigation.setParams) - ponowne wejście na
    // ekran nie powinno "pamiętać" starego celu.
    onDeepLinkHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink]);

  useEffect(() => {
    if (!highlightVerseNumber) return;
    const t = setTimeout(() => setHighlightVerseNumber(null), 4000);
    return () => clearTimeout(t);
  }, [highlightVerseNumber]);

  function openBook(book: BibleBook) {
    setSelectedBook(book);
    setLoading(true);
    setTimeout(() => {
      setChapters(getChapterNumbers(book.skrot));
      setLoading(false);
      setBrowseMode('chapters');
    }, 0);
  }

  function openChapter(chapter: number) {
    if (!selectedBook) return;
    setSelectedChapter(chapter);
    setLoading(true);
    setTimeout(() => {
      setVerses(getChapterVerses(selectedBook.skrot, chapter));
      setVerseQuery('');
      setVerseSortDesc(false);
      setLoading(false);
      setBrowseMode('verses');
    }, 0);
  }

  function toggleFragment(bookName: string, chapter: number, v: BibleVerseEntry) {
    toggleFragmentRef({
      sigla: { name: bookName, number: `${chapter},${v.number}` },
      quote: v.text,
    });
  }

  function isFragmentSelected(bookName: string, chapter: number, verseNumber: string): boolean {
    return isRefSelected({
      sigla: { name: bookName, number: `${chapter},${verseNumber}` },
      quote: '',
    });
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tabButton, tab === 'search' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('search')}
        >
          <Text style={{ color: tab === 'search' ? colors.primary : colors.subtext, fontWeight: '600' }}>
            Szukaj w tekście
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === 'browse' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('browse')}
        >
          <Text style={{ color: tab === 'browse' ? colors.primary : colors.subtext, fontWeight: '600' }}>
            Przeglądaj księgi
          </Text>
        </Pressable>
      </View>

      {tab === 'search' && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <TextInput
              value={globalQuery}
              onChangeText={setGlobalQuery}
              placeholder="Szukaj słowa lub frazy, np. „Królem”..."
              placeholderTextColor={colors.subtext}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              autoFocus
            />

            {debouncedGlobalQuery.trim().length >= 2 && (
              <View style={styles.sortRow}>
                <Text style={{ color: colors.subtext, fontSize: 13 }}>
                  {globalSearch.total} {globalSearch.total === 1 ? 'wynik' : 'wyników'}
                  {globalSearch.total > globalResults.length
                    ? ` (pokazano pierwsze ${globalResults.length})`
                    : ''}
                  {'  ·  Sortuj: '}
                </Text>
                <Pressable onPress={() => setGlobalSort('kanon')} style={styles.sortOption}>
                  <Text
                    style={{
                      color: globalSort === 'kanon' ? colors.primary : colors.subtext,
                      fontWeight: globalSort === 'kanon' ? '700' : '400',
                    }}
                  >
                    Kolejność biblijna
                  </Text>
                </Pressable>
                <Pressable onPress={() => setGlobalSort('az')} style={styles.sortOption}>
                  <Text
                    style={{
                      color: globalSort === 'az' ? colors.primary : colors.subtext,
                      fontWeight: globalSort === 'az' ? '700' : '400',
                    }}
                  >
                    Nazwa księgi A-Z
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {debouncedGlobalQuery.trim().length < 2 ? (
            <Text style={{ color: colors.subtext, padding: 16 }}>
              Wpisz co najmniej 2 znaki, aby przeszukać cały tekst Biblii.
            </Text>
          ) : (
            <FlatList
              data={globalResults}
              keyExtractor={(item) => `${item.skrot}-${item.chapter}-${item.verseNumber}`}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={{ color: colors.subtext, padding: 16 }}>
                  Brak wersetów zawierających „{debouncedGlobalQuery}”.
                </Text>
              }
              renderItem={({ item }: { item: GlobalSearchResult }) => {
                const selected = isFragmentSelected(item.bookName, item.chapter, item.verseNumber);
                return (
                  <Pressable
                    style={[
                      styles.verseRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: selected ? colors.primary + '22' : 'transparent',
                      },
                    ]}
                    onPress={() =>
                      toggleFragment(item.bookName, item.chapter, {
                        number: item.verseNumber,
                        text: item.text,
                      })
                    }
                  >
                    <Text style={[styles.verseNumber, { color: colors.primary }]}>
                      {item.bookName} {formatVerseNumber(`${item.chapter},${item.verseNumber}`)}
                    </Text>
                    <Text style={[styles.verseText, { color: colors.text }]}>{item.text}</Text>
                  </Pressable>
                );
              }}
            />
          )}

          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: selectedFragments.length ? 1 : 0.5 },
            ]}
            onPress={goToQueue}
            disabled={selectedFragments.length === 0}
          >
            <Text style={styles.primaryButtonText}>
              Modlitwa ({selectedFragments.length})
            </Text>
          </Pressable>
        </View>
      )}

      {tab === 'browse' && browseMode === 'books' && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <TextInput
              value={bookQuery}
              onChangeText={setBookQuery}
              placeholder="Szukaj księgi po nazwie (np. Rodzaju, Psalmów...)"
              placeholderTextColor={colors.subtext}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.sortRow}>
              <Text style={{ color: colors.subtext, fontSize: 13 }}>Sortuj: </Text>
              <Pressable onPress={() => setBookSort('kanon')} style={styles.sortOption}>
                <Text
                  style={{
                    color: bookSort === 'kanon' ? colors.primary : colors.subtext,
                    fontWeight: bookSort === 'kanon' ? '700' : '400',
                  }}
                >
                  Kolejność biblijna
                </Text>
              </Pressable>
              <Pressable onPress={() => setBookSort('az')} style={styles.sortOption}>
                <Text
                  style={{
                    color: bookSort === 'az' ? colors.primary : colors.subtext,
                    fontWeight: bookSort === 'az' ? '700' : '400',
                  }}
                >
                  A-Z
                </Text>
              </Pressable>
            </View>
          </View>

          <FlatList
            data={visibleBooks}
            keyExtractor={(item) => item.skrot}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={{ color: colors.subtext, padding: 16 }}>
                Nie znaleziono księgi pasującej do „{bookQuery}”.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.bookRow, { borderBottomColor: colors.border }]}
                onPress={() => openBook(item)}
              >
                <Text style={[styles.bookName, { color: colors.text }]}>{item.nazwa}</Text>
                <Text style={{ color: colors.subtext, fontSize: 12 }}>
                  {item.testament === 'ST' ? 'Stary Testament' : 'Nowy Testament'} · {item.skrot}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {tab === 'browse' && browseMode === 'chapters' && selectedBook && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <Pressable onPress={() => setBrowseMode('books')}>
              <Text style={{ color: colors.primary }}>‹ Wróć do ksiąg</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.text, marginTop: 8 }]}>
              {selectedBook.nazwa}
            </Text>
            <Text style={{ color: colors.subtext, marginTop: 4 }}>Wybierz rozdział</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={chapters}
              keyExtractor={(n) => String(n)}
              numColumns={5}
              contentContainerStyle={styles.chapterGrid}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.chapterChip, { borderColor: colors.border }]}
                  onPress={() => openChapter(item)}
                >
                  <Text style={{ color: colors.text }}>{item}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}

      {tab === 'browse' && browseMode === 'verses' && selectedBook && selectedChapter !== null && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <Pressable onPress={() => setBrowseMode('chapters')}>
              <Text style={{ color: colors.primary }}>‹ Wróć do rozdziałów</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.text, marginTop: 8 }]}>
              {selectedBook.nazwa} {selectedChapter}
            </Text>

            <TextInput
              value={verseQuery}
              onChangeText={setVerseQuery}
              placeholder="Szukaj w tym rozdziale lub po numerze wersetu..."
              placeholderTextColor={colors.subtext}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.sortRow}>
              <Text style={{ color: colors.subtext, fontSize: 13 }}>Sortuj: </Text>
              <Pressable onPress={() => setVerseSortDesc(false)} style={styles.sortOption}>
                <Text
                  style={{
                    color: !verseSortDesc ? colors.primary : colors.subtext,
                    fontWeight: !verseSortDesc ? '700' : '400',
                  }}
                >
                  Rosnąco
                </Text>
              </Pressable>
              <Pressable onPress={() => setVerseSortDesc(true)} style={styles.sortOption}>
                <Text
                  style={{
                    color: verseSortDesc ? colors.primary : colors.subtext,
                    fontWeight: verseSortDesc ? '700' : '400',
                  }}
                >
                  Malejąco
                </Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              ref={versesListRef}
              data={visibleVerses}
              keyExtractor={(v) => v.number}
              contentContainerStyle={styles.listContent}
              onScrollToIndexFailed={(info) => {
                // FlatList czasem nie zna jeszcze wysokosci elementow -
                // proste, bezpieczne powtorzenie proby chwile pozniej.
                setTimeout(() => {
                  versesListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.25 });
                }, 200);
              }}
              ListEmptyComponent={
                <Text style={{ color: colors.subtext, padding: 16 }}>
                  Brak wersetów pasujących do wyszukiwania.
                </Text>
              }
              renderItem={({ item }) => {
                const selected = isFragmentSelected(selectedBook.nazwa, selectedChapter, item.number);
                const highlighted = highlightVerseNumber === item.number;
                return (
                  <Pressable
                    style={[
                      styles.verseRow,
                      {
                        borderColor: highlighted ? colors.primary : colors.border,
                        borderWidth: highlighted ? 2 : StyleSheet.hairlineWidth,
                        backgroundColor: highlighted
                          ? colors.primary + '33'
                          : selected
                          ? colors.primary + '22'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setHighlightVerseNumber(null);
                      toggleFragment(selectedBook.nazwa, selectedChapter, item);
                    }}
                  >
                    <Text style={[styles.verseNumber, { color: colors.primary }]}>
                      {formatVerseNumber(`${selectedChapter},${item.number}`)}
                    </Text>
                    <Text style={[styles.verseText, { color: colors.text }]}>{item.text}</Text>
                  </Pressable>
                );
              }}
            />
          )}

          <View style={styles.bottomBar}>
            <Pressable
              style={[
                styles.secondaryButton,
                { borderColor: colors.border, opacity: selectedFragments.length ? 1 : 0.5 },
              ]}
              onPress={goToQueue}
              disabled={selectedFragments.length === 0}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                Modlitwa ({selectedFragments.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, styles.bottomBarPrimary, { backgroundColor: colors.primary }]}
              onPress={() => setBrowseMode('chapters')}
            >
              <Text style={styles.primaryButtonText}>Dodaj i wybierz więcej ›</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  bottomBar: { flexDirection: 'row', gap: 10, margin: 16 },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bottomBarPrimary: { flex: 1, margin: 0 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginTop: 10,
  },
  sortRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
  sortOption: { marginRight: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  bookRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  bookName: { fontSize: 16, fontWeight: '600' },
  chapterGrid: { paddingHorizontal: 12, paddingTop: 8 },
  chapterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 10,
    margin: 4,
    flex: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  verseRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  verseNumber: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  verseText: { fontSize: 14, lineHeight: 20 },
  primaryButton: {
    margin: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
