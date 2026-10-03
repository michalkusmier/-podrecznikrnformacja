// src/screens/FormacjaListScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { FORMACJA_SECTIONS } from '../data/formacja';
import { getAllCompletedCounts } from '../services/formacjaService';

type Props = NativeStackScreenProps<MainStackParamList, 'Formacja'>;

// Lista tygodni formacji pogrupowana w bloki (Rok I, Rok III - Kościół,
// Rok III - Dojrzała osobowość). Treść jest w src/data/formacjaContent.json -
// nowe bloki/tygodnie pojawiają się tu automatycznie.
export default function FormacjaListScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const [completedCounts, setCompletedCounts] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAllCompletedCounts().then((counts) => {
        if (active) setCompletedCounts(counts);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const sections = FORMACJA_SECTIONS.map((s) => ({ ...s, data: s.weeks }));

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <Text style={{ color: colors.subtext, marginBottom: 4 }}>
            Kolejne tygodnie formacji, każdy z 7 dniami tekstu i zadań.
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={{ color: colors.subtext, fontSize: 14 }}>{section.subtitle}</Text>
          </View>
        )}
        renderItem={({ item: week }) => {
          const total = week.days.reduce((sum, d) => sum + d.tasks.length, 0);
          const done = week.days.reduce((sum, d) => sum + (completedCounts[d.id] ?? 0), 0);
          return (
            <Pressable
              style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('FormacjaWeek', { weekId: week.id })}
            >
              <Text style={[styles.weekNumber, { color: colors.formacja }]}>Tydzień {week.number}</Text>
              <Text style={[styles.weekTitle, { color: colors.text }]}>{week.title}</Text>
              <Text style={{ color: colors.subtext, marginTop: 6, fontSize: 13 }}>
                {week.days.length} dni · zadania: {done}/{total}
              </Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 16 },
  sectionHeader: { marginTop: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 22, fontWeight: '800' },
  weekCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  weekNumber: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  weekTitle: { fontSize: 20, fontWeight: '700', marginTop: 4 },
});
