// src/screens/FormacjaListScreen.tsx
import React, { useCallback, useState } from 'react';
import { Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { FORMACJA_WEEKS } from '../data/formacja';
import { getAllCompletedCounts } from '../services/formacjaService';

type Props = NativeStackScreenProps<MainStackParamList, 'Formacja'>;

// Lista tygodni formacji ("Dziennik Nowego Życia"). Na razie jeden tydzień -
// kolejne dokłada się w src/data/formacja.ts (tablica FORMACJA_WEEKS) w tym
// samym kształcie i pojawiają się tu automatycznie.
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

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={FORMACJA_WEEKS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={{ color: colors.subtext, marginBottom: 12 }}>
            Dziennik Nowego Życia - kolejne tygodnie formacji, każdy z 7 dniami tekstu i zadań.
          </Text>
        }
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
  weekCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  weekNumber: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  weekTitle: { fontSize: 20, fontWeight: '700', marginTop: 4 },
});
