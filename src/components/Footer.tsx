// src/components/Footer.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme, colorForSection } from '../context/ThemeContext';

interface FooterProps {
  onSectionPress: (section: string) => void;
  onDivineTitlesPress: () => void;
}

// Odpowiednik footer.component.ts - przyciski zmieniające sekcję + skrót do
// "Imiona i tytuły Boga" (osobny ekran, nie sekcja podręcznika).
export default function Footer({ onSectionPress, onDivineTitlesPress }: FooterProps) {
  const { colors } = useAppTheme();

  const items: { label: string; section: string }[] = [
    { label: 'Adoracja', section: 'adoracja' },
    { label: 'Proklamacja', section: 'Wyznanie i Proklamacja' },
    { label: 'Biblia Tysiąclecia', section: 'biblia' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {items.map((item) => (
        <Pressable
          key={item.section}
          style={styles.button}
          onPress={() => onSectionPress(item.section)}
        >
          <Text style={[styles.label, { color: colorForSection(item.section, colors) }]} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
      <Pressable style={styles.button} onPress={onDivineTitlesPress}>
        <Text style={[styles.label, { color: colors.primary }]} numberOfLines={1}>
          Imiona i tytuły Boga
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontWeight: '600',
    fontSize: 13,
  },
});
