// src/screens/FormacjaListScreen.tsx
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { FORMACJA_SECTIONS, type FormacjaSection, type FormacjaWeek } from '../data/formacja';
import { getAllCompletedCounts } from '../services/formacjaService';

type Props = NativeStackScreenProps<MainStackParamList, 'Formacja'>;

interface YearGroup {
  id: string; // np. "rok-Rok III"
  title: string; // "Rok I", "Rok III"
  sections: FormacjaSection[];
}

// Bloki z formacjaContent.json grupowane po roku (section.title), w kolejności
// z pliku. Każdy blok to część roku (np. Rok I -> "Część I", Rok III ->
// "Część I – Kościół", "Część IV – Dojrzała osobowość") pokazywana jako
// podfolder z tygodniami.
const YEARS: YearGroup[] = FORMACJA_SECTIONS.reduce<YearGroup[]>((years, section) => {
  const existing = years.find((y) => y.title === section.title);
  if (existing) existing.sections.push(section);
  else years.push({ id: `rok-${section.title}`, title: section.title, sections: [section] });
  return years;
}, []);

function countWeeks(sections: FormacjaSection[]): number {
  return sections.reduce((sum, s) => sum + s.weeks.length, 0);
}

function weeksLabel(n: number): string {
  if (n === 1) return '1 tydzień';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} tygodnie`;
  return `${n} tygodni`;
}

// Lista Formacji jako zwijane drzewo: Rok -> część -> tygodnie. Każde wejście
// na listę pokazuje same lata (zwinięte); wyjątkiem jest powrót z tygodnia
// otwartego z tej listy - wtedy drzewo zostaje tak, jak było.
export default function FormacjaListScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const [completedCounts, setCompletedCounts] = useState<Record<string, number>>({});
  // Najwyżej jeden otwarty rok i jedna otwarta część naraz.
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [openPart, setOpenPart] = useState<string | null>(null);

  // true, gdy z listy otwarto tydzień - powrót z niego nie zwija drzewa.
  const openedWeekRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!openedWeekRef.current) {
        setOpenYear(null);
        setOpenPart(null);
      }
      openedWeekRef.current = false;

      let active = true;
      getAllCompletedCounts().then((counts) => {
        if (active) setCompletedCounts(counts);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  // Kliknięcie roku zwija wszystko inne (pozostałe lata i ich części) -
  // otwarty rok pokazuje same części, zwinięte.
  function toggleYear(year: YearGroup) {
    setOpenYear((prev) => (prev === year.id ? null : year.id));
    setOpenPart(null);
  }

  // Otwarcie części zwija poprzednio otwartą.
  function togglePart(section: FormacjaSection) {
    setOpenPart((prev) => (prev === section.id ? null : section.id));
  }

  function progress(weeks: FormacjaWeek[]) {
    let done = 0;
    let total = 0;
    for (const week of weeks) {
      for (const day of week.days) {
        total += day.tasks.length;
        done += completedCounts[day.id] ?? 0;
      }
    }
    return { done, total };
  }

  function renderWeek(week: FormacjaWeek) {
    const { done, total } = progress([week]);
    return (
      <Pressable
        key={week.id}
        style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          openedWeekRef.current = true;
          navigation.navigate('FormacjaWeek', { weekId: week.id });
        }}
      >
        <Text style={[styles.weekNumber, { color: colors.formacja }]}>Tydzień {week.number}</Text>
        <Text style={[styles.weekTitle, { color: colors.text }]}>{week.title}</Text>
        <Text style={{ color: colors.subtext, marginTop: 4, fontSize: 13 }}>
          {week.days.length} dni · zadania: {done}/{total}
        </Text>
      </Pressable>
    );
  }

  function renderFolder(section: FormacjaSection) {
    const isOpen = openPart === section.id;
    const { done, total } = progress(section.weeks);
    return (
      <View key={section.id}>
        <Pressable
          onPress={() => togglePart(section)}
          style={[styles.folderRow, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Ionicons name={isOpen ? 'folder-open-outline' : 'folder-outline'} size={22} color={colors.formacja} />
          <View style={styles.rowText}>
            <Text style={[styles.folderTitle, { color: colors.text }]}>{section.subtitle}</Text>
            <Text style={{ color: colors.subtext, fontSize: 13 }}>
              {weeksLabel(section.weeks.length)} · zadania: {done}/{total}
            </Text>
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.subtext} />
        </Pressable>
        {isOpen && <View style={styles.folderChildren}>{section.weeks.map(renderWeek)}</View>}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={{ color: colors.subtext, marginBottom: 12 }}>
          Wybierz rok formacji. Każdy tydzień ma 7 dni tekstu i zadań.
        </Text>

        {YEARS.map((year) => {
          const isOpen = openYear === year.id;
          const { done, total } = progress(year.sections.flatMap((s) => s.weeks));
          const parts = year.sections.length;
          const subtitle = `${parts === 1 ? '1 część' : `${parts} części`} · ${weeksLabel(countWeeks(year.sections))}`;

          return (
            <View key={year.id} style={styles.yearBlock}>
              <Pressable
                onPress={() => toggleYear(year)}
                style={[
                  styles.yearRow,
                  { backgroundColor: colors.card, borderColor: isOpen ? colors.formacja : colors.border },
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.yearTitle, { color: colors.formacja }]}>{year.title}</Text>
                  <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
                  <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 2 }}>
                    zadania: {done}/{total}
                  </Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={24} color={colors.formacja} />
              </Pressable>

              {isOpen && (
                <View style={styles.yearChildren}>
                  {year.sections.map(renderFolder)}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  rowText: { flex: 1 },
  yearBlock: { marginBottom: 14 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
  },
  yearTitle: { fontSize: 24, fontWeight: '800' },
  yearChildren: { marginTop: 10, marginLeft: 12 },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  folderTitle: { fontSize: 17, fontWeight: '700' },
  folderChildren: { marginLeft: 12 },
  weekCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  weekNumber: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  weekTitle: { fontSize: 17, fontWeight: '700', marginTop: 2 },
});
