// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// 3 kafelki, które przełączają treść na tym samym ekranie (Adoracja+
// Proklamacja razem/Biblia/Czytania) - "kind: section". Kafelek "Adoracja"
// łączy dwie dawniej osobne pozycje (Adoracja, Proklamacja) - obie korzystają
// z tego samego mechanizmu (dwa selektory podsekcji + lista fragmentów z
// podrecznik.json), różnił je tylko klucz danych i kolor, więc `sectionKeys`
// wylicza WSZYSTKIE klucze danych, które ten kafelek obejmuje (kafelek jest
// "aktywny", gdy currentSection to którykolwiek z nich) - w środku treści
// jest mały przełącznik między nimi (patrz niżej), żeby nie trzeba było
// wracać do siatki. "Imiona i tytuły Boga" i "Formacja" ("kind: navigate")
// nawigują na inny ekran i nigdy nie mają stanu "aktywny" tutaj. Jedna
// wspólna lista - używana zarówno do dużej siatki (nic jeszcze nie wybrane),
// jak i wąskiego, zwiniętego paska ikon (po wybraniu sekcji).
type TileDef =
  | { key: string; label: string; icon: IconName; kind: 'section'; sectionKeys: string[] }
  | { key: string; label: string; icon: IconName; kind: 'navigate'; route: 'DivineTitles' | 'Formacja' };

// Klucze danych łączone pod jednym kafelkiem "Adoracja".
const ADORACJA_KEY = 'adoracja';
const PROKLAMACJA_KEY = 'Wyznanie i Proklamacja';

// Pierwsze dwa elementy to "hero" kafelki (Formacja, Adoracja) - większe,
// bo to dwie główne czynności w appce. Pozostałe trzy to mniejsze kafelki
// "odsyłacze" (Imiona i tytuły Boga, Biblia Tysiąclecia, Czytania dnia) -
// patrz HERO_TILES/SMALL_TILES niżej, które dzielą tę listę do renderowania
// dwóch osobnych rzędów w dużej siatce. Zwinięty pasek ikon (po wybraniu
// sekcji) nadal pokazuje wszystkie 5 w tej samej, jednej kolejności.
const ALL_TILES: TileDef[] = [
  { key: 'formacja', label: 'Formacja', icon: 'school-outline', kind: 'navigate', route: 'Formacja' },
  {
    key: 'adoracja',
    label: 'Adoracja',
    icon: 'flame-outline',
    kind: 'section',
    sectionKeys: [ADORACJA_KEY, PROKLAMACJA_KEY],
  },
  {
    key: 'divineTitles',
    label: 'Imiona i tytuły Boga',
    icon: 'sparkles-outline',
    kind: 'navigate',
    route: 'DivineTitles',
  },
  { key: 'biblia', label: 'Biblia Tysiąclecia', icon: 'library-outline', kind: 'section', sectionKeys: ['biblia'] },
  { key: 'czytania', label: 'Czytania dnia', icon: 'calendar-outline', kind: 'section', sectionKeys: ['czytania'] },
];

const HERO_TILES = ALL_TILES.slice(0, 2);
const SMALL_TILES = ALL_TILES.slice(2);

// Sekcje "biblia" i "czytania" nie są kluczami w danych podrecznik.json (to
// osadzone przeglądarki, nie zestawy gotowych fragmentów), więc traktujemy
// je specjalnie przy renderowaniu.
const BIBLIA_SECTION_KEY = 'biblia';
const CZYTANIA_SECTION_KEY = 'czytania';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Ekran główny - 5 równych kafelków (Adoracja [z Proklamacją w środku],
// Czytania dnia, Biblia Tysiąclecia, Imiona i tytuły Boga, Formacja). Dopóki
// nic nie jest wybrane, nic się nie ładuje pod spodem - appka nie zakłada
// domyślnie żadnej sekcji. Po wybraniu jednej z 3 sekcji "inline" duża
// siatka zwija się w wąski pasek małych ikon, żeby treść (lista fragmentów
// albo przeglądarka Biblii/Czytań) dostała ~3/4 ekranu zamiast kawałka pod
// rozbudowanym wyborem. Kliknięcie aktywnej ikony jeszcze raz odznacza
// sekcję i rozwija siatkę z powrotem. "Wstęp" i przełącznik trybu ciemnego
// są w headerze (patrz App.tsx).
export default function HomeScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();

  const [currentSection, setCurrentSection] = useState('');
  const [currentSubSection, setCurrentSubSection] = useState('');
  const [currentSubSubSection, setCurrentSubSubSection] = useState('');
  const { fragments, toggleFragment, isSelected: isFragmentSelected, count } = useSelection();

  // Za każdym powrotem na Główną Z INNEGO EKRANU (np. z Imion i tytułów
  // Boga albo z Formacji) wracamy do samej siatki kafelków - React
  // Navigation nie odmontowuje tego ekranu przy nawigacji, więc bez tego
  // stan wyboru zostałby zapamiętany.
  useFocusEffect(
    useCallback(() => {
      setCurrentSection('');
      setCurrentSubSection('');
      setCurrentSubSubSection('');
    }, [])
  );

  // Adoracja/Proklamacja/Biblia/Czytania NIE są osobnymi ekranami - to stan
  // wewnątrz tego samego ekranu Home. Kliknięcie zakładki "Główna", gdy
  // jesteś już na tym ekranie (tylko z inną sekcją rozwiniętą), nie zmienia
  // focusu i nie odpala powyższego efektu - stąd osobny reset na zmianę
  // route.params.resetAt, który zakładka "Główna" ustawia przy KAŻDYM
  // kliknięciu (patrz App.tsx), niezależnie od tego, czy ekran się realnie
  // przełącza.
  useEffect(() => {
    if (route.params?.resetAt === undefined) return;
    setCurrentSection('');
    setCurrentSubSection('');
    setCurrentSubSubSection('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.resetAt]);

  const selectedData = currentSection ? guidanceData[currentSection] ?? null : null;

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

  function animateLayout() {
    // Płynne zwinięcie/rozwinięcie siatki kafelków. Na webie (podgląd w
    // przeglądarce) LayoutAnimation nie robi nic - układ po prostu zmienia
    // się od razu, bez animacji; na telefonie (iOS/Android) animuje.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }

  function changeSection(section: string) {
    animateLayout();
    setCurrentSection(section);
    setCurrentSubSection('');
    setCurrentSubSubSection('');
  }

  function collapseToGrid() {
    animateLayout();
    setCurrentSection('');
    setCurrentSubSection('');
    setCurrentSubSubSection('');
  }

  function handleTilePress(tile: TileDef) {
    if (tile.kind === 'navigate') {
      if (tile.route === 'DivineTitles') navigation.navigate('DivineTitles');
      else navigation.navigate('Formacja');
      return;
    }
    if (tile.sectionKeys.includes(currentSection)) {
      collapseToGrid();
    } else {
      // Domyślny (pierwszy) klucz sekcji tego kafelka - dla "Adoracja" to
      // zawsze sama Adoracja, Proklamację wybiera się już w środku.
      changeSection(tile.sectionKeys[0]);
    }
  }

  function tileColorFor(tile: TileDef): string {
    if (tile.kind === 'navigate') {
      if (tile.key === 'formacja') return colors.formacja;
      if (tile.key === 'divineTitles') return colors.dziekczynienie;
      return colors.primary;
    }
    if (tile.key === BIBLIA_SECTION_KEY) return colors.primary;
    if (tile.key === CZYTANIA_SECTION_KEY) return colors.prosby;
    return colorForSection(tile.sectionKeys[0], colors);
  }

  function renderTile(tile: TileDef, size: 'hero' | 'large' | 'small') {
    const active = tile.kind === 'section' && tile.sectionKeys.includes(currentSection);
    const tileColor = tileColorFor(tile);
    const tileStyle =
      size === 'hero' ? styles.tileHero : size === 'large' ? styles.tile : styles.tileCompact;
    return (
      <Pressable
        key={tile.key}
        onPress={() => handleTilePress(tile)}
        accessibilityLabel={tile.label}
        style={[
          tileStyle,
          { borderColor: tileColor, backgroundColor: active ? tileColor : colors.card },
        ]}
      >
        <Ionicons
          name={tile.icon}
          size={size === 'hero' ? 28 : size === 'large' ? 26 : 20}
          color={active ? '#fff' : tileColor}
        />
        {size !== 'small' && (
          <Text
            style={[
              size === 'hero' ? styles.tileLabelHero : styles.tileLabel,
              { color: active ? '#fff' : tileColor },
            ]}
            numberOfLines={2}
          >
            {tile.label}
          </Text>
        )}
      </Pressable>
    );
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

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      {!currentSection ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.introCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.introText, { color: colors.text }]}>
              Wybierz, czym chcesz się teraz zająć.
            </Text>
            <View style={styles.heroRow}>{HERO_TILES.map((tile) => renderTile(tile, 'hero'))}</View>
            <View style={styles.tileGrid}>{SMALL_TILES.map((tile) => renderTile(tile, 'large'))}</View>
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={[styles.compactRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            {ALL_TILES.map((tile) => renderTile(tile, 'small'))}
          </View>

          {isBiblia ? (
            // BibliaBrowser i CzytaniaBrowser korzystają wewnętrznie z list
            // rozciągniętych na pełną wysokość - renderujemy je poza
            // ScrollView (zagnieżdżanie przewijalnych list w ScrollView nie
            // działa poprawnie w RN).
            <BibliaBrowser goToQueue={displaySelectedItems} />
          ) : isCzytania ? (
            <CzytaniaBrowser goToQueue={displaySelectedItems} />
          ) : (
            <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
              {(currentSection === ADORACJA_KEY || currentSection === PROKLAMACJA_KEY) && (
                <View style={styles.modeSwitchRow}>
                  {[
                    { key: ADORACJA_KEY, label: 'Adoracja' },
                    { key: PROKLAMACJA_KEY, label: 'Proklamacja' },
                  ].map((mode) => {
                    const modeActive = currentSection === mode.key;
                    const modeColor = colorForSection(mode.key, colors);
                    return (
                      <Pressable
                        key={mode.key}
                        onPress={() => changeSection(mode.key)}
                        style={[
                          styles.modePill,
                          {
                            borderColor: modeColor,
                            backgroundColor: modeActive ? modeColor : 'transparent',
                          },
                        ]}
                      >
                        <Text style={{ color: modeActive ? '#fff' : modeColor, fontWeight: '700' }}>
                          {mode.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

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
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  introCard: { borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 16 },
  introText: { fontSize: 14, lineHeight: 20 },
  // Dwa duże kafelki (Formacja, Adoracja) - główne czynności, jeden rząd.
  heroRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tileHero: {
    flex: 1,
    aspectRatio: 1.7,
    borderWidth: 1.5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
  },
  tileLabelHero: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  // Trzy mniejsze kafelki-odsyłacze (Imiona, Biblia, Czytania) - drugi rząd,
  // dokładnie 3 na 30% szerokości wypełniają cały rząd (bez dziury po
  // prawej, jak wcześniej przy 5 kafelkach w siatce 3 na rząd).
  tileGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
  },
  tileLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  // Zwinięty pasek - te same 6 kafelków, tylko małe i bez podpisów (sama
  // ikona + kolor), żeby zająć jak najmniej wysokości. Pełna nazwa sekcji
  // i tak pojawia się jako nagłówek nad treścią pod spodem.
  compactRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tileCompact: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modePill: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
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
