// src/screens/BibliaScreen.tsx
import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { useSelection } from '../context/SelectionContext';
import BibliaBrowser, { BibliaDeepLink } from '../components/BibliaBrowser';

type Props = NativeStackScreenProps<MainStackParamList, 'Biblia'>;

// Samodzielny ekran Biblii, dostępny bezpośrednio z dolnego menu głównego
// (kafelek "Biblia Tysiąclecia") oraz przez deep-link z Historii Dziennika
// (route.params: openBook/openChapter/openVerseNumber - "otwórz od razu ten
// werset"). Cała logika przeglądania/wyszukiwania mieszka we współdzielonym
// komponencie BibliaBrowser, żeby ta sama przeglądarka dała się osadzić też
// bezpośrednio wewnątrz ekranu głównego (HomeScreen).
export default function BibliaScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const { fragments } = useSelection();

  const [deepLink, setDeepLink] = useState<BibliaDeepLink | null>(null);

  useFocusEffect(
    useCallback(() => {
      const { openBook, openChapter, openVerseNumber } = route.params ?? {};
      if (!openBook) return;
      setDeepLink({ openBook, openChapter, openVerseNumber });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.params?.openBook, route.params?.openChapter, route.params?.openVerseNumber])
  );

  function handleDeepLinkHandled() {
    setDeepLink(null);
    // Czyścimy parametry, żeby ponowne wejście na ten ekran z menu nie
    // "pamiętało" starego celu.
    navigation.setParams({ openBook: undefined, openChapter: undefined, openVerseNumber: undefined });
  }

  function goToQueue() {
    navigation.navigate('SelectedItems', { selectedItems: fragments });
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <BibliaBrowser goToQueue={goToQueue} deepLink={deepLink} onDeepLinkHandled={handleDeepLinkHandled} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
