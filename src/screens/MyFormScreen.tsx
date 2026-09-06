// src/screens/MyFormScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { useSelection } from '../context/SelectionContext';
import { addFormDataEntry } from '../services/formDataService';
import { formatVerseNumber } from '../utils/formatVerse';

type Props = NativeStackScreenProps<MainStackParamList, 'MyForm'>;

const MONTHS_PL = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

function formatDatePL(d: Date): string {
  return `${d.getDate()} ${MONTHS_PL[d.getMonth()]} ${d.getFullYear()}`;
}

function fragmentKey(name: string | undefined, number: string | undefined): string {
  return `${name ?? ''}__${number ?? ''}`;
}

// Dziennik modlitwy: data zapisuje się automatycznie, jest miejsce na
// notatki, i można wybrać (odznaczyć/zaznaczyć), które z aktualnie
// wybranych fragmentów (wspólny koszyk - SelectionContext) trafią do
// zapisu. Zapisujemy same odnośniki (sigla), nie treść wersetów - krócej
// i czytelniej w historii, treść zawsze można doczytać w Biblii.
export default function MyFormScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { fragments, clearSelection } = useSelection();

  const [notes, setNotes] = useState('');
  const [externalLight, setExternalLight] = useState('');
  const [internalLight, setInternalLight] = useState('');
  const [saving, setSaving] = useState(false);

  const [includedKeys, setIncludedKeys] = useState<Set<string>>(
    () => new Set(fragments.map((f) => fragmentKey(f.sigla?.name, f.sigla?.number)))
  );

  const today = useMemo(() => formatDatePL(new Date()), []);

  function toggleIncluded(key: string) {
    setIncludedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const canSave =
    notes.trim().length > 0 ||
    externalLight.trim().length > 0 ||
    internalLight.trim().length > 0 ||
    includedKeys.size > 0;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const references = fragments
        .filter((f) => includedKeys.has(fragmentKey(f.sigla?.name, f.sigla?.number)))
        .map((f) => ({ name: f.sigla?.name ?? '', number: f.sigla?.number ?? '' }));

      await addFormDataEntry({
        date: today,
        notes: notes.trim(),
        externalLight: externalLight.trim(),
        internalLight: internalLight.trim(),
        references,
      });

      clearSelection();
      setNotes('');
      setExternalLight('');
      setInternalLight('');
      // Wracamy na sam start (Bug #3 ze zgłoszenia) - nie do "Modlitwy".
      navigation.popToTop();
    } finally {
      setSaving(false);
    }
  }

  // "Historia" żyje teraz w osobnej zakładce dolnego paska (DziennikTab),
  // nie w tym samym stosie - stąd navigation.getParent() do przejscia
  // "w gore" do nawigatora zakladek.
  function goToHistory() {
    navigation.getParent()?.navigate('DziennikTab' as never);
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dziennik Modlitwy</Text>
        <Pressable onPress={goToHistory}>
          <Text style={{ color: colors.primary }}>Historia</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.subtext }]}>Data</Text>
          <View style={[styles.dateBox, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 15 }}>{today}</Text>
          </View>
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

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.subtext }]}>
            Fragmenty użyte do modlitwy {fragments.length > 0 ? `(${includedKeys.size}/${fragments.length})` : ''}
          </Text>

          {fragments.length === 0 && (
            <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 4 }}>
              Nie wybrałeś dziś żadnych fragmentów - możesz zapisać samą notatkę.
            </Text>
          )}

          {fragments.map((f, index) => {
            const key = fragmentKey(f.sigla?.name, f.sigla?.number);
            const included = includedKeys.has(key);
            return (
              <Pressable
                key={`${key}-${index}`}
                style={[
                  styles.refRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: included ? colors.primary + '18' : 'transparent',
                  },
                ]}
                onPress={() => toggleIncluded(key)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: included ? colors.primary : colors.border,
                      backgroundColor: included ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {included && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>
                  {f.sigla?.name} {f.sigla?.number ? formatVerseNumber(f.sigla.number) : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, opacity: saving || !canSave ? 0.5 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving || !canSave}
        >
          <Text style={styles.primaryButtonText}>{saving ? 'Zapisywanie…' : 'Zapisz do dziennika'}</Text>
        </Pressable>

        {!canSave && (
          <Text style={{ color: colors.subtext, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Napisz notatkę albo zaznacz przynajmniej jeden fragment, żeby zapisać.
          </Text>
        )}

        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={goToHistory}
        >
          <Text style={{ color: colors.text }}>Historia dziennika</Text>
        </Pressable>
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
  content: { padding: 16 },
  field: { marginBottom: 18 },
  label: { fontSize: 12, marginBottom: 6 },
  dateBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
