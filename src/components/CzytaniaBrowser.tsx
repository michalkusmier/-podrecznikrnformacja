// src/components/CzytaniaBrowser.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useSelection } from '../context/SelectionContext';
import type { Reference } from '../types';
import { fetchTodaysReadings, CzytaniaDnia, CzytanieItem } from '../services/czytaniaService';
import { resolveCitationVerses, ResolvedVerse } from '../services/bibliaService';
import { formatVerseNumber } from '../utils/formatVerse';

interface Props {
  goToQueue: () => void;
}

// Codzienne czytania mszalne - jedyna sekcja appki, która wymaga internetu
// (dane pobierane na żywo z paulus.org.pl przy każdym wejściu w tę
// zakładkę, bo czytania zmieniają się codziennie wg ruchomego kalendarza
// liturgicznego - nie da się ich wbudować na stałe tak jak Biblii).
//
// Dla każdego czytania próbujemy rozpoznać jego odnośnik (np. "Mt 24,
// 42-51") i rozbić je na POJEDYNCZE WERSETY z lokalnych danych Biblii
// Tysiąclecia (dokładniejsze niż dzielenie zeskrobanego tekstu strony, w
// którym nie ma widocznych numerów wersetów). Jeśli rozpoznanie się nie
// powiedzie (rzadkie, nietypowe odnośniki, np. czytania Męki Pańskiej),
// pokazujemy całe czytanie jako jeden zaznaczalny blok - appka nigdy nie
// "gubi" czytania tylko dlatego, że nie potrafi go rozbić na wersety.
//
// Zaznaczone wersety/bloki trafiają do tej samej wspólnej kolejki modlitwy
// co Biblia i Podręcznik - a jeśli werset da się rozbić, używa dokładnie
// takiej samej "tożsamości" fragmentu jak w zakładce Biblia (nazwa księgi +
// rozdział,werset), więc zaznaczenie tego samego wersetu w obu miejscach
// liczy się jako jedno i to samo zaznaczenie.
export default function CzytaniaBrowser({ goToQueue }: Props) {
  const { colors } = useAppTheme();
  const { toggleFragment, isSelected, count } = useSelection();

  const [data, setData] = useState<CzytaniaDnia | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchTodaysReadings()
      .then((result) => {
        setData(result);
        if (result.items.length === 0) {
          setError(
            'Nie udało się rozpoznać czytań na stronie źródłowej (mogła zmienić układ). Spróbuj ponownie za chwilę.'
          );
        }
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error && e.message
            ? e.message
            : 'Nie udało się pobrać czytań. Sprawdź połączenie z internetem.'
        );
      })
      .finally(() => setLoading(false));
  }

  // Pobieramy dopiero po wejściu w tę zakładkę (komponent montuje się tylko
  // wtedy, gdy użytkownik ją wybierze) - nie pobieramy niczego "z góry".
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleVerse(bookName: string, rv: ResolvedVerse) {
    toggleFragment({
      sigla: { name: bookName, number: `${rv.chapter},${rv.entry.number}` },
      quote: rv.entry.text,
    });
  }

  function isVerseSelected(bookName: string, rv: ResolvedVerse): boolean {
    return isSelected({
      sigla: { name: bookName, number: `${rv.chapter},${rv.entry.number}` },
      quote: '',
    });
  }

  function toggleWholeBlock(item: CzytanieItem) {
    const ref: Reference = { sigla: { name: item.label, ratio: item.reference }, quote: item.text };
    toggleFragment(ref);
  }

  function isWholeBlockSelected(item: CzytanieItem): boolean {
    return isSelected({ sigla: { name: item.label, ratio: item.reference }, quote: '' });
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Czytania na dziś</Text>
        {data && <Text style={[styles.dateLabel, { color: colors.subtext }]}>{data.dateLabel}</Text>}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.subtext, marginTop: 8 }}>Wczytywanie czytań...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBox}>
            <Text style={{ color: colors.subtext }}>{error}</Text>
            <Pressable onPress={load} style={[styles.retryButton, { borderColor: colors.primary }]}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Spróbuj ponownie</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && data && (
          <View style={{ marginTop: 8 }}>
            {data.items.map((item) => {
              const resolved = resolveCitationVerses(item.reference);

              return (
                <View key={item.key} style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.primary }]}>
                    {item.label} {item.reference}
                  </Text>

                  {resolved ? (
                    resolved.verses.map((rv) => {
                      const selected = isVerseSelected(resolved.bookName, rv);
                      return (
                        <Pressable
                          key={`${rv.chapter}-${rv.entry.number}`}
                          onPress={() => toggleVerse(resolved.bookName, rv)}
                          style={[
                            styles.verseRow,
                            {
                              borderColor: colors.border,
                              backgroundColor: selected ? colors.primary + '22' : colors.card,
                            },
                          ]}
                        >
                          <Text style={[styles.verseNumber, { color: colors.primary }]}>
                            {formatVerseNumber(`${rv.chapter},${rv.entry.number}`)}
                          </Text>
                          <Text style={[styles.verseText, { color: colors.text }]}>{rv.entry.text}</Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    // Fallback: nie udało się rozbić na wersety (np. bardzo
                    // nietypowy odnośnik) - całe czytanie jako jeden blok.
                    <Pressable
                      onPress={() => toggleWholeBlock(item)}
                      style={[
                        styles.verseRow,
                        {
                          borderColor: colors.border,
                          backgroundColor: isWholeBlockSelected(item) ? colors.primary + '22' : colors.card,
                        },
                      ]}
                    >
                      <Text style={[styles.verseText, { color: colors.text }]}>{item.text}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            <Text style={[styles.sourceLabel, { color: colors.subtext }]}>Źródło: paulus.org.pl</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border, opacity: count ? 1 : 0.5 }]}
          onPress={goToQueue}
          disabled={count === 0}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Modlitwa ({count})</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  dateLabel: { marginTop: 2, textTransform: 'capitalize' },
  loadingBox: { marginTop: 24, alignItems: 'center' },
  errorBox: { marginTop: 24 },
  section: { marginBottom: 20 },
  sectionLabel: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  verseRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 8 },
  verseNumber: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  verseText: { fontSize: 14, lineHeight: 20 },
  sourceLabel: { fontSize: 12, marginTop: 8 },
  retryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  bottomBar: { padding: 16, paddingTop: 8 },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
