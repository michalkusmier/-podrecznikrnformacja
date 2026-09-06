// src/data/divineTitles.ts
//
// Lista imion/tytułów odnoszących się do Boga Ojca, Jezusa Chrystusa i Ducha
// Świętego, zweryfikowana ręcznie na podstawie pełnego tekstu Biblii
// Tysiąclecia (patrz src/data/biblia.json) - każdy tytuł faktycznie
// występuje w tekście w jednoznacznym, nie-generycznym znaczeniu.

export type DivineCategory = 'Bóg Ojciec' | 'Jezus Chrystus' | 'Duch Święty';

export interface DivineTitle {
  id: string;
  name: string;
  category: DivineCategory;
  // Fraza rozbita na słowa - używana do budowania wzorca wyszukiwania
  // tolerującego odmianę przez przypadki (patrz divineTitlesService.ts).
  words: string[];
  // Dla rzadkich przypadków, gdzie polska konstrukcja eliptyczna
  // ("duch rady i męstwa" = "duch rady i [duch] męstwa") uniemożliwia
  // wyszukiwanie wzorcem - podajemy werset wprost.
  manualCitation?: { skrot: string; chapter: number; verseNumber: string };
}

function t(
  name: string,
  category: DivineCategory,
  words?: string[],
  manualCitation?: { skrot: string; chapter: number; verseNumber: string }
): DivineTitle {
  return {
    id: name,
    name,
    category,
    words: words ?? name.split(' '),
    manualCitation,
  };
}

export const DIVINE_TITLES: DivineTitle[] = [
  // ===== BÓG OJCIEC / BÓSTWO =====
  t('Abba', 'Bóg Ojciec'),
  t('Bóg', 'Bóg Ojciec'),
  t('Bóg Abrahama', 'Bóg Ojciec'),
  t('Bóg Izaaka', 'Bóg Ojciec'),
  t('Bóg Izraela', 'Bóg Ojciec'),
  t('Bóg Jakuba', 'Bóg Ojciec'),
  t('Bóg mój', 'Bóg Ojciec'),
  t('Bóg Najwyższy', 'Bóg Ojciec'),
  t('Bóg nasz', 'Bóg Ojciec'),
  t('Bóg naszych ojców', 'Bóg Ojciec'),
  t('Bóg Ojców', 'Bóg Ojciec'),
  t('Bóg pokoju', 'Bóg Ojciec'),
  t('Bóg Wszechmogący', 'Bóg Ojciec'),
  t('Bóg wszelkiej łaski', 'Bóg Ojciec'),
  t('Bóg wszelkiej pociechy', 'Bóg Ojciec'),
  t('Bóg Zastępów', 'Bóg Ojciec'),
  t('Bóg zazdrosny', 'Bóg Ojciec'),
  t('Bóg żyjący', 'Bóg Ojciec'),
  t('Bóg żywy', 'Bóg Ojciec'),
  t('Jahwe', 'Bóg Ojciec'),
  t('Najwyższy', 'Bóg Ojciec'),
  t('Odkupiciel', 'Bóg Ojciec'),
  t('Ojciec miłosierdzia', 'Bóg Ojciec'),
  t('Ojciec niebieski', 'Bóg Ojciec'),
  t('Ojciec świateł', 'Bóg Ojciec'),
  t('Ojcze nasz', 'Bóg Ojciec'),
  t('Pan Bóg', 'Bóg Ojciec'),
  t('Pan Zastępów', 'Bóg Ojciec'),
  t('Puklerz nasz', 'Bóg Ojciec'),
  t('Sędzia sprawiedliwy', 'Bóg Ojciec'),
  t('Słońce i Tarcza', 'Bóg Ojciec'),
  t('Stwórca', 'Bóg Ojciec'),
  t('Stwórca nieba i ziemi', 'Bóg Ojciec'),
  t('Stworzyciel', 'Bóg Ojciec'),
  t('Święty Izraela', 'Bóg Ojciec'),
  t('Wszechmogący', 'Bóg Ojciec'),
  t('Łaskawy', 'Bóg Ojciec'),
  t('Bliski', 'Bóg Ojciec'),
  t('Obrońca', 'Bóg Ojciec'),
  t('Wybawca', 'Bóg Ojciec'),
  t('Opoka mego serca', 'Bóg Ojciec'),
  t('Mocarz wojny', 'Bóg Ojciec'),

  // ===== JEZUS CHRYSTUS =====
  t('Alfa i Omega', 'Jezus Chrystus'),
  t('Baranek Boży', 'Jezus Chrystus'),
  t('Baranek zabity', 'Jezus Chrystus'),
  t('Bóg Mocny', 'Jezus Chrystus'),
  t('Chleb życia', 'Jezus Chrystus'),
  t('Chrystus', 'Jezus Chrystus'),
  t('Dobry Pasterz', 'Jezus Chrystus'),
  t('Emmanuel', 'Jezus Chrystus'),
  t('Głowa Kościoła', 'Jezus Chrystus'),
  t('Gwiazda poranna', 'Jezus Chrystus'),
  t('Jezus Chrystus', 'Jezus Chrystus'),
  t('Kamień węgielny', 'Jezus Chrystus'),
  t('Korzeń Jessego', 'Jezus Chrystus'),
  t('Książę Pokoju', 'Jezus Chrystus'),
  t('Lew z pokolenia Judy', 'Jezus Chrystus'),
  t('Mesjasz', 'Jezus Chrystus'),
  t('Obraz Boga niewidzialnego', 'Jezus Chrystus'),
  t('Odblask Jego chwały', 'Jezus Chrystus'),
  t('Odwieczny Ojciec', 'Jezus Chrystus'),
  t('Odrośl Pana', 'Jezus Chrystus'),
  t('Pierworodny spośród umarłych', 'Jezus Chrystus'),
  t('Pierwszy i Ostatni', 'Jezus Chrystus'),
  t('Początek i Koniec', 'Jezus Chrystus'),
  t('Pokorny', 'Jezus Chrystus'),
  t('Pośrednik Nowego Przymierza', 'Jezus Chrystus'),
  t('Przedziwny Doradca', 'Jezus Chrystus', ['Przedziwny', 'Doradca']),
  t('Rabbuni', 'Jezus Chrystus'),
  t('Sędzia żywych i umarłych', 'Jezus Chrystus'),
  t('Słońce Sprawiedliwości', 'Jezus Chrystus'),
  t('Sprawca zbawienia', 'Jezus Chrystus'),
  t('Syn Boży', 'Jezus Chrystus'),
  t('Syn Człowieczy', 'Jezus Chrystus'),
  t('Wschodzące Słońce', 'Jezus Chrystus'),
  t('Zbawiciel', 'Jezus Chrystus'),

  // ===== DUCH ŚWIĘTY =====
  t('Duch Boży', 'Duch Święty'),
  t('Duch Chrystusowy', 'Duch Święty'),
  t('Duch Mądrości', 'Duch Święty'),
  t('Duch Męstwa', 'Duch Święty', ['Duch', 'Męstwa'], { skrot: 'Iz', chapter: 11, verseNumber: '02' }),
  t('Duch Pański', 'Duch Święty'),
  t('Duch Prawdy', 'Duch Święty'),
  t('Duch proroctwa', 'Duch Święty'),
  t('Duch Przybrania za synów', 'Duch Święty'),
  t('Duch Rady', 'Duch Święty'),
  t('Duch Świętości', 'Duch Święty'),
  t('Duch Święty', 'Duch Święty'),
  t('Duch Syna', 'Duch Święty'),
  t('Duch Wiedzy', 'Duch Święty'),
  t('Palec Boży', 'Duch Święty'),
  t('Pocieszyciel', 'Duch Święty'),
];
