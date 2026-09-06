// src/screens/WstepScreen.tsx
import React from 'react';
import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

// Odpowiednik wstep.page.ts
export default function WstepScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Wstęp</Text>

        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>Tryb ciemny</Text>
          <Switch value={isDark} onValueChange={toggleTheme} />
        </View>

        <Text style={[styles.paragraph, { color: colors.text }]}>
          Usiądź sobie wygodnie i znajdź odpowiednie miejsce w domu. Postaraj się zadbać o
          czas, tak by nikt ci nie przeszkadzał. Będziesz modlił się na głos, byś mógł usłyszeć
          Boże Słowa.
        </Text>

        <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.guideTitle, { color: colors.primary }]}>
            Jak poruszać się po aplikacji
          </Text>

          <Text style={[styles.guideItemTitle, { color: colors.text }]}>1. Wybierz fragmenty</Text>
          <Text style={[styles.guideItemText, { color: colors.subtext }]}>
            Na ekranie głównym: Adoracja, Proklamacja albo Imiona i tytuły Boga. Zaznacz
            wersety, którymi chcesz się dziś modlić — możesz też szukać ich wprost w Biblii
            Tysiąclecia.
          </Text>

          <Text style={[styles.guideItemTitle, { color: colors.text }]}>
            2. Modlitwa <Text style={{ fontWeight: '400' }}>(zakładka na dole)</Text>
          </Text>
          <Text style={[styles.guideItemText, { color: colors.subtext }]}>
            Zapal świecę, ustaw czas i módl się zaznaczonymi fragmentami. Dotknij fragment, gdy
            skończysz się nim modlić — zniknie z listy. Gdy znikną wszystkie, appka
            automatycznie przeniesie cię do zapisania wpisu.
          </Text>

          <Text style={[styles.guideItemTitle, { color: colors.text }]}>
            3. Dziennik <Text style={{ fontWeight: '400' }}>(zakładka na dole)</Text>
          </Text>
          <Text style={[styles.guideItemText, { color: colors.subtext }]}>
            Twoja historia modlitw — notatki, światła zewnętrzne/wewnętrzne i użyte fragmenty
            (klikalne, prowadzą wprost do wersetu w Biblii) — zawsze pod ręką, niezależnie gdzie
            akurat jesteś w appce.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  paragraph: { fontSize: 15, lineHeight: 22 },
  guideCard: {
    marginTop: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
  },
  guideTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  guideItemTitle: { fontSize: 14, fontWeight: '700', marginTop: 10 },
  guideItemText: { fontSize: 13, lineHeight: 19, marginTop: 3 },
});
