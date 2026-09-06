// src/components/CountdownTimer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface CountdownTimerProps {
  startInSeconds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Odpowiednik countdown-timer.component.ts
export default function CountdownTimer({ startInSeconds }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(startInSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(startInSeconds);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startInSeconds]);

  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
      <Text style={styles.time}>{formatTime(remaining)}</Text>
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
});
