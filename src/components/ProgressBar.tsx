// src/components/ProgressBar.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

// Cienki pasek postępu (np. zadania Formacji: done/total). Przy total = 0
// nic nie rysuje.
export default function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const { colors } = useAppTheme();
  if (total <= 0) return null;
  const ratio = Math.min(1, done / total);
  return (
    <View style={[styles.track, { backgroundColor: colors.border }]}>
      <View style={[styles.fill, { backgroundColor: color, width: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: 2 },
});
