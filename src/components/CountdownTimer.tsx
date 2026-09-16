// src/components/CountdownTimer.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CountdownTimerProps {
  // Bezwzględny znacznik czasu (Date.now() + N minut), do którego liczymy -
  // NIE liczba sekund od zamontowania. Dzięki temu wyświetlany czas zawsze
  // odzwierciedla realny upływ czasu, nawet jeśli ten komponent zostanie
  // odmontowany i zamontowany ponownie (np. "Wstecz" i powrót na ekran).
  endTime: number;
}

// Po przekroczeniu ustawionego czasu liczymy dalej, tylko na minus (zamiast
// zatrzymywać się na 00:00) - żeby było widać, o ile modlitwa się przedłużyła.
function formatTime(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60).toString().padStart(2, '0');
  const s = Math.floor(abs % 60).toString().padStart(2, '0');
  return `${sign}${m}:${s}`;
}

// Odpowiednik countdown-timer.component.ts
export default function CountdownTimer({ endTime }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.round((endTime - now) / 1000);
  const overtime = remaining < 0;

  return (
    <View style={[styles.card, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
      <Text style={[styles.time, overtime && styles.timeOvertime]}>{formatTime(remaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  time: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeOvertime: { color: '#ff6b6b' },
});
