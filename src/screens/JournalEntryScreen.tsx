// src/screens/JournalEntryScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList, SavedReference, FormacjaJournalSource } from '../types';
import { toRoman } from '../data/formacja';
import { useAppTheme } from '../context/ThemeContext';
import { getDraft, setDraft, clearDraft, type JournalDraft } from '../services/draftService';
import {
  addFormDataEntry,
  deleteFormDataEntry,
  getFormDataEntry,
  updateFormDataEntry,
} from '../services/formDataService';
import { formatVerseNumber } from '../utils/formatVerse';
import { shareJournalEntry } from '../utils/shareEntry';

type Props = NativeStackScreenProps<MainStackParamList, 'JournalEntry'>;

const MONTHS_PL = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

function formatDatePL(d: Date): string {
  return `${d.getDate()} ${MONTHS_PL[d.getMonth()]} ${d.getFullYear()}`;
}

// Wspólny ekran do dodawania NOWEGO wpisu w Historii Dziennika bez
// przechodzenia przez modlitwę (route.params.entryId brak) oraz do EDYCJI
// istniejącego wpisu (route.params.entryId ustawiony - wtedy wczytujemy go
// z AsyncStorage i wypełniamy pola). Ręcznie dodawane wpisy nie mają
// fragmentów biblijnych (to zadanie ekranu "Mój Formularz" po modlitwie) -
// tutaj można jedynie USUNĄĆ odnośniki z już istniejącego wpisu, nie dodać
// nowych (dodawanie fragmentów zawsze przechodzi przez wybór w Bibli/
// Podręczniku i wspólny koszyk).
export default function JournalEntryScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const entryId = route.params?.entryId;
  const isEditing = !!entryId;

  // Klucz szkicu: dla edycji istniejącego wpisu to jego id; dla nowego wpisu
  // powiązanego z dniem Formacji - id tego dnia (żeby "Zapisz przemyślenie"
  // z różnych dni nie nadpisywały sobie nawzajem szkiców); w pozostałych
  // przypadkach - stały klucz "new".
  const draftKey = useMemo(
    () =>
      entryId ??
      (route.params?.formacjaSource ? `new-formacja-${route.params.formacjaSource.dayId}` : 'new'),
    [entryId, route.params?.formacjaSource]
  );

  const todayLabel = useMemo(() => formatDatePL(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [externalLight, setExternalLight] = useState('');
  const [internalLight, setInternalLight] = useState('');
  const [references, setReferences] = useState<SavedReference[]>([]);
  // Przy nowym wpisie bierzemy powiązanie z parametrów nawigacji (ekran dnia
  // Formacji, przycisk "Zapisz przemyślenie"); przy edycji - z wczytanego
  // wpisu (albo szkicu, jeśli już istniał). W obu przypadkach tylko do
  // odczytu - nie da się go tu zmienić.
  const [formacjaSource, setFormacjaSource] = useState<FormacjaJournalSource | undefined>(
    route.params?.formacjaSource
  );

  // Dopóki to false, zmiany pól NIE są zapisywane do szkicu - inaczej
  // pierwszy render (zanim skończymy wczytywać szkic/wpis z AsyncStorage)
  // mógłby nadpisać już istniejący szkic pustymi, domyślnymi wartościami.
  const initializedRef = useRef(false);

  // Wczytanie danych ekranu to ZAWSZE, w tej kolejności: 1) szkic (ktoś mógł
  // zacząć pisać i wyjść bez zapisywania), 2) jeśli szkicu nie ma, a to
  // edycja - zapisany wpis z AsyncStorage, 3) w pozostałym przypadku (nowy
  // wpis, brak szkicu) - puste pola z dzisiejszą datą. Szkic trzymany jest w
  // AsyncStorage (nie w pamięci komponentu/kontekstu), więc przetrwa
  // odmontowanie tego ekranu przez DOWOLNĄ ścieżkę nawigacji.
  useEffect(() => {
    let cancelled = false;
    initializedRef.current = false;
    setLoading(true);
    (async () => {
      const draft = await getDraft<JournalDraft>(draftKey);
      if (cancelled) return;
      if (draft) {
        setDate(draft.date);
        setNotes(draft.notes);
        setExternalLight(draft.externalLight);
        setInternalLight(draft.internalLight);
        setReferences(draft.references);
        setFormacjaSource(draft.formacjaSource ?? route.params?.formacjaSource);
      } else if (entryId) {
        const entry = await getFormDataEntry(entryId);
        if (cancelled) return;
        if (entry) {
          setDate(entry.date);
          setNotes(entry.notes);
          setExternalLight(entry.externalLight);
          setInternalLight(entry.internalLight);
          setReferences(entry.references ?? []);
          setFormacjaSource(entry.formacjaSource);
        }
      } else {
        setDate(todayLabel);
      }
      if (cancelled) return;
      setLoading(false);
      initializedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, draftKey]);

  // Zapamiętuje bieżący stan formularza jako szkic przy KAŻDEJ zmianie -
  // dzięki temu "Anuluj"/"Wstecz" (patrz goBack niżej) nie tracą wpisanych
  // danych, tylko chowają je do czasu ponownego otwarcia tego samego wpisu.
  useEffect(() => {
    if (!initializedRef.current) return;
    setDraft<JournalDraft>(draftKey, { date, notes, externalLight, internalLight, references, formacjaSource });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, notes, externalLight, internalLight, references, formacjaSource]);

  function removeReference(index: number) {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  }

  const canSave =
    date.trim().length > 0 &&
    (notes.trim().length > 0 ||
      externalLight.trim().length > 0 ||
      internalLight.trim().length > 0 ||
      references.length > 0);

  // Jeśli wpis jest powiązany z dniem Formacji, wracamy do tego dnia (tam,
  // skąd zwykle się tu trafia) - w przeciwnym razie do ogólnej Historii
  // Dziennika, tak jak dotychczas.
  function goBack() {
    if (formacjaSource) {
      navigation.navigate('FormacjaDay', {
        weekId: formacjaSource.weekId,
        dayId: formacjaSource.dayId,
      });
    } else {
      navigation.getParent()?.navigate('DziennikTab' as never);
    }
  }

  // Fizyczny/gestowy przycisk "Wstecz" na Androidzie ma robić dokładnie to
  // samo co "Anuluj" (patrz goBack powyżej), zamiast domyślnego zachowania
  // stosu nawigacji GlownaTab, na którym ten ekran jest technicznie osadzony.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formacjaSource])
  );

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const payload = {
        date: date.trim(),
        notes: notes.trim(),
        externalLight: externalLight.trim(),
        internalLight: internalLight.trim(),
        references,
        formacjaSource,
      };
      if (isEditing && entryId) {
        await updateFormDataEntry(entryId, payload);
      } else {
        await addFormDataEntry(payload);
      }
      // Wpis realnie zapisany - szkic nie jest już potrzebny.
      await clearDraft(draftKey);
      goBack();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!entryId) return;
    Alert.alert('Usunąć wpis?', 'Tej operacji nie można cofnąć.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          await deleteFormDataEntry(entryId);
          await clearDraft(draftKey);
          goBack();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.subtext, padding: 16 }}>Wczytywanie…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? 'Edytuj wpis' : 'Nowy wpis'}
        </Text>
        <View style={styles.headerButtons}>
          {isEditing && (
            <Pressable
              onPress={() => shareJournalEntry({ id: entryId!, date, notes, externalLight, internalLight, references })}
              hitSlop={8}
            >
              <Text style={{ color: colors.primary }}>Udostępnij</Text>
            </Pressable>
          )}
          <Pressable onPress={goBack}>
            <Text style={{ color: colors.primary }}>Anuluj</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {formacjaSource && (
          <View style={[styles.formacjaBadge, { borderColor: colors.formacja, backgroundColor: colors.formacja + '14' }]}>
            <Text style={{ color: colors.formacja, fontWeight: '700', fontSize: 12 }}>
              PRZEMYŚLENIE Z FORMACJI
            </Text>
            <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>
              Tydzień {formacjaSource.weekNumber} · Dzień {toRoman(formacjaSource.dayNumber)} —{' '}
              {formacjaSource.dayTitle}
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.subtext }]}>Data</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder={todayLabel}
            placeholderTextColor={colors.subtext}
            style={[styles.dateInput, { borderColor: colors.border, color: colors.text }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.subtext }]}>Notatki</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            placeholder="Co Bóg dziś do mnie powiedział? Jak było na modlitwie?"
            placeholderTextColor={colors.subtext}
            style={[styles.notesInput, { borderColor: colors.border, color: colors.text }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.subtext }]}>
            Światła zewnętrzne <Text style={{ fontWeight: '400' }}>(wydarzenia)</Text>
          </Text>
          <TextInput
            value={externalLight}
            onChangeText={setExternalLight}
            multiline
            numberOfLines={4}
            placeholder="Co się dziś wydarzyło - w czym Bóg mógł przemawiać przez okoliczności?"
            placeholderTextColor={colors.subtext}
            style={[styles.notesInput, styles.notesInputSmall, { borderColor: colors.border, color: colors.text }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.subtext }]}>
            Światła wewnętrzne <Text style={{ fontWeight: '400' }}>(poruszenia wewnętrzne)</Text>
          </Text>
          <TextInput
            value={internalLight}
            onChangeText={setInternalLight}
            multiline
            numberOfLines={4}
            placeholder="Co działo się w moim sercu - pocieszenie, niepokój, pragnienie?"
            placeholderTextColor={colors.subtext}
            style={[styles.notesInput, styles.notesInputSmall, { borderColor: colors.border, color: colors.text }]}
          />
        </View>

        {references.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.subtext }]}>
              Fragmenty ({references.length})
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 6 }}>
              Fragmenty dodaje się przez modlitwę (Biblia/Podręcznik) - tutaj można je tylko usunąć.
            </Text>
            {references.map((ref, index) => (
              <View
                key={`${ref.name}-${ref.number}-${index}`}
                style={[styles.refRow, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>
                  {ref.name} {formatVerseNumber(ref.number)}
                </Text>
                <Pressable onPress={() => removeReference(index)} hitSlop={8}>
                  <Text style={{ color: colors.subtext, fontSize: 18, paddingHorizontal: 6 }}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, opacity: saving || !canSave ? 0.5 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving || !canSave}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Zapisywanie…' : 'Zapisz'}</Text>
        </Pressable>

        {!canSave && (
          <Text style={{ color: colors.subtext, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Uzupełnij datę i napisz notatkę (albo światła), żeby zapisać.
          </Text>
        )}

        {isEditing && (
          <Pressable style={[styles.deleteButton, { borderColor: colors.subtext }]} onPress={handleDelete}>
            <Text style={{ color: colors.subtext, fontWeight: '600' }}>Usuń wpis</Text>
          </Pressable>
        )}
      </ScrollView>
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
  headerButtons: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  content: { padding: 16 },
  formacjaBadge: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  field: { marginBottom: 18 },
  label: { fontSize: 12, marginBottom: 6 },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  notesInputSmall: {
    minHeight: 90,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
