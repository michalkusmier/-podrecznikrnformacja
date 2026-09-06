// src/screens/FormHistoryScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, BackHandler, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { TabParamList, SavedFormEntry } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { getFormDataList, deleteFormDataEntry } from '../services/formDataService';
import { formatVerseNumber } from '../utils/formatVerse';
import { shareJournalEntry } from '../utils/shareEntry';
import { toRoman } from '../data/formacja';

type Props = BottomTabScreenProps<TabParamList, 'DziennikTab'>;

// Historia dziennika modlitwy - własna zakładka na dolnym pasku, dostępna z
// każdego miejsca w appce. Data, notatki, światła zewnętrzne/wewnętrzne,
// odnośniki użyte tego dnia (klikalne - otwierają dokładnie ten werset w
// Bibli, w innej zakładce). Najnowsze wpisy na górze. Każdy wpis można
// edytować albo usunąć, a przyciskiem "+" w nagłówku dodać nowy wpis
// bezpośrednio tutaj, bez przechodzenia przez modlitwę.
export default function FormHistoryScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const [list, setList] = useState<SavedFormEntry[]>([]);

  const load = useCallback(() => {
    getFormDataList().then((entries) => setList([...entries].reverse()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function goHome() {
    // Przechodzimy do zakładki "Główna" i resetujemy jej stos do ekranu
    // startowego - niezależnie z jakiego miejsca appki wcześniej wszedłeś
    // do Dziennika.
    navigation.navigate('GlownaTab', { screen: 'Home' });
  }

  function addEntry() {
    navigation.navigate('GlownaTab', { screen: 'JournalEntry', params: {} });
  }

  function editEntry(id: string) {
    navigation.navigate('GlownaTab', { screen: 'JournalEntry', params: { entryId: id } });
  }

  function confirmDelete(id: string) {
    Alert.alert('Usunąć wpis?', 'Tej operacji nie można cofnąć.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          await deleteFormDataEntry(id);
          load();
        },
      },
    ]);
  }

  // Fizyczny/gestowy przycisk "Wstecz" na Androidzie ma robić dokładnie to
  // samo, co przycisk w nagłówku - wracać na ekran startowy.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function openFormacjaDay(source: NonNullable<SavedFormEntry['formacjaSource']>) {
    navigation.navigate('GlownaTab', {
      screen: 'FormacjaDay',
      params: { weekId: source.weekId, dayId: source.dayId },
    });
  }

  function openReference(ref: { name: string; number: string }) {
    // "103,8-17" -> rozdział 103, pierwszy werset zakresu "8" (nie
    // podświetlamy calego zakresu, tylko punkt startowy). Pojedynczy
    // werset (np. "59,06") otwiera się i podświetla dokładnie w tym
    // miejscu, appka przewija do niego automatycznie.
    const [chapterPart, versePart] = ref.number.split(',');
    const chapter = parseInt(chapterPart, 10);
    const firstVerse = (versePart ?? '').split('-')[0];

    navigation.navigate('GlownaTab', {
      screen: 'Biblia',
      params: {
        openBook: ref.name,
        openChapter: isNaN(chapter) ? undefined : chapter,
        openVerseNumber: firstVerse || undefined,
      },
    });
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Historia Dziennika</Text>
        <View style={styles.headerButtons}>
          <Pressable onPress={addEntry} hitSlop={8} accessibilityLabel="Dodaj wpis">
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </Pressable>
          <Pressable onPress={goHome}>
            <Text style={{ color: colors.primary }}>‹ Ekran startowy</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item, i) => item.id ?? String(i)}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <Text style={{ color: colors.subtext, padding: 16 }}>
            Brak zapisanych wpisów. Pierwszy wpis pojawi się tu po zapisaniu formularza po modlitwie,
            albo dodaj go ręcznie przyciskiem "+" powyżej.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.date, { color: colors.primary }]}>{item.date}</Text>

            {item.formacjaSource && (
              <Pressable
                style={[styles.formacjaTag, { borderColor: colors.formacja }]}
                onPress={() => openFormacjaDay(item.formacjaSource!)}
              >
                <Text style={{ color: colors.formacja, fontSize: 12, fontWeight: '700' }}>
                  Formacja · Tydzień {item.formacjaSource.weekNumber} · Dzień{' '}
                  {toRoman(item.formacjaSource.dayNumber)} ›
                </Text>
              </Pressable>
            )}

            {!!item.notes && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.subtext }]}>Notatki</Text>
                <Text style={{ color: colors.text, lineHeight: 20 }}>{item.notes}</Text>
              </View>
            )}

            {!!item.externalLight && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
                  Światła zewnętrzne
                </Text>
                <Text style={{ color: colors.text, lineHeight: 20 }}>{item.externalLight}</Text>
              </View>
            )}

            {!!item.internalLight && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
                  Światła wewnętrzne
                </Text>
                <Text style={{ color: colors.text, lineHeight: 20 }}>{item.internalLight}</Text>
              </View>
            )}

            {(item.references ?? []).length > 0 && (
              <View style={styles.chipRow}>
                {item.references.map((ref, i) => (
                  <Pressable
                    key={i}
                    style={[styles.chip, { borderColor: colors.primary }]}
                    onPress={() => openReference(ref)}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                      {ref.name} {formatVerseNumber(ref.number)} ›
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.cardActions}>
              <Pressable onPress={() => shareJournalEntry(item)} hitSlop={6}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Udostępnij</Text>
              </Pressable>
              <Pressable onPress={() => editEntry(item.id)} hitSlop={6}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Edytuj</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item.id)} hitSlop={6}>
                <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '600' }}>Usuń</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerButtons: { flexDirection: 'row', gap: 16 },
  content: { padding: 16 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10 },
  date: { fontWeight: '700', fontSize: 15 },
  formacjaTag: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  section: { marginTop: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
});
