// src/screens/DivineTitlesScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { useSelection } from '../context/SelectionContext';
import { formatVerseNumber } from '../utils/formatVerse';
import { DIVINE_TITLES, DivineCategory, DivineTitle } from '../data/divineTitles';
import { findVersesForTitle, resultToReference, TitleSearchResult } from '../services/divineTitlesService';

type Props = NativeStackScreenProps<MainStackParamList, 'DivineTitles'>;

type Mode = 'titles' | 'verses';

const CATEGORIES: DivineCategory[] = ['Bóg Ojciec', 'Jezus Chrystus', 'Duch Święty'];

const CATEGORY_COLOR: Record<DivineCategory, string> = {
  'Bóg Ojciec': '#7C5CFF',
  'Jezus Chrystus': '#D08A5B',
  'Duch Święty': '#52D17A',
};

// Ekran "Imiona i tytuły Boga" - wybierz kategorię (Bóg Ojciec / Jezus / Duch
// Święty), wybierz konkretny tytuł, zobacz fragmenty gdzie występuje w
// Biblii, zaznacz te które chcesz i dodaj do kolejki modlitwy (tak samo jak
// w Podręczniku i w przeglądarce Biblii).
export default function DivineTitlesScreen({ navigation }: Props) {
  const { colors } = useAppTheme();

  const [mode, setMode] = useState<Mode>('titles');
  const [activeCategory, setActiveCategory] = useState<DivineCategory>('Bóg Ojciec');
  const [titleQuery, setTitleQuery] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<DivineTitle | null>(null);
  const [verses, setVerses] = useState<TitleSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { fragments, toggleFragment, isSelected: isFragmentSelected, count } = useSelection();

  const visibleTitles = useMemo(() => {
    const inCategory = DIVINE_TITLES.filter((t) => t.category === activeCategory);
    const q = titleQuery.trim().toLowerCase();
    if (!q) return inCategory;
    return inCategory.filter((t) => t.name.toLowerCase().includes(q));
  }, [activeCategory, titleQuery]);

  function openTitle(title: DivineTitle) {
    setSelectedTitle(title);
    setLoading(true);
    setTimeout(() => {
      setVerses(findVersesForTitle(title));
      setLoading(false);
      setMode('verses');
    }, 0);
  }

  function toggleVerse(r: TitleSearchResult) {
    toggleFragment(resultToReference(r));
  }

  function isSelected(r: TitleSearchResult): boolean {
    return isFragmentSelected(resultToReference(r));
  }

  function goToQueue() {
    navigation.navigate('SelectedItems', { selectedItems: fragments });
  }

  const categoryColor = CATEGORY_COLOR[activeCategory as DivineCategory];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      {mode === 'titles' && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <View style={styles.titleHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>Imiona i tytuły Boga</Text>
                <Text style={{ color: colors.subtext, marginTop: 4, fontSize: 13 }}>
                  91 tytułów zweryfikowanych w pełnym tekście Biblii Tysiąclecia
                </Text>
              </View>
              {count > 0 && (
                <Pressable
                  style={[styles.modlitwaChip, { backgroundColor: colors.primary }]}
                  onPress={goToQueue}
                >
                  <Text style={styles.modlitwaChipText}>
                    Modlitwa ({count})
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const active = cat === activeCategory;
                const c = CATEGORY_COLOR[cat];
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[
                      styles.categoryChip,
                      { borderColor: c, backgroundColor: active ? c : 'transparent' },
                    ]}
                  >
                    <Text style={{ color: active ? '#fff' : c, fontWeight: '700', fontSize: 13 }}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={titleQuery}
              onChangeText={setTitleQuery}
              placeholder="Szukaj tytułu..."
              placeholderTextColor={colors.subtext}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <FlatList
            data={visibleTitles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={{ color: colors.subtext, padding: 16 }}>
                Brak tytułów pasujących do „{titleQuery}” w tej kategorii.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.titleRow, { borderBottomColor: colors.border }]}
                onPress={() => openTitle(item)}
              >
                <Text style={[styles.titleName, { color: colors.text }]}>{item.name}</Text>
                <Text style={{ color: categoryColor }}>›</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {mode === 'verses' && selectedTitle && (
        <View style={styles.flex}>
          <View style={styles.header}>
            <Pressable onPress={() => setMode('titles')}>
              <Text style={{ color: colors.primary }}>‹ Wróć do listy tytułów</Text>
            </Pressable>
            <Text style={[styles.title, { color: categoryColor, marginTop: 8 }]}>
              {selectedTitle.name}
            </Text>
            <Text style={{ color: colors.subtext, marginTop: 4, fontSize: 13 }}>
              {selectedTitle.category} · {verses.length}{' '}
              {verses.length === 1 ? 'fragment' : 'fragmentów'}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={verses}
              keyExtractor={(r) => `${r.skrot}-${r.chapter}-${r.verseNumber}`}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={{ color: colors.subtext, padding: 16 }}>
                  Nie znaleziono fragmentów dla tego tytułu.
                </Text>
              }
              renderItem={({ item }) => {
                const ref = resultToReference(item);
                const selected = isSelected(item);
                return (
                  <Pressable
                    style={[
                      styles.verseRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: selected ? categoryColor + '22' : 'transparent',
                      },
                    ]}
                    onPress={() => toggleVerse(item)}
                  >
                    <Text style={[styles.verseSigla, { color: categoryColor }]}>
                      {ref.sigla?.name} {ref.sigla?.number ? formatVerseNumber(ref.sigla.number) : ''}
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
                { borderColor: colors.border, opacity: count ? 1 : 0.5 },
              ]}
              onPress={goToQueue}
              disabled={count === 0}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                Modlitwa ({count})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, styles.bottomBarPrimary, { backgroundColor: colors.primary }]}
              onPress={() => setMode('titles')}
            >
              <Text style={styles.primaryButtonText}>Dodaj i wybierz więcej ›</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  titleHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modlitwaChip: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 },
  modlitwaChipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bottomBar: { flexDirection: 'row', gap: 10, margin: 16 },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bottomBarPrimary: { flex: 1, margin: 0 },
  title: { fontSize: 20, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  categoryChip: { borderWidth: 1.5, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginTop: 12,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  titleRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleName: { fontSize: 16, fontWeight: '600' },
  verseRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  verseSigla: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  verseText: { fontSize: 14, lineHeight: 20 },
  primaryButton: { margin: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
