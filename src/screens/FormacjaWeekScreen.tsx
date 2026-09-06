// src/screens/FormacjaWeekScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { FORMACJA_WEEKS, toRoman } from '../data/formacja';
import { getAllCompletedCounts } from '../services/formacjaService';

type Props = NativeStackScreenProps<MainStackParamList, 'FormacjaWeek'>;

// Lista dni (I-VII) w obrębie jednego tygodnia formacji.
export default function FormacjaWeekScreen({ route, navigation }: Props) {
  const { colors } = useAppTheme();
  const { weekId } = route.params;
  const week = FORMACJA_WEEKS.find((w) => w.id === weekId);
  const [completedCounts, setCompletedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    navigation.setOptions({ title: week ? `Tydzień ${week.number}` : 'Formacja' });
  }, [navigation, week]);

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

  if (!week) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, padding: 16 }}>Nie znaleziono tego tygodnia.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={week.days}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={[styles.weekTitle, { color: colors.text }]}>{week.title}</Text>}
        renderItem={({ item: day }) => {
          const done = completedCounts[day.id] ?? 0;
          const total = day.tasks.length;
          return (
            <Pressable
              style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('FormacjaDay', { weekId: week.id, dayId: day.id })}
            >
              <Text style={[styles.dayNumber, { color: colors.formacja }]}>Dzień {toRoman(day.number)}</Text>
              <Text style={[styles.dayTitle, { color: colors.text }]}>{day.title}</Text>
              {total > 0 && (
                <Text style={{ color: colors.subtext, marginTop: 6, fontSize: 13 }}>
                  Zadania: {done}/{total}
                </Text>
              )}
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
  weekTitle: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  dayCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  dayNumber: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayTitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
});
