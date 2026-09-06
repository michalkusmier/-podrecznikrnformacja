// src/screens/FormacjaDayScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList, SavedFormEntry } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { useSelection } from '../context/SelectionContext';
import { FORMACJA_WEEKS, toRoman } from '../data/formacja';
import { getCompletedTaskIds, setTaskCompleted } from '../services/formacjaService';
import { getFormDataListForFormacjaDay } from '../services/formDataService';
import { resolveCitationVerses } from '../services/bibliaService';
import { formatVerseNumber } from '../utils/formatVerse';

type Props = NativeStackScreenProps<MainStackParamList, 'FormacjaDay'>;

// Treść jednego dnia formacji: tekst do przeczytania (akapity, opcjonalna
// lista punktowana, opcjonalna wyróżniona myśl "ZAPAMIĘTAJ"), zadania z
// checkboxami (stan w AsyncStorage - formacjaService), a dla zadań modlitwy
// ("kind: pray") - rozbicie odnośnika na pojedyncze wersety (tak jak w
// Czytaniach dnia) do zaznaczenia we wspólnym koszyku modlitwy. Na dole -
// przemyślenia zapisane przy tym dniu (wpisy w tym samym Dzienniku Modlitwy
// co po modlitwie, tylko oznaczone powiązaniem z tym dniem).
export default function FormacjaDayScreen({ route, navigation }: Props) {
  const { colors } = useAppTheme();
  const { weekId, dayId } = route.params;
  const week = FORMACJA_WEEKS.find((w) => w.id === weekId);
  const day = week?.days.find((d) => d.id === dayId);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [reflections, setReflections] = useState<SavedFormEntry[]>([]);
  const { fragments, toggleFragment, isSelected, count } = useSelection();

  useEffect(() => {
    navigation.setOptions({ title: day ? `Dzień ${toRoman(day.number)}` : 'Formacja' });
  }, [navigation, day]);

  useEffect(() => {
    getCompletedTaskIds(dayId).then((ids) => setCompleted(new Set(ids)));
  }, [dayId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getFormDataListForFormacjaDay(dayId).then((list) => {
        if (active) setReflections(list);
      });
      return () => {
        active = false;
      };
    }, [dayId])
  );

  async function toggleTask(taskId: string) {
    const isDone = completed.has(taskId);
    const next = new Set(completed);
    if (isDone) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    setCompleted(next);
    await setTaskCompleted(dayId, taskId, !isDone);
  }

  function goToQueue() {
    navigation.navigate('SelectedItems', { selectedItems: fragments });
  }

  function addReflection() {
    if (!week || !day) return;
    navigation.navigate('JournalEntry', {
      formacjaSource: {
        weekId: week.id,
        weekNumber: week.number,
        dayId: day.id,
        dayNumber: day.number,
        dayTitle: day.title,
      },
    });
  }

  function editReflection(id: string) {
    navigation.navigate('JournalEntry', { entryId: id });
  }

  if (!week || !day) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, padding: 16 }}>Nie znaleziono treści na ten dzień.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.eyebrow, { color: colors.subtext }]}>
          Tydzień {week.number} · Dzień {toRoman(day.number)}
        </Text>
        <Text style={[styles.title, { color: colors.formacja }]}>{day.title}</Text>

        {day.paragraphs.map((p, i) => (
          <Text key={i} style={[styles.paragraph, { color: colors.text }]}>
            {p}
          </Text>
        ))}

        {day.bulletList && (
          <View style={styles.bulletBox}>
            {day.bulletList.map((item, i) => (
              <Text key={i} style={[styles.bullet, { color: colors.text }]}>
                •  {item}
              </Text>
            ))}
          </View>
        )}

        {day.remember && (
          <View style={[styles.rememberBox, { borderColor: colors.formacja, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.formacja }]}>ZAPAMIĘTAJ TO ZDANIE</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>{day.remember}</Text>
          </View>
        )}

        {day.tasks.length > 0 && (
          <View style={styles.tasksSection}>
            <Text style={[styles.sectionLabel, { color: colors.subtext }]}>ZADANIA</Text>
            {day.tasks.map((task) => {
              const done = completed.has(task.id);
              const resolved =
                task.kind === 'pray' && task.reference ? resolveCitationVerses(task.reference) : null;

              return (
                <View key={task.id} style={styles.taskBlock}>
                  <Pressable
                    onPress={() => toggleTask(task.id)}
                    style={[styles.taskRow, { borderColor: colors.border }]}
                  >
                    <Ionicons
                      name={done ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={done ? colors.formacja : colors.subtext}
                    />
                    <Text
                      style={[
                        styles.taskLabel,
                        { color: colors.text, textDecorationLine: done ? 'line-through' : 'none' },
                      ]}
                    >
                      {task.label}
                    </Text>
                  </Pressable>

                  {resolved && (
                    <View style={styles.verseList}>
                      {resolved.verses.map((rv) => {
                        const ref = {
                          sigla: { name: resolved.bookName, number: `${rv.chapter},${rv.entry.number}` },
                          quote: rv.entry.text,
                        };
                        const selected = isSelected(ref);
                        return (
                          <Pressable
                            key={`${rv.chapter}-${rv.entry.number}`}
                            onPress={() => toggleFragment(ref)}
                            style={[
                              styles.verseRow,
                              {
                                borderColor: colors.border,
                                backgroundColor: selected ? colors.formacja + '22' : colors.card,
                              },
                            ]}
                          >
                            <Text style={[styles.verseNumber, { color: colors.formacja }]}>
                              {formatVerseNumber(`${rv.chapter},${rv.entry.number}`)}
                            </Text>
                            <Text style={[styles.verseText, { color: colors.text }]}>{rv.entry.text}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.reflectionsSection}>
          <Text style={[styles.sectionLabel, { color: colors.subtext }]}>TWOJE PRZEMYŚLENIA</Text>

          {reflections.length === 0 && (
            <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 4, marginBottom: 10 }}>
              Nie zapisałeś jeszcze przemyśleń przy tym dniu.
            </Text>
          )}

          {reflections.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => editReflection(entry.id)}
              style={[styles.reflectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Text style={[styles.reflectionDate, { color: colors.formacja }]}>{entry.date}</Text>
              {!!entry.notes && (
                <Text style={{ color: colors.text, marginTop: 4 }} numberOfLines={3}>
                  {entry.notes}
                </Text>
              )}
            </Pressable>
          ))}

          <Pressable
            onPress={addReflection}
            style={[styles.addReflectionButton, { borderColor: colors.formacja }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.formacja} />
            <Text style={{ color: colors.formacja, fontWeight: '700', marginLeft: 8 }}>
              Zapisz przemyślenie
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.prayerButton, { backgroundColor: colors.primary, opacity: count ? 1 : 0.5 }]}
          onPress={goToQueue}
          disabled={count === 0}
        >
          <Text style={styles.prayerButtonText}>Modlitwa ({count})</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800', marginTop: 4, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  paragraph: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  bulletBox: { marginBottom: 10 },
  bullet: { fontSize: 14, lineHeight: 21, marginBottom: 4, paddingLeft: 4 },
  rememberBox: { borderWidth: 1.5, borderRadius: 14, padding: 16, marginTop: 6, marginBottom: 16 },
  tasksSection: { marginTop: 10 },
  taskBlock: { marginBottom: 4 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskLabel: { fontSize: 15, flex: 1 },
  verseList: { marginLeft: 32, marginTop: 6, marginBottom: 8, gap: 6 },
  verseRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  verseNumber: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  verseText: { fontSize: 13, lineHeight: 19 },
  reflectionsSection: { marginTop: 22 },
  reflectionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  reflectionDate: { fontSize: 13, fontWeight: '700' },
  addReflectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  bottomBar: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  prayerButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  prayerButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
