# Podręcznik Adoracji — wersja React Native (Expo)

Pełne przepisanie aplikacji z Ionic/Angular/Capacitor na **React Native + Expo**.
Ta sama funkcjonalność (przeglądanie sekcji modlitewnych, wybór fragmentów,
licznik czasu modlitwy, formularz refleksji z historią), ale jako prawdziwa
aplikacja natywna na telefon — szybsza, lżejsza i bez przeglądarkowego silnika w środku.

## Poprawki po pierwszym teście na prawdziwym telefonie (APK)

- **1966 wersetów (prawie 6% całej Biblii!) miało ucięty tekst** — zgłoszony
  problem z Mateusza 9,17 okazał się objawem systemowego błędu w parserze
  PDF: gdy tekst wersetu przechodził przez granicę stron, a strona kończyła
  się w środku wersetu, parser gubił resztę tekstu po nagłówku następnej
  strony. Naprawione u źródła i wygenerowane od nowa - wszystkie 35 274
  wersety mają teraz pełny tekst.
- **Świeca "zawieszała się" na statycznym obrazie** - znany problem
  `expo-video` na Androidzie (release build), gdzie odtwarzacz czasem
  zawiesza się na pierwszej klatce, jeśli `play()` wywoła się zanim natywny
  widok w pełni się zamontuje. Dodane zapasowe, opóźnione wywołanie `play()`
  jako obejście.
- **Zapisanie formularza nie wracało na ekran startowy** - naprawione,
  `popToTop()` zamiast przejścia do „Modlitwy".

## Nowość: przeglądarka Biblii Tysiąclecia (offline)

Ekran **Biblia Tysiąclecia** (dostępny z ekranu głównego) ma dwie zakładki:

**„Szukaj w tekście" (domyślna)** — prawdziwe wyszukiwanie pełnotekstowe:
wpisujesz np. „Królem”, a appka przeszukuje **treść wszystkich ~35 000
wersetów w całej Biblii** (nie nazwy ksiąg) i pokazuje każde pasujące zdanie,
z dowolnej księgi, wraz z odnośnikiem (np. „1 Krl 3,7”). Wyniki można
sortować (kolejność biblijna / nazwa księgi A-Z).

**„Przeglądaj księgi"** — klasyczne przeglądanie: wyszukiwanie i sortowanie
ksiąg po nazwie → wybór rozdziału → wyszukiwanie/sortowanie wersetów w
obrębie tego rozdziału.

W obu zakładkach można **zaznaczyć wersety i dodać je do kolejki** —
dokładnie tak samo, jak przy wyborze fragmentów w Podręczniku
(`PodrecznikScreen`) — trafiają na ten sam ekran „Wybrane Fragmenty” z
licznikiem czasu i wideo świecy.

**Skąd dane:** z przesłanego pliku `Biblia-Tysiąclecia-Pallotinum.pdf`
(transkrypcja *Pismo-Sw 3.0 BETA*, Piotr Kłosowski, tekst: Biblia Tysiąclecia,
Wydawnictwo Pallottinum), wyekstrahowanego raz do lokalnego pliku
`src/data/biblia.json` (73 księgi, ponad 35 000 wersetów). Appka **nie łączy
się z internetem**, żeby wyświetlić tekst Biblii — wszystko jest wbudowane i
działa offline.

**Ważne ograniczenie źródła:** ten konkretny plik PDF jest oznaczony przez
autora jako transkrypcja **BETA** i ma jedną lukę — **Księga Estery zawiera
tylko 17 wersetów** (fragment grecki, tzw. "Dodatek A"), bez pełnego tekstu
hebrajskiego (rozdziałów 1–10). Wszystkie pozostałe 72 księgi mają kompletną
liczbę rozdziałów zgodną ze standardowym kanonem katolickim (zweryfikowane:
Rdz=50, Wj=40, Ps=150, Mt=28, Ap=22 itd. — wszystko się zgadza). Jeśli
zależy Ci na pełnym tekście Estery, podeślij dodatkowe źródło (inny PDF albo
plik tekstowy) tych brakujących rozdziałów, a dołożę je do bazy.

**Uwaga prawna:** tekst Biblii Tysiąclecia jest własnością Wydawnictwa
Pallottinum. Wbudowanie go w apkę do własnego, niekomercyjnego użytku
(modlitwa, nauka) jest tym samym, co czytanie własnej książki w aplikacji do
notatek. Jeśli appka miałaby trafić do sklepów (Google Play / App Store) jako
produkt publiczny lub komercyjny, warto wcześniej zweryfikować zasady
wykorzystania tekstu z Pallottinum lub rozważyć użycie przekładu jawnie
udostępnionego na innej licencji (np. Biblia Warszawska czy Uwspółcześniona
Biblia Gdańska, które mają bardziej otwarte zasady wykorzystania).

## Nowość: „Imiona i tytuły Boga" (91 tytułów)

Ekran dostępny z ekranu głównego. Trzy kategorie: **Bóg Ojciec** (42),
**Jezus Chrystus** (34), **Duch Święty** (15) — każdy tytuł ręcznie
zweryfikowany na pełnym tekście Biblii, żeby wykluczyć słowa wieloznaczne
(np. odrzucone zostały „Król", „Sędzia", „Droga" same w sobie — w
większości wystąpień odnoszą się do ludzi, nie do Boga).

Wybierz tytuł → zobacz wszystkie fragmenty, w których faktycznie występuje
(wyszukiwanie **z tolerancją na polską odmianę przez przypadki** — np.
tytuł „Bóg" znajdzie też „Boże", „Boga", „Bogu", „Bogiem") → zaznacz
fragmenty i dodaj do tej samej kolejki modlitwy co w Podręczniku i w
przeglądarce Biblii.

**Techniczna ciekawostka:** w JavaScript `\w` (używane zwykle do
dopasowywania końcówek odmiany) nie obejmuje polskich znaków
diakrytycznych (ą, ć, ę, ł, ń, ó, ś, ź, ż) — bez poprawki dopasowanie
urywałoby się w połowie słowa. Naprawione przez własną klasę znaków.

## Oczyszczone dane (usunięte zaślepki)

W treściach modlitewnych (`podrecznik.json`) było kilka niedokończonych,
testowych wpisów zamiast prawdziwych cytatów biblijnych — usunięte:
- Sekcje **„Słuchanie"** i **„Prośby"** (`adoracja3`, `adoracja4`) — w całości
  zaślepki („This is a quotation about..."), bez prawdziwej treści. Usunięte
  razem z odpowiadającymi im przyciskami w interfejsie (Podręcznik ma teraz
  tylko 2 działające sekcje: Adorację i Proklamację, zamiast 4 — dwie z nich
  nigdy nie miały prawdziwej treści).
- 3 podsekcje w „Kim Ty Jesteś dla mnie" (Bogiem który jest blisko / słucha /
  wysłuchuje modlitw) — same zaślepki, usunięte.
- 4 duplikaty tego samego wersetu (Ps 17,8) w sekcji „Bogiem który jest
  obecny" — zredukowane do jednego wystąpienia.
- 1 wpis bez treści (referencja Ps 145,17 bez cytatu) w sekcji „Łaskawy".

Jeśli kiedyś zechcesz uzupełnić prawdziwą treścią sekcje Dziękczynienia i
Próśb, wystarczy dodać dane do `podrecznik.json` i przywrócić kafelki w
`PodrecznikScreen.tsx`.

## Co zostało poprawione względem oryginału

- **Appka działa offline.** Oryginał pobierał treści modlitewne z `jsonblob.com`
  (darmowy, tymczasowy serwis do wklejania JSON-a) — ryzykowne dla produkcji.
  Tutaj dane (`src/data/podrecznik.json`) są **wbudowane w appkę**, więc działa
  bez internetu i nie zależy od zewnętrznego serwisu.
- **Usunięte błędy crashujące appkę.** W oryginalnym kodzie strony Adoracji i
  Wstępu rzucały `throw new Error('Method not implemented.')` przy wejściu —
  natychmiast się wywalały. Tu te ekrany działają poprawnie.
- **Usunięte resztki domyślnego szablonu Ionica** (strona `folder/inbox`,
  menu z ikonami "mail/archive/trash" niepasującymi do appki).
- **Zapis formularzy działa na telefonie** — `localStorage` zastąpiony przez
  `AsyncStorage` (prawdziwe trwałe storage na urządzeniu).

## Wymagania

- [Node.js](https://nodejs.org) (LTS)
- Telefon z zainstalowaną aplikacją **Expo Go** (Android: Google Play, iOS: App Store)
  — lub Android Studio / Xcode, jeśli wolisz emulator

## Uruchomienie (podgląd na telefonie w 2 minuty)

```bash
npm install
npx expo install --fix    # dopasowuje wersje pakietów do Twojego SDK Expo
npx expo start
```

Zeskanuj wyświetlony kod QR aplikacją **Expo Go** na telefonie — appka się
otworzy. Zmiany w kodzie pojawiają się na telefonie na żywo (Fast Refresh).

> **Uwaga (iOS):** Expo Go na iOS bywa okresowo niedostępny w App Store przy
> premierach nowych wersji SDK. Jeśli nie możesz go znaleźć/zainstalować,
> przetestuj najpierw na Androidzie, albo zbuduj tzw. development build
> (`npx expo run:ios`, wymaga Maca z Xcode) — wtedy nie potrzebujesz Expo Go wcale.

## Zbudowanie prawdziwej apki na telefon (.apk / .aab / .ipa)

Do publikacji w sklepach (lub instalacji "na sztywno" na telefonie, bez Expo Go)
służy **EAS Build** — buduje appkę w chmurze, bez potrzeby instalowania
Android Studio czy Xcode lokalnie:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # albo --platform ios / --platform all
```

Po zbudowaniu dostaniesz link do pobrania gotowego pliku instalacyjnego.

## Muzyka w tle podczas świecy

Ekran „Wybrane Fragmenty" (świeca + licznik czasu) odtwarza cichą muzykę
instrumentalną w tle (`assets/ambient_candle.mp3` — „The Mountain", ~99s,
dostarczona przez Ciebie). Głośność ustawiona na 35%, żeby nie zagłuszać
modlitwy, i zapętlona automatycznie. Przycisk 🔊/🔇 w lewym dolnym rogu
wideo pozwala ją wyciszyć.

**Gra tylko gdy ten ekran jest aktywny** — jak tylko przejdziesz „Dalej" do
formularza (albo wrócisz „Wstecz"), muzyka automatycznie się zatrzymuje.

**Naprawiony crash przy "Wstecz":** `expo-audio` automatycznie zwalnia
natywny odtwarzacz przy odmontowaniu ekranu (np. właśnie przy "Wstecz").
Jeśli kod próbował potem wywołać `.pause()` na już zwolnionym obiekcie,
aplikacja się wywalała (`ERR_USING_RELEASED_SHARED_OBJECT`). Owinięte teraz
w `try/catch` w `SelectedItemsScreen.tsx`.

## Wspólny "koszyk" wybranych fragmentów

Wybór fragmentów działa teraz jako **jeden, wspólny koszyk dla całej
appki** (`src/context/SelectionContext.tsx`) — wcześniej Adoracja i
Proklamacja dzieliły wybór tylko dlatego, że żyły w tym samym komponencie
(`PodrecznikScreen`), a Imiona i tytuły Boga oraz Biblia miały osobne, lokalne
listy. Teraz zaznaczenie wersetu w dowolnym miejscu (Adoracja, Proklamacja,
Imiona i tytuły Boga, Biblia — szukaj lub przeglądaj) trafia do tej samej
puli, więc możesz np. zaznaczyć coś w Adoracji, przejść do Imion i tytułów
Boga, dodać kolejne, i wszystko razem trafi na ekran modlitwy.

## Ujednolicony format odnośników (sigli)

Dane Adoracji/Proklamacji (`podrecznik.json`) miały inny format niż reszta
appki na dwóch płaszczyznach:
1. Dwukropek zamiast przecinka (`2:3` zamiast `2,3`) i niechlujne skróty
   (małe litery, dodatkowe spacje: „kol ", „Ps ") — naprawione (117 wpisów).
2. **Skróty ksiąg zamiast pełnych nazw** — Biblia i „Imiona i tytuły Boga"
   zawsze pokazują pełną nazwę („Księga Izajasza"), a Adoracja/Proklamacja
   pokazywała skrót („Iz"). Zamienione (118 wpisów) na pełne nazwy z tego
   samego źródła (`biblia_books.json`), więc teraz wszędzie w appce widać
   dokładnie ten sam styl: „Księga Izajasza 4,2", „List do Kolosan 2,3".

## Dostęp do Historii Dziennika

„Historia Dziennika" jest teraz **pierwszą pozycją w Podręczniku** —
dostępna od razu z głównego menu, bez konieczności przechodzenia przez całą
modlitwę i formularz, żeby zobaczyć wcześniejsze zapisy.

## Dziennik Modlitwy (przebudowany formularz)

Dawny „Mój Formularz" (Imię, Email, Co, Kto, Kiedy — pola bez związku z resztą
appki) zamieniony na prawdziwy **dziennik modlitwy**:
- **Data** — zapisuje się automatycznie (dziś, po polsku, np. „3 lipca 2026").
- **Notatki** — wolne pole tekstowe („Co Bóg dziś do mnie powiedział?").
- **Światła zewnętrzne** (wydarzenia) i **Światła wewnętrzne** (poruszenia
  wewnętrzne) — dwa dodatkowe pola, terminologia ignacjańska z rachunku
  sumienia/kierownictwa duchowego.
- **Fragmenty użyte do modlitwy** — automatycznie pobrane ze wspólnego
  koszyka (`SelectionContext`) — dokładnie te, które przed chwilą wybrałeś
  do modlitwy. Zapisywane są **same odnośniki** (np. „Księga Psalmów 23,1"),
  nie treść wersetu. Każdy fragment ma checkbox — możesz odznaczyć te,
  których nie chcesz zapisywać w dzienniku.
- Po zapisaniu koszyk się **czyści** — kolejna modlitwa zaczyna się od zera.
- Historia (`FormHistoryScreen`) pokazuje wpisy od najnowszego, z datą,
  notatkami, światłami i „chipami" odnośników.

**Klikalne odnośniki w historii** — każdy zapisany odnośnik (np. „Księga
Izajasza 4,2") jest teraz przyciskiem, który otwiera **dokładnie tę księgę
i rozdział** w ekranie Biblii (deep-link przez parametry nawigacji
`{ openBook, openChapter }`). Dla zakresów (np. „103,8-17") otwiera się
właściwy rozdział, bez podświetlania konkretnego zakresu wersetów.

## Struktura nawigacji

**Dolny pasek zakładek** (widoczny zawsze, na każdym ekranie) - trzy:
- **Główna** (📖) — ekran startowy, opisany niżej.
- **Start** (🔥) — skrót **bezpośrednio do ekranu ze świecą i licznikiem
  czasu**, z tym, co akurat jest we wspólnym koszyku (może być pusty - nadal
  możesz zapalić świecę i ustawić czas bez wcześniejszego wyboru fragmentów).
  Nazwane "Start" (a nie "Modlitwa"), żeby nie kolidować nazwą z kafelkiem
  "Adoracja"/"Proklamacja" na ekranie głównym.
- **Dziennik** (🕐) — Historia Dziennika, dostępna niezależnie od tego, gdzie
  akurat jesteś.

**Ekran główny (Główna)** pokazuje wprost, bez żadnego pośredniego ekranu,
**6 równych kafelków z ikonami**: **Adoracja**, **Proklamacja**, **Biblia
Tysiąclecia**, **Czytania dnia**, **Imiona i tytuły Boga** (91 tytułów, osobny
ekran) i **Formacja** (Dziennik Nowego Życia, osobny ekran). Pierwsze cztery
przełączają treść na tym samym ekranie (lista fragmentów albo osadzona
przeglądarka Biblii/Czytań) - dawniej żyły na osobnym ekranie "Wybierz
fragmenty"/"Fragmenty do modlitwy", zlikwidowanym jako zbędny dodatkowy klik,
skoro i tak nie grupował niczego poza samą listą kafelków. "Wstęp" i
przełącznik trybu ciemnego są dostępne z ikon w prawym górnym rogu nagłówka.

## Odmawianie fragmentów podczas modlitwy (świeca)

Każdy wybrany fragment na ekranie świecy można teraz **dotknąć, żeby go
"odmówić"** — znika z widoku (z animacją), pokazując ile zostało
(„Zostało 3 z 5"). Gdy odmówisz wszystkie, appka **automatycznie przenosi
do „Dziennika Modlitwy"** (formularza zapisu).

Ważny szczegół projektowy: odklikiwanie na tym ekranie jest **lokalne dla
tej sesji** i NIE usuwa fragmentów ze wspólnego koszyka (`SelectionContext`)
— dzięki temu „Dziennik Modlitwy" zawsze ma dostęp do **pełnej, oryginalnej
listy** fragmentów do zapisania, niezależnie od tego, które już odmówiłeś.

Na ekranach z wyborem fragmentów (Imiona i tytuły Boga, Biblia — tryb
przeglądania) przycisk **„Modlitwa"** jest z lewej (drugorzędny, obrys),
przycisk **„Dodaj i wybierz więcej ›"** z prawej (wyraźny, wypełniony
kolorem — główna akcja).

**Klikalne odnośniki w Historii Dziennika prowadzą teraz dokładnie do
wersetu**, nie tylko do początku rozdziału — appka automatycznie przewija
listę wersetów i na 4 sekundy podświetla dokładnie ten werset. Dla zakresów
(np. „8-17") podświetla i przewija do pierwszego wersetu zakresu, bez
podświetlania całego zakresu.

**Format numeru wersetu** ujednolicony wszędzie w appce: „59, 6" zamiast
„59,06" — usunięte zbędne zero wiodące, dodana spacja po przecinku (czysto
kosmetyczna zmiana wyświetlania, nie dotyka zapisanych/przechowywanych
danych).

## Struktura projektu

```
App.tsx                      ← Bottom Tabs (Główna/Dziennik) + Stack w środku Głównej
src/
  types.ts                   ← typy danych i nawigacji
  context/ThemeContext.tsx   ← jasny/ciemny motyw (zamiast ThemeService)
  services/formDataService.ts← zapis formularzy (AsyncStorage)
  data/podrecznik.json       ← treści modlitewne, wbudowane w appkę
  data/biblia.json           ← pełny tekst Biblii Tysiąclecia (73 księgi), offline
  data/biblia_books.json     ← nazwy i kolejność ksiąg biblijnych
  data/divineTitles.ts       ← 91 imion/tytułów Boga, Jezusa, Ducha Świętego
  services/bibliaService.ts  ← wyszukiwanie/sortowanie ksiąg i wersetów
  services/divineTitlesService.ts ← wyszukiwanie fragmentów dla tytułu
  components/
    CountdownTimer.tsx        ← licznik czasu modlitwy
  screens/
    HomeScreen.tsx            ← ekran startowy: 6 kafelków + wybór fragmentów
    WstepScreen.tsx
    BibliaScreen.tsx           ← przeglądarka Biblii: szukaj/sortuj księgi i wersety
    DivineTitlesScreen.tsx     ← 91 imion/tytułów Boga → fragmenty → wybór do modlitwy
    SelectedItemsScreen.tsx   ← wybrane fragmenty + wideo świecy + licznik
    MyFormScreen.tsx          ← formularz refleksji
    FormHistoryScreen.tsx     ← historia zapisanych formularzy
assets/
  candle.mp4                  ← wideo świecy (przeniesione z oryginału)
  icon.png, splash.png, adaptive-icon.png  ← PLACEHOLDERY, podmień na własne
```

## Co warto zrobić dalej

- Podmienić `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png`
  na własne grafiki (te są tylko prostym placeholderem w stylu "płomień świecy").
- Dodać prawdziwą walidację formularza (np. format adresu email).
- Jeśli appka ma się rozrastać, rozważyć przejście z `@react-navigation` na
  Expo Router (nawigacja oparta o strukturę plików) — łatwiej skaluje się
  na duże aplikacje z wieloma ekranami.
