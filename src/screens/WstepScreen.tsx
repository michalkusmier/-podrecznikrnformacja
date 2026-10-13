// src/screens/WstepScreen.tsx
import React from 'react';
import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

// Odpowiednik wstep.page.ts. Teksty pisane bezosobowo albo w trybie
// rozkazującym, żeby pasowały i do kobiet, i do mężczyzn (bez "modlił się",
// "skończyłeś" itp.).
export default function WstepScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();

  const itemTitle = [styles.guideItemTitle, { color: colors.text }];
  const itemText = [styles.guideItemText, { color: colors.subtext }];
  const bold = { color: colors.text, fontWeight: '700' as const };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Wstęp</Text>

        <View style={[styles.row, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>Tryb ciemny</Text>
          <Switch value={isDark} onValueChange={toggleTheme} />
        </View>

        <Text style={[styles.paragraph, { color: colors.text }]}>
          Usiądź wygodnie i znajdź odpowiednie miejsce w domu. Zadbaj o czas, w którym nikt nie
          będzie ci przeszkadzać. Módl się na głos, aby usłyszeć Boże Słowa.
        </Text>

        <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.guideTitle, { color: colors.primary }]}>
            Jak poruszać się po aplikacji
          </Text>

          <Text style={itemTitle}>1. Strona główna: cztery kafelki</Text>
          <Text style={itemText}>
            <Text style={bold}>Formacja</Text>: program formacyjny, tydzień po tygodniu. Wymaga
            konta, które zakładasz kodem dostępu od prowadzącego. Każdy dzień ma treść, zdanie do
            zapamiętania i zadania do odhaczenia. Swoje myśli zapiszesz przyciskiem „Zapisz
            przemyślenie”. Karta „Kontynuuj” otwiera ostatnio otwarty dzień.
          </Text>
          <Text style={itemText}>
            <Text style={bold}>Adoracja</Text>: fragmenty Pisma, którymi uwielbiasz Boga („Kim
            jesteś, Boże?”). Przełącznik „Proklamacja” pokazuje fragmenty o tym, kim Bóg jest dla
            ciebie.
          </Text>
          <Text style={itemText}>
            <Text style={bold}>Słowo Boże</Text>: „Czytania dnia” (potrzebny internet) oraz
            „Biblia”, w której możesz szukać słów albo przeglądać księgi.
          </Text>
          <Text style={itemText}>
            <Text style={bold}>Imiona i tytuły Boga</Text>: wybierz Ojca, Jezusa albo Ducha
            Świętego i konkretny tytuł, a zobaczysz fragmenty, w których występuje.
          </Text>
          <Text style={itemText}>
            Wszędzie zaznaczasz wersety, którymi chcesz się dziś modlić. Ich liczbę widać na
            przycisku „Modlitwa”.
          </Text>

          <Text style={itemTitle}>
            2. Modlitwa{' '}
            <Text style={{ fontWeight: '400' }}>(przycisk „Modlitwa” albo zakładka „Start” na dole)</Text>
          </Text>
          <Text style={itemText}>
            Zapal świecę, ustaw czas i módl się zaznaczonymi fragmentami. Dotknij fragmentu po
            zakończeniu modlitwy nim, a zniknie z listy. Gdy znikną wszystkie, aplikacja przeniesie
            cię do zapisania wpisu.
          </Text>

          <Text style={itemTitle}>
            3. Dziennik <Text style={{ fontWeight: '400' }}>(zakładka na dole)</Text>
          </Text>
          <Text style={itemText}>
            Twoja historia modlitw: notatki, światła zewnętrzne i wewnętrzne oraz użyte fragmenty,
            które prowadzą wprost do wersetu w Biblii. Przyciskiem „+” dodasz wpis poza modlitwą.
          </Text>
          <Text style={itemText}>
            Dziennik jest zapisany tylko na tym telefonie. Ikoną archiwum zapiszesz kopię do pliku
            (np. na Dysk Google albo w mailu) i przywrócisz ją na nowym telefonie.
          </Text>

          <Text style={itemTitle}>4. Ikony na górze ekranu</Text>
          <Text style={itemText}>
            <Text style={bold}>Dzwonek</Text>: przypomnienia o Czytaniach dnia, Formacji i
            Adoracji (godzina i dni tygodnia).
          </Text>
          <Text style={itemText}>
            <Text style={bold}>Księżyc/słońce</Text>: tryb ciemny albo jasny.
          </Text>
          <Text style={itemText}>
            <Text style={bold}>Znak zapytania</Text>: ten ekran.
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
  guideTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  guideItemTitle: { fontSize: 14, fontWeight: '700', marginTop: 14 },
  guideItemText: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});
