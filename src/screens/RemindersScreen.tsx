// src/screens/RemindersScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../context/ThemeContext';
import {
  REMINDER_KINDS,
  REMINDER_LABELS,
  getReminderSettings,
  saveReminderSettings,
  syncScheduledReminders,
  ensureNotificationPermission,
  hasNotificationPermission,
  type ReminderKind,
  type ReminderSetting,
  type ReminderSettings,
} from '../services/reminderService';

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']; // indeks + 1 = dzień (1 = pn)
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const WORK_DAYS = [1, 2, 3, 4, 5];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Ustawienia przypomnień: na każdy rodzaj (Czytania dnia, Formacja,
// Adoracja) włącznik, godzina i dni tygodnia. Każda zmiana zapisuje się od
// razu i od razu przeplanowuje powiadomienia (bez przycisku "Zapisz"). O zgodę
// na powiadomienia pytamy dopiero przy pierwszym włączeniu.
export default function RemindersScreen() {
  const { colors } = useAppTheme();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [pickerFor, setPickerFor] = useState<ReminderKind | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const loaded = await getReminderSettings();
        const anyEnabled = REMINDER_KINDS.some((k) => loaded[k].enabled);
        const granted = await hasNotificationPermission();
        if (!active) return;
        setSettings(loaded);
        // Zgoda cofnięta w ustawieniach telefonu, a przypomnienia nadal włączone.
        setPermissionDenied(anyEnabled && !granted);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  async function apply(next: ReminderSettings) {
    setSettings(next);
    await saveReminderSettings(next);
    try {
      await syncScheduledReminders(next);
      setScheduleError(false);
    } catch (e) {
      console.error('Nie udało się zaplanować przypomnień:', e);
      setScheduleError(true);
    }
  }

  function update(kind: ReminderKind, patch: Partial<ReminderSetting>) {
    if (!settings) return;
    const merged = { ...settings[kind], ...patch };
    // Włączone przypomnienie bez żadnego dnia nie ma sensu - wyłącza się samo.
    if (merged.weekdays.length === 0) merged.enabled = false;
    apply({ ...settings, [kind]: merged });
  }

  async function toggleEnabled(kind: ReminderKind, value: boolean) {
    if (!settings) return;
    if (value) {
      const permission = await ensureNotificationPermission();
      if (permission === 'denied') {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      // Włączenie z pustą listą dni przywraca wszystkie dni.
      const weekdays = settings[kind].weekdays.length ? settings[kind].weekdays : ALL_DAYS;
      update(kind, { enabled: true, weekdays });
    } else {
      update(kind, { enabled: false });
    }
  }

  function toggleDay(kind: ReminderKind, day: number) {
    if (!settings) return;
    const current = settings[kind].weekdays;
    const weekdays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    update(kind, { weekdays });
  }

  function onTimePicked(event: DateTimePickerEvent, date?: Date) {
    const kind = pickerFor;
    // Android: systemowe okno zamyka się po wyborze/anulowaniu. iOS: zegar
    // zostaje na ekranie, zamyka go przycisk "Gotowe".
    if (Platform.OS === 'android') setPickerFor(null);
    if (!kind || event.type !== 'set' || !date) return;
    update(kind, { hour: date.getHours(), minute: date.getMinutes() });
  }

  if (!settings) {
    return <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} />;
  }

  const pickerValue = pickerFor
    ? new Date(2000, 0, 1, settings[pickerFor].hour, settings[pickerFor].minute)
    : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: colors.subtext, marginBottom: 12 }}>
          Telefon przypomni Ci o modlitwie o wybranej godzinie, także gdy aplikacja jest zamknięta i bez
          internetu. Stuknięcie w powiadomienie otwiera od razu właściwe miejsce.
        </Text>

        {permissionDenied && (
          <View style={[styles.notice, { borderColor: colors.formacja, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text }}>
              Powiadomienia są wyłączone w ustawieniach telefonu. Włącz je, żeby przypomnienia działały.
            </Text>
            <Pressable onPress={() => Linking.openSettings()} style={styles.noticeButton}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Otwórz ustawienia</Text>
            </Pressable>
          </View>
        )}

        {scheduleError && (
          <View style={[styles.notice, { borderColor: colors.formacja, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text }}>Nie udało się ustawić przypomnienia. Spróbuj ponownie.</Text>
          </View>
        )}

        {REMINDER_KINDS.map((kind) => {
          const s = settings[kind];
          const muted = !s.enabled;
          return (
            <View key={kind} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{REMINDER_LABELS[kind]}</Text>
                <Switch
                  value={s.enabled}
                  onValueChange={(v) => toggleEnabled(kind, v)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  accessibilityLabel={`Przypomnienie: ${REMINDER_LABELS[kind]}`}
                />
              </View>

              <Pressable
                onPress={() => setPickerFor(kind)}
                style={[styles.timeButton, { borderColor: colors.border, opacity: muted ? 0.5 : 1 }]}
                accessibilityLabel={`Godzina przypomnienia: ${pad(s.hour)}:${pad(s.minute)}`}
              >
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {pad(s.hour)}:{pad(s.minute)}
                </Text>
              </Pressable>

              <View style={[styles.daysRow, { opacity: muted ? 0.5 : 1 }]}>
                {DAY_LABELS.map((label, i) => {
                  const day = i + 1;
                  const on = s.weekdays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => toggleDay(kind, day)}
                      style={[
                        styles.dayChip,
                        { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : 'transparent' },
                      ]}
                      accessibilityLabel={`${label}${on ? ', zaznaczony' : ''}`}
                    >
                      <Text style={{ color: on ? '#FFFFFF' : colors.text, fontWeight: '600', fontSize: 13 }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.shortcuts, { opacity: muted ? 0.5 : 1 }]}>
                <Pressable onPress={() => update(kind, { weekdays: ALL_DAYS })} hitSlop={6}>
                  <Text style={{ color: colors.primary }}>Codziennie</Text>
                </Pressable>
                <Pressable onPress={() => update(kind, { weekdays: WORK_DAYS })} hitSlop={6}>
                  <Text style={{ color: colors.primary }}>Pn–Pt</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {pickerFor && pickerValue && (
          <View>
            <DateTimePicker
              value={pickerValue}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimePicked}
            />
            {Platform.OS === 'ios' && (
              <Pressable onPress={() => setPickerFor(null)} style={styles.noticeButton}>
                <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>Gotowe</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  notice: { borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 14 },
  noticeButton: { marginTop: 10, paddingVertical: 6 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  timeButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  timeText: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  dayChip: { borderWidth: 1, borderRadius: 16, minWidth: 40, paddingVertical: 6, alignItems: 'center' },
  shortcuts: { flexDirection: 'row', gap: 20, marginTop: 12 },
});
