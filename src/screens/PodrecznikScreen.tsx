// src/screens/PodrecznikScreen.tsx
import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GuidanceData, Reference, MainStackParamList } from '../types';
import { useAppTheme, colorForSection } from '../context/ThemeContext';
import { useSelection } from '../context/SelectionContext';
import { formatVerseNumber } from '../utils/formatVerse';
import BibliaBrowser from '../components/BibliaBrowser';
import CzytaniaBrowser from '../components/CzytaniaBrowser';

// Dane modlitewne dołączone lokalnie do aplikacji (zamiast fetch z jsonblob.com) -
// appka działa offline i nie zależy od zewnętrznego, tymczasowego serwisu.
import rawGuidanceData from '../data/podrecznik.json';

const guidanceData = rawGuidanceData as unknown as GuidanceData;

type Props = NativeStackScreenProps<MainStackParamList, 'Podrecznik'>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SECTION_TILES: { key: string; label: string; icon: IconName }[] = [
  { key: 'adoracja', label: 'Adoracja', icon: 'flame-outline' },
  { key: 'Wyznanie i Proklamacja', label: 'Proklamacja', icon: 'megaphone-outline' },
  { key: 'biblia', label: 'Biblia Tysiąclecia', icon: 'library-outline' },
  { key: 'czytania', label: 'Czytania dnia', icon: 'calendar-outline' },
];

// Sekcje "biblia" i "czytania" nie są kluczami w danych podrecznik.json (to
// osadzone przeglądarki, nie zestawy gotowych fragmentów), więc traktujemy
// je specjalnie przy renderowaniu.
const BIBLIA_SECTION_KEY = 'biblia';
const CZYTANIA_SECTION_KEY = 'czytania';

// Odpowiednik podrecznik.page.ts
export default function PodrecznikScreen({ navigation }: Props) {
  const { colors } = useAppTheme();

  const [currentSection, setCurrentSection] = useState('adoracja');
  const [currentSubSection, setCurrentSubSection] = useState('');
  const [currentSubSubSection, setCurrentSubSubSection] = useState('');
  const { fragments, toggleFragment, isSelected: isFragmentSelected, count } = useSelection();

  const selectedData = guidanceData[currentSection] ?? null;

  const subSectionOptions = useMemo(
    () => (selectedData ? Object.keys(selectedData) : []),
    [selectedData]
  );

  // Gdy zmienia się sekcja główna, wybierz pierwszą dostępną podsekcję
  const activeSubSection =
    currentSubSection && subSectionOptions.includes(currentSubSection)
      ? currentSubSection
      : subSectionOptions[0] ?? '';

  const subSubSectionOptions = useMemo(() => {
    if (!selectedData || !activeSubSection) return [];
    return Object.keys(selectedData[activeSubSection] ?? {});
  }, [selectedData, activeSubSection]);

  const activeSubSubSection =
    currentSubSubSection && subSubSectionOptions.includes(currentSubSubSection)
      ? currentSubSubSection
      : subSubSectionOptions[0] ?? '';

  const filteredData: Reference[] = useMemo(() => {
    if (!selectedData || !activeSubSection || !activeSubSubSection) return [];
    return selectedData[activeSubSection]?.[activeSubSubSection]?.references ?? [];
  }, [selectedData, activeSubSection, activeSubSubSection]);

  function changeSection(section: string) {
    setCurrentSection(section);
    setCurrentSubSection('');
    setCurrentSubSubSection('');
  }

  function toggleSelection(item: Reference) {
    toggleFragment(item);
  }

  function isSelected(item: Reference) {
    return isFragmentSelected(item);
  }

  function displaySelectedItems() {
    navigation.navigate('SelectedItems', { selectedItems: fragments });
  }

  const sectionColor = colorForSection(currentSection, colors);
  const scrollRef = useRef<ScrollView>(null);

  const isBiblia = currentSection === BIBLIA_SECTION_KEY;
  const isCzytania = currentSection === CZYTANIA_SECTION_KEY;
  const isEmbeddedBrowser = isBiblia || isCzytania;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.introCard, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 16 }]}>
        <Text style={[styles.introText, { color: colors.text }]}>
          {isBiblia
            ? 'Przeglądaj lub przeszukaj Biblię Tysiąclecia. Zaznaczone wersety trafiają do tej samej kolejki modlitewnej.'
            : isCzytania
            ? 'Dzisiejsze czytania mszalne (pobierane na żywo z internetu). Zaznaczone czytania trafiają do tej samej kolejki modlitewnej.'
            : 'Wybierz sekcję: Adorację (kim jest Bóg), Wyznanie i Proklamację, albo przejdź do Biblii, Czytań dnia lub Imion i tytułów Boga.'}
        </Text>
        {!isEmbeddedBrowser && (
          <Text style={[styles.introText, { color: colors.subtext, marginTop: 8 }]}>
            Kliknij w kafelek poniżej, by zobaczyć opcje do wyboru. Wybierz te, które w tym
            momencie cię dotyczą, poruszają, lub które chciałbyś zaaplikować do swojego życia.
          </Text>
        )}

        <View style={styles.tileGrid}>
          {SECTION_TILES.map((tile) => {
            const active = tile.key === currentSection;
            const tileColor =
              tile.key === BIBLIA_SECTION_KEY || tile.key === CZYTANIA_SECTION_KEY
                ? colors.primary
                : colorForSection(tile.key, colors);
            return (
              <Pressable
                key={tile.key}
                onPress={() => changeSection(tile.key)}
                style={[
                  styles.tile,
                  {
                    borderColor: tileColor,
                    backgroundColor: active ? tileColor : colors.card,
                  },
                ]}
              >
                <Ionicons name={tile.icon} size={26} color={active ? '#fff' : tileColor} />
                <Text
                  style={[styles.tileLabel, { color: active ? '#fff' : tileColor }]}
                  numberOfLines={2}
                >
                  {tile.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => navigation.navigate('DivineTitles')}
            style={[styles.tile, { borderColor: colors.primary, backgroundColor: colors.card }]}
          >
            <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
            <Text style={[styles.tileLabel, { color: colors.primary }]} numberOfLines={2}>
              Imiona i tytuły Boga
            </Text>
          </Pressable>
        </View>
      </View>

      {isBiblia ? (
        // BibliaBrowser i CzytaniaBrowser korzystają wewnętrznie z list
        // rozciągniętych na pełną wysokość - renderujemy je poza ScrollView
        // (zagnieżdżanie przewijalnych list w ScrollView nie działa
        // poprawnie w RN).
        <BibliaBrowser goToQueue={displaySelectedItems} />
      ) : isCzytania ? (
        <CzytaniaBrowser goToQueue={displaySelectedItems} />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
          {subSectionOptions.length > 0 && (
          <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
            <Picker
              selectedValue={activeSubSection}
              onValueChange={(value) => {
                setCurrentSubSection(value);
                setCurrentSubSubSection('');
              }}
              dropdownIconColor={colors.text}
              style={{ color: colors.text }}
            >
              {subSectionOptions.map((opt) => (
                <Picker.Item key={opt} label={opt} value={opt} />
              ))}
            </Picker>
          </View>
        )}

        {subSubSectionOptions.length > 0 && (
          <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
            <Picker
              selectedValue={activeSubSubSection}
              onValueChange={(value) => setCurrentSubSubSection(value)}
              dropdownIconColor={colors.text}
              style={{ color: colors.text }}
            >
              {subSubSectionOptions.map((opt) => (
                <Picker.Item key={opt} label={opt} value={opt} />
              ))}
            </Picker>
          </View>
        )}

        {filteredData.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: sectionColor }]}>{currentSection}</Text>
            {filteredData.map((item, index) => (
              <Pressable
                key={`${item.sigla?.name ?? ''}-${index}`}
                onPress={() => toggleSelection(item)}
                style={[
                  styles.referenceRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: isSelected(item) ? sectionColor + '22' : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.referenceLabel, { color: colors.subtext }]}>
                  Fragment {index + 1}
                </Text>
                <Text style={[styles.referenceSigla, { color: sectionColor }]}>
                  {item.sigla?.name}{' '}
                  {item.sigla?.number ? formatVerseNumber(item.sigla.number) : item.sigla?.ratio}
                </Text>
                <Text style={[styles.referenceQuote, { color: colors.text }]}>{item.quote}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.bottomBar}>
          <Pressable
            style={[
              styles.secondaryButton,
              { borderColor: colors.border, opacity: count ? 1 : 0.5 },
            ]}
            onPress={displaySelectedItems}
            disabled={count === 0}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>Modlitwa ({count})</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, styles.bottomBarPrimary, { backgroundColor: colors.primary }]}
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          >
            <Text style={styles.primaryButtonText}>Dodaj i wybierz więcej ›</Text>
          </Pressable>
        </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  introCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  introText: { fontSize: 14, lineHeight: 20 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  tile: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
  },
  tileLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  pickerWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, marginBottom: 12 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  referenceRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 10 },
  referenceLabel: { fontSize: 12, marginBottom: 2 },
  referenceSigla: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  referenceQuote: { fontSize: 14, lineHeight: 20 },
  bottomBar: { flexDirection: 'row', gap: 10 },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bottomBarPrimary: { flex: 1, marginBottom: 0 },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
