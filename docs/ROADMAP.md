# Podręcznik Modlitwy: mapa rozwoju i stan prac

Ostatnia aktualizacja: 2026-10-13

## Założenia
- **Nazwa:** „Podręcznik Modlitwy”. Identyfikator aplikacji `com.podrecznik.adoracji` zostaje bez zmian,
  bo jego zmiana oznacza nową aplikację na telefonie i utratę lokalnego dziennika.
- **Odbiorcy (ścieżka C):** najpierw zamknięta wspólnota (kody zaproszeń), później publicznie w sklepach.
- **Dziennik zostaje tylko na telefonie**, bez chmury. Ochronę przed utratą daje kopia zapasowa do pliku.
- **Sposób pracy:** każda funkcja osobno: projekt → akceptacja → kod → przegląd → test na telefonie.

## Zrobione
| Funkcja | Commit | Test na telefonie |
|---|---|---|
| Zmiana nazwy na „Podręcznik Modlitwy” | `0dd0a30` | ❌ do sprawdzenia |
| Kopia zapasowa dziennika do pliku (eksport/import, scalanie bez nadpisywania) | `3bd32a7` | ❌ do sprawdzenia |
| Postęp Formacji: karta „Kontynuuj”, paski postępu, ✓ przy ukończonych dniach i tygodniach | `59dcd89` | ❌ do sprawdzenia |
| Przypomnienia: Czytania dnia, Formacja, Adoracja (godzina + dni tygodnia) | `5101f5e`..`e4b5857` | ❌ do sprawdzenia |
| Strona główna: 4 kafelki (2×2), Biblia i Czytania dnia połączone w „Słowo Boże” z przełącznikiem | `625f08f` | ❌ do sprawdzenia |

Specyfikacja i plan przypomnień: `docs/superpowers/specs/2026-10-12-przypomnienia-design.md`,
`docs/superpowers/plans/2026-10-12-przypomnienia.md`.

## Następny krok
1. **Zbudować APK i przetestować wszystko powyżej na telefonie:**
   ```
   npx eas-cli build --platform android --profile preview
   ```
   - nazwa w nagłówku,
   - kopia: eksport → usunięcie wpisu → import (wpis wraca, duplikaty pominięte),
   - Formacja: otwarcie dnia → karta „Kontynuuj”; odhaczenie wszystkich zadań → ✓ i przejście do następnego dnia,
   - przypomnienia: przypomnienie za 2 minuty, aplikacja zamknięta → stuknięcie otwiera właściwy ekran;
     wylogowany → Formacja pokazuje logowanie; odznaczony dzień → brak powiadomienia,
   - strona główna: 4 kafelki; „Słowo Boże” otwiera Czytania dnia, przełącznik przechodzi do Biblii;
     przypomnienie „Czytania dnia” nadal otwiera czytania.
2. **Kolejna funkcja (propozycja): Examen wieczorny.**

## Drobiazgi odłożone z przeglądu przypomnień
- Komunikat „Powiadomienia są wyłączone” nie znika od razu po powrocie z ustawień telefonu
  (trzeba wejść na ekran ponownie). Przypomnienia przeplanują się dopiero po ponownym uruchomieniu aplikacji.
- `toggleEnabled` w `RemindersScreen.tsx` korzysta ze stanu sprzed pytania o zgodę: szybkie klikanie może zgubić jedną zmianę.
- Uszkodzony zapis może pokazać włączone przypomnienie bez dni (`normalizeReminderSettings`: `enabled && weekdays.length > 0`).
- Stuknięcie w przypomnienie Formacji najpierw pokazuje listę, potem dzień.
- Zegar na Androidzie może otworzyć się ponownie przy odświeżeniu ekranu (`onTimePicked` w `useCallback`).
- Kod sprzed tych zmian: `AuthContext.tsx`, `getSession()` bez obsługi błędu.
  Jeśli sesja się nie wczyta, stuknięcia w przypomnienia nie zadziałają.

## Dalsza mapa
1. Examen wieczorny (prowadzony formularz w dzienniku i przypomnienie).
2. Prowadzona adoracja: uwielbienie → Słowo → cisza → dziękczynienie.
3. Śpiewnik uwielbienia (teksty pieśni mają prawa autorskie, przed publikacją do sprawdzenia).
4. Biblia: zakładki, podkreślenia, notatki do wersetów, plan czytania, werset dnia (widżet).
5. Grupy wspólnoty: prowadzący widzi postęp za zgodą uczestników. Bez treści dziennika.
6. **Przed publikacją w sklepach:** zgoda Pallottinum na Biblię Tysiąclecia (albo inny przekład), brakujące
   rozdziały 1–10 Księgi Estery, polityka prywatności (RODO), otwarta rejestracja obok kodów, zgoda na
   korzystanie z czytań z paulus.org.pl (albo inne źródło).

## Inne
- Intencje modlitewne: odrzucone (2026-10-13), nie wracamy do nich.
- Podgląd w przeglądarce (`npx expo start --web`) wyłącza się na przypomnieniach
  (`useLastNotificationResponse` w `App.tsx` nie działa na webie). Na telefonie to nie przeszkadza.
- Foldery `formacja 1 rok/` i `formacja 3rok/` (źródłowe zeszyty) nie są w repozytorium.
