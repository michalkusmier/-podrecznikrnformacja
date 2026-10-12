# Przypomnienia: specyfikacja

Data: 2026-10-12 · Status: do przeglądu

## Cel
Formacja, modlitwa i czytania to codzienny rytm. Aplikacja ma przypominać o nich o wybranej godzinie
w wybrane dni tygodnia. Stuknięcie w powiadomienie prowadzi prosto do właściwego miejsca w aplikacji.

### Decyzje użytkownika
- Trzy rodzaje przypomnień: **Formacja**, **Adoracja / modlitwa**, **Czytania dnia**. Bez wieczornego
  dziennika/examenu, bo examenu jeszcze nie ma.
- Każde przypomnienie ma: **włącznik + jedną godzinę + dni tygodnia**.
- Powiadomienia **lokalne**: planuje je telefon, bez serwera i bez internetu.

### Poza zakresem
Kilka godzin dla jednego przypomnienia, zmienna treść powiadomień (np. tytuł dnia Formacji), przypomnienie
o examenie, powiadomienia push z serwera, iOS-owe szczegóły publikacji.

## Doświadczenie użytkownika

### Ekran „Przypomnienia”
- Wejście: ikona dzwonka (`notifications-outline`) w nagłówku ekranu startowego, obok przełącznika
  motywu i pomocy (`App.tsx`, `headerRight` ekranu `Home`). Nowa trasa `Reminders` w `MainStackParamList`.
- Trzy karty w kolejności: Czytania dnia, Formacja, Adoracja / modlitwa. Każda karta zawiera:
  - tytuł i włącznik (`Switch`),
  - godzinę jako przycisk otwierający systemowy zegar (`@react-native-community/datetimepicker`, tryb `time`, 24 h),
  - 7 przycisków dni (Pn Wt Śr Cz Pt So Nd) oraz skróty „Codziennie” i „Pn–Pt”.
- Domyślne ustawienia: wszystkie **wyłączone**, wszystkie dni zaznaczone, godziny: Czytania 6:30,
  Formacja 7:00, Adoracja 20:00.
- Włączone przypomnienie bez żadnego dnia nie ma sensu: przy odznaczeniu ostatniego dnia przypomnienie
  wyłącza się samo.
- Każda zmiana zapisuje się od razu (bez przycisku „Zapisz”) i od razu przeplanowuje powiadomienia.

### Zgoda na powiadomienia
- O zgodę pytamy dopiero przy **pierwszym włączeniu** któregoś przypomnienia, nie przy starcie aplikacji.
- Odmowa: włącznik wraca do „wyłączone”, a ekran pokazuje komunikat „Powiadomienia są wyłączone w
  ustawieniach telefonu” z przyciskiem otwierającym ustawienia aplikacji (`Linking.openSettings()`).

### Treść powiadomień (stała)
| Rodzaj | Tytuł | Treść |
|---|---|---|
| Czytania dnia | Czytania dnia | Słowo Boże na dziś czeka na Ciebie. |
| Formacja | Formacja | Czas na Formację. Kontynuuj swój dzień. |
| Adoracja | Czas na modlitwę | Zatrzymaj się na chwilę z Panem. |

### Stuknięcie w powiadomienie
- **Czytania dnia** → ekran startowy z otwartą sekcją Czytania dnia.
- **Adoracja** → ekran startowy z otwartą sekcją Adoracja.
- **Formacja** → jeśli jest sesja Supabase i `findContinueTarget` zwraca dzień: od razu ten dzień
  (`FormacjaDay`). W przeciwnym razie lista Formacji, która sama pokazuje logowanie, więc blokada zostaje zachowana.
- Działa przy aplikacji otwartej, w tle i całkowicie zamkniętej (zimny start).

## Architektura

### Nowe pliki
- `src/services/reminderService.ts`
  - Typy: `ReminderKind = 'czytania' | 'formacja' | 'adoracja'`, `ReminderSetting { enabled, hour, minute, weekdays: number[] }`
    (`weekdays`: 1 = poniedziałek … 7 = niedziela), `ReminderSettings = Record<ReminderKind, ReminderSetting>`.
  - `DEFAULT_REMINDER_SETTINGS`, `getReminderSettings()` i `saveReminderSettings()` (AsyncStorage, klucz `reminderSettings`;
    brakujące lub uszkodzone pola uzupełniane domyślnymi).
  - **Czysta** `planReminders(settings)` → lista `{ kind, weekday, hour, minute, title, body }`: jeden wpis na każdy
    wybrany dzień włączonego przypomnienia.
  - `syncScheduledReminders(settings)`: kasuje wszystkie zaplanowane powiadomienia tej aplikacji
    (`cancelAllScheduledNotificationsAsync`, bo aplikacja nie ma innych lokalnych powiadomień) i planuje od nowa
    według `planReminders`, z wyzwalaczem tygodniowym (`SchedulableTriggerInputTypes.WEEKLY`; uwaga na numerację dni
    w expo-notifications: 1 = niedziela, więc wymagana konwersja). `data: { reminderKind }`.
  - `ensureNotificationPermission()` → `'granted' | 'denied'`.
  - Android: kanał powiadomień `przypomnienia` („Przypomnienia”, ważność domyślna) tworzony przed planowaniem.
- `src/screens/RemindersScreen.tsx`: ekran opisany wyżej.
- `src/navigation/handleReminderTap.ts`: `handleReminderTap(kind, session)` nawiguje przez istniejący `navigationRef`
  (`src/navigation/navigationRef.ts`).

### Zmiany w istniejących plikach
- `App.tsx`:
  - trasa `Reminders` i ikona dzwonka w nagłówku `Home`,
  - `Notifications.setNotificationHandler` (pokazuj baner także przy otwartej aplikacji),
  - przy starcie `syncScheduledReminders(await getReminderSettings())`, tylko gdy zgoda jest już udzielona
    (bez pytania o nią),
  - obsługa stuknięcia: `Notifications.useLastNotificationResponse()` + czekanie na `navigationRef.isReady()`
    i na zakończenie ładowania sesji (`useAuth().loading`). Każda odpowiedź obsługiwana raz
    (zapamiętany `identifier`).
- `src/types.ts`: `Home` przyjmuje dodatkowo `{ openSection?: 'adoracja' | 'czytania'; openAt?: number }`, dochodzi `Reminders: undefined`.
- `src/screens/HomeScreen.tsx`: obsługa `openSection` + `openAt`. Obecny `useFocusEffect` resetuje sekcję przy
  każdym wejściu, więc otwarcie sekcji z parametru musi nastąpić **po** tym resecie: w tym samym efekcie, gdy
  `openAt` jest nowy (różny od ostatnio obsłużonego, trzymanego w `useRef`), ustawiamy sekcję zamiast ją kasować.
  Analogicznie efekt `resetAt` nie może skasować sekcji otwartej z powiadomienia.
- `app.json`: plugin `expo-notifications` (dodawany przez `npx expo install`).

### Zależności
`npx expo install expo-notifications @react-native-community/datetimepicker`. To moduły natywne, więc
potrzebny jest nowy build APK.

## Obsługa błędów
- Błąd odczytu ustawień → domyślne (wszystko wyłączone), bez awarii.
- Błąd planowania → `console.error` i komunikat na ekranie „Nie udało się ustawić przypomnienia”. Ustawienia
  zostają zapisane, a przy następnym starcie aplikacji `sync` spróbuje ponownie.
- Powiadomienie Formacji, gdy dzień z `findContinueTarget` zniknął z treści → lista Formacji.

## Testowanie
- Jednorazowy skrypt (jak przy kopii zapasowej) dla `planReminders`: wszystko wyłączone → pusta lista;
  włączone z 7 dniami → 7 wpisów; poprawna konwersja dni (poniedziałek → 2 w expo-notifications);
  uszkodzone ustawienia → domyślne.
- `npx tsc --noEmit` bez błędów.
- Na telefonie (nowy APK):
  1. Pierwsze włączenie → pytanie o zgodę. Odmowa → komunikat i przycisk do ustawień.
  2. Przypomnienie na +2 minuty, aplikacja zamknięta → przychodzi, stuknięcie otwiera właściwy ekran
     (dla każdego z trzech rodzajów).
  3. Formacja po wylogowaniu → otwiera się logowanie, a nie dzień.
  4. Wyłączenie przypomnienia / odznaczenie dnia → powiadomienie nie przychodzi.
