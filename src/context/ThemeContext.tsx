// src/context/ThemeContext.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subtext: string;
  primary: string;
  adoracja: string;
  wyznanie: string;
  // `dziekczynienie` i `prosby` zostały po usuniętych sekcjach Podręcznika
  // ("Dziękczynienie", "Prośby" - patrz README) i nie są już używane przez
  // colorForSection (klucze "adoracja3"/"adoracja4" nigdzie nie występują w
  // danych). Odzyskane na ekranie głównym jako akcenty dla kafelków
  // "Czytania dnia" i "Imiona i tytuły Boga" (HomeScreen.tileColorFor) -
  // zamiast dwóch martwych kolorów w palecie, dwa kafelki przestają dzielić
  // ten sam fiolet z Biblią.
  dziekczynienie: string;
  prosby: string;
  formacja: string;
  border: string;
}

const lightColors: ThemeColors = {
  background: '#FAF7F2',
  card: '#FFFFFF',
  text: '#1C1C1E',
  subtext: '#6B6B70',
  primary: '#7C5CFF',
  adoracja: 'rgb(47, 148, 0)',
  wyznanie: '#A0522D',
  dziekczynienie: '#8A2BE2',
  prosby: '#5F9EA0',
  formacja: '#B3423D',
  border: '#E5E1DA',
};

const darkColors: ThemeColors = {
  background: '#15121F',
  card: '#211C30',
  text: '#F3F1F8',
  subtext: '#A9A4B8',
  primary: '#9D85FF',
  adoracja: '#52D17A',
  wyznanie: '#D08A5B',
  dziekczynienie: '#B98CF0',
  prosby: '#7FC2C4',
  formacja: '#FF6B6B',
  border: '#352E48',
};

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      colors: isDark ? darkColors : lightColors,
      toggleTheme: () => setIsDark((d) => !d),
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme musi być używany wewnątrz <ThemeProvider>');
  }
  return ctx;
}

// Mapowanie nazw sekcji na kolory (odpowiednik getColorForSection z Angulara)
export function colorForSection(section: string, colors: ThemeColors): string {
  switch (section) {
    case 'adoracja':
      return colors.adoracja;
    case 'Wyznanie i Proklamacja':
      return colors.wyznanie;
    case 'adoracja3':
      return colors.dziekczynienie;
    case 'adoracja4':
      return colors.prosby;
    default:
      return colors.text;
  }
}
