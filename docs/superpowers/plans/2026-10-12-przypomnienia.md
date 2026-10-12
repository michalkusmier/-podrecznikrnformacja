# Przypomnienia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lokalne, tygodniowe przypomnienia (Czytania dnia, Formacja, Adoracja) z ekranem ustawień i otwieraniem właściwego ekranu po stuknięciu.

**Architecture:** `reminderService.ts` trzyma ustawienia w AsyncStorage i zamienia je czystą funkcją `planReminders` na listę powiadomień planowanych przez `expo-notifications` (wyzwalacz WEEKLY). `RemindersScreen` edytuje ustawienia. `App.tsx` synchronizuje plan przy starcie i obsługuje stuknięcie przez `navigationRef`.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, `expo-notifications`, `@react-native-community/datetimepicker`, AsyncStorage, React Navigation 7.

**Spec:** `docs/superpowers/specs/2026-10-12-przypomnienia-design.md`

## Global Constraints
- Repo nie ma frameworka testów: testy czystych funkcji to jednorazowe skrypty node w katalogu scratchpad (wzór: transpilacja przez `node_modules/typescript` + `Module._compile`, jak przy `journalBackupService`). Nie dodajemy jest/vitest.
- Każde zadanie kończy się `npx tsc --noEmit` bez błędów.
- Teksty UI i komentarze po polsku, styl komentarzy jak w istniejących plikach.
- Domyślnie: wszystko wyłączone, wszystkie dni; Czytania 6:30, Formacja 7:00, Adoracja 20:00.
- Treść: Czytania dnia / „Słowo Boże na dziś czeka na Ciebie.”; Formacja / „Czas na Formację. Kontynuuj swój dzień.”; Czas na modlitwę / „Zatrzymaj się na chwilę z Panem.”
- `weekdays` w ustawieniach: 1 = poniedziałek … 7 = niedziela. expo-notifications WEEKLY: 1 = niedziela … 7 = sobota.
- Kolory wyłącznie z `useAppTheme().colors`.

## Review Focus
- Zimny start z powiadomienia: nawigacja przed `navigationRef.isReady()` lub przed końcem `auth.loading` nie może zginąć ani się wysypać (Task 3).
- Ta sama odpowiedź na powiadomienie nie może nawigować drugi raz po ponownym renderze `App` (Task 3, zapamiętany `identifier`).
- Uszkodzony lub częściowy JSON w `reminderSettings` (np. stara wersja bez `adoracja`) → domyślne wartości per pole (test w Task 1).
- Odznaczenie ostatniego dnia → przypomnienie wyłączone i nic nie zaplanowane (test w Task 1 dla `planReminders`; zachowanie w UI w Task 2).
- Odmowa zgody → włącznik wraca do „wyłączone”, nic się nie planuje (Task 2).

---

### Task 1: Serwis przypomnień + zależności

**Files:**
- Create: `src/services/reminderService.ts`
- Modify: `package.json`, `package-lock.json`, `app.json` (przez `npx expo install`)
- Test: `<scratchpad>/test_reminders.js`

**Interfaces:**
- Produces:
  - `type ReminderKind = 'czytania' | 'formacja' | 'adoracja'`
  - `interface ReminderSetting { enabled: boolean; hour: number; minute: number; weekdays: number[] }`
  - `type ReminderSettings = Record<ReminderKind, ReminderSetting>`
  - `const REMINDER_KINDS: ReminderKind[]` (kolejność: czytania, formacja, adoracja)
  - `const REMINDER_LABELS: Record<ReminderKind, string>` („Czytania dnia”, „Formacja”, „Adoracja / modlitwa”)
  - `const DEFAULT_REMINDER_SETTINGS: ReminderSettings`
  - `function normalizeReminderSettings(raw: unknown): ReminderSettings` (czysta)
  - `interface PlannedReminder { kind: ReminderKind; expoWeekday: number; hour: number; minute: number; title: string; body: string }`
  - `function planReminders(settings: ReminderSettings): PlannedReminder[]` (czysta)
  - `async getReminderSettings(): Promise<ReminderSettings>`, `async saveReminderSettings(s: ReminderSettings): Promise<void>`
  - `async ensureNotificationPermission(): Promise<'granted' | 'denied'>` (pyta, jeśli jeszcze nie pytano)
  - `async hasNotificationPermission(): Promise<boolean>` (nie pyta)
  - `async syncScheduledReminders(settings: ReminderSettings): Promise<void>` (rzuca przy błędzie planowania)

- [ ] **Step 1:** `npx expo install expo-notifications @react-native-community/datetimepicker`. Sprawdź w `node_modules/expo-notifications/build/Notifications.types.d.ts` numerację `weekday` w `WeeklyTriggerInput` (oczekiwane: 1 = niedziela) i nazwę `SchedulableTriggerInputTypes.WEEKLY`.
- [ ] **Step 2: Test (fail)** w `test_reminders.js`, transpilując `reminderService.ts` i podmieniając `require` modułów expo i AsyncStorage na `{}`:
  - `planReminders(DEFAULT_REMINDER_SETTINGS)` → `[]`
  - formacja enabled, weekdays `[1..7]` → 7 wpisów, wszystkie `hour 7, minute 0, title 'Formacja'`
  - weekdays `[1]` (pn) → `expoWeekday === 2`; `[7]` (nd) → `expoWeekday === 1`
  - enabled z `weekdays: []` → `[]`
  - `normalizeReminderSettings(null)` deepEqual `DEFAULT_REMINDER_SETTINGS`
  - `normalizeReminderSettings({ formacja: { enabled: true, hour: 9, minute: 15, weekdays: [1,3] } })` → formacja zachowana, czytania/adoracja domyślne
  - `normalizeReminderSettings({ formacja: { enabled: true, hour: 99, weekdays: [0, 8, 'x'] } })` → godzina domyślna, `weekdays` odfiltrowane do `[]`
  - Uruchom: `node <scratchpad>/test_reminders.js` → FAIL (brak pliku).
- [ ] **Step 3:** Zaimplementuj `reminderService.ts`. AsyncStorage klucz `reminderSettings`. `syncScheduledReminders`: na Androidzie `setNotificationChannelAsync('przypomnienia', { name: 'Przypomnienia', importance: DEFAULT })`, potem `cancelAllScheduledNotificationsAsync()`, potem `scheduleNotificationAsync` dla każdego `PlannedReminder` z `trigger: { type: WEEKLY, weekday, hour, minute, channelId: 'przypomnienia' }` i `content.data = { reminderKind }`.
- [ ] **Step 4:** `node <scratchpad>/test_reminders.js` → `ALL OK`; `npx tsc --noEmit` → bez błędów.
- [ ] **Step 5: Commit** `Add reminder settings and scheduling service`.

### Task 2: Ekran „Przypomnienia”

**Files:**
- Create: `src/screens/RemindersScreen.tsx`
- Modify: `src/types.ts` (`MainStackParamList.Reminders: undefined`), `App.tsx` (trasa `Reminders`, tytuł „Przypomnienia”; ikona `notifications-outline` w `headerRight` Home przed księżycem, `accessibilityLabel="Przypomnienia"`)

**Interfaces:**
- Consumes: wszystko z Task 1.

- [ ] **Step 1:** Ekran: ładuje `getReminderSettings()`; ScrollView z kartą na każdy `REMINDER_KINDS`: tytuł + `Switch`, przycisk z godziną `HH:MM` otwierający `DateTimePicker` (`mode="time"`, `is24Hour`), 7 przycisków dni `Pn Wt Śr Cz Pt So Nd` (zaznaczony = tło `colors.primary`) i skróty „Codziennie” / „Pn–Pt”.
- [ ] **Step 2:** Każda zmiana → `apply(next)`: `saveReminderSettings(next)`, potem `syncScheduledReminders(next)` w try/catch → przy błędzie komunikat „Nie udało się ustawić przypomnienia”. Odznaczenie ostatniego dnia ustawia `enabled: false`.
- [ ] **Step 3:** Włączenie przełącznika: najpierw `ensureNotificationPermission()`. `'denied'` → nie włączaj i pokaż na ekranie komunikat „Powiadomienia są wyłączone w ustawieniach telefonu” z przyciskiem „Otwórz ustawienia” (`Linking.openSettings()`). Przy wejściu na ekran, gdy coś jest włączone, a `hasNotificationPermission()` zwraca false, ten sam komunikat.
- [ ] **Step 4:** `npx tsc --noEmit` → bez błędów.
- [ ] **Step 5: Commit** `Add reminders settings screen`.

### Task 3: Stuknięcie w powiadomienie i synchronizacja przy starcie

**Files:**
- Create: `src/navigation/handleReminderTap.ts`
- Modify: `src/types.ts` (`Home: { resetAt?: number; openSection?: 'adoracja' | 'czytania'; openAt?: number } | undefined`), `src/screens/HomeScreen.tsx`, `App.tsx`

**Interfaces:**
- Consumes: `ReminderKind`, `getReminderSettings`, `hasNotificationPermission`, `syncScheduledReminders` (Task 1); `findContinueTarget` (`src/data/formacja.ts`), `getAllCompletedCounts`, `getLastOpenedDay` (`src/services/formacjaService.ts`), `navigationRef` (`src/navigation/navigationRef.ts`).
- Produces: `async handleReminderTap(kind: ReminderKind, loggedIn: boolean): Promise<void>`

- [ ] **Step 1:** `handleReminderTap`:
  - `czytania` / `adoracja` → `navigationRef.navigate('GlownaTab', { screen: 'Home', params: { openSection: kind, openAt: Date.now() } })`.
  - `formacja` → jeśli `loggedIn` i `findContinueTarget(await getLastOpenedDay(), await getAllCompletedCounts())` zwraca cel: najpierw `Formacja`, potem `FormacjaDay { weekId, dayId }` (żeby „Wstecz” wracało na listę), np. przez `navigationRef.dispatch(CommonActions.reset(...))` na stosie `GlownaTab` = `[Home, Formacja, FormacjaDay]`. W przeciwnym razie `GlownaTab → Formacja`.
- [ ] **Step 2:** `HomeScreen`: `useRef` z ostatnio obsłużonym `openAt`. W istniejącym `useFocusEffect` (zależnym od `route.params?.openAt`), gdy `openAt` jest nowy: ustaw `currentSection` na `openSection` (`'adoracja'` → `ADORACJA_KEY`, `'czytania'` → `CZYTANIA_SECTION_KEY`) zamiast resetu. Efekt `resetAt` bez zmian (późniejsze kliknięcie „Główna” nadal zwija).
- [ ] **Step 3:** `App.tsx`:
  - na poziomie modułu `Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) })`,
  - w komponencie wewnątrz `AuthProvider` i `NavigationContainer` (`ReminderBridge`, renderuje `null`): przy montowaniu `if (await hasNotificationPermission()) syncScheduledReminders(await getReminderSettings()).catch(console.error)`,
  - `const response = Notifications.useLastNotificationResponse()`; gdy jest, `!auth.loading` i `navigationRef.isReady()`, a `response.notification.request.identifier` różni się od zapamiętanego w `useRef` → zapamiętaj i `handleReminderTap(data.reminderKind, !!session)`. Gdy nawigacja jeszcze nie jest gotowa, ponów przez `onReady` w `NavigationContainer` (stan `navReady`).
- [ ] **Step 4:** `npx tsc --noEmit` → bez błędów.
- [ ] **Step 5: Commit** `Open the right screen when a reminder is tapped`.

### Task 4: Weryfikacja na telefonie + README

**Files:** Modify: `README.md` (sekcja „Nowość: przypomnienia” obok sekcji o kopii zapasowej)

- [ ] **Step 1:** README: co robi ekran, gdzie jest dzwonek, że trzeba udzielić zgody, że działa bez internetu.
- [ ] **Step 2:** Commit `Document reminders`, `git push` (za zgodą użytkownika), nowy APK: `npx eas-cli build --platform android --profile preview`.
- [ ] **Step 3:** Na telefonie (wykonuje użytkownik): scenariusze 1–4 z sekcji „Testowanie” w specyfikacji.
