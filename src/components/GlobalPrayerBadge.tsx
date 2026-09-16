// src/components/GlobalPrayerBadge.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef } from '../navigation/navigationRef';
import { usePrayerTimer } from '../context/PrayerTimerContext';
import { useSelection } from '../context/SelectionContext';

function formatTime(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60).toString().padStart(2, '0');
  const s = Math.floor(abs % 60).toString().padStart(2, '0');
  return `${sign}${m}:${s}`;
}

// Pływający znacznik trwającej modlitwy, widoczny na KAŻDYM ekranie appki -
// nie tylko na samym ekranie ze świecą (SelectedItemsScreen). Renderowany
// raz, obok TabNavigator (patrz App.tsx), więc zmiana ekranu/zakładki go nie
// chowa - liczy dalej, także na minus, jeśli ustawiony czas minie (patrz
// CountdownTimer, ten sam mechanizm bezwzględnego znacznika czasu).
export default function GlobalPrayerBadge() {
  const insets = useSafeAreaInsets();
  const { endTime, clearTimer } = usePrayerTimer();
  const { fragments } = useSelection();
  const [now, setNow] = useState(() => Date.now());
  // Nazwa aktualnie widocznego ekranu - żeby nie dublować licznika na samym
  // ekranie ze świecą (SelectedItemsScreen), który ma już swój własny,
  // duży licznik. Odczytywana przy każdym tyknięciu zegara (bez osobnego
  // listenera - navigationRef bywa jeszcze niegotowy tuż po starcie appki,
  // stąd zabezpieczenie isReady() - w przeciwnym razie getCurrentRoute()
  // rzuca błąd "navigation object hasn't been initialized yet").
  const [routeName, setRouteName] = useState<string | undefined>(() =>
    navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined
  );

  useEffect(() => {
    if (endTime === null) return undefined;
    const id = setInterval(() => {
      setNow(Date.now());
      setRouteName(navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined);
    }, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (endTime === null || routeName === 'SelectedItems') return null;

  const remaining = Math.round((endTime - now) / 1000);
  const overtime = remaining < 0;

  function openPrayerScreen() {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('GlownaTab', {
      screen: 'SelectedItems',
      params: { selectedItems: fragments },
    });
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 64 }]}>
      <Pressable
        onPress={openPrayerScreen}
        style={[styles.badge, { backgroundColor: overtime ? '#c0392b' : '#2c3e50' }]}
      >
        <Text style={styles.label}>Czas modlitwy</Text>
        <Text style={styles.time}>{formatTime(remaining)}</Text>
        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation();
            clearTimer();
          }}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 22,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  label: { color: '#fff', fontSize: 12, opacity: 0.85 },
  time: { color: '#fff', fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] },
  closeButton: { paddingHorizontal: 6, paddingVertical: 2 },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
