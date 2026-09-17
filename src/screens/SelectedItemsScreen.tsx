// src/screens/SelectedItemsScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { usePrayerTimer } from '../context/PrayerTimerContext';
import { formatVerseNumber } from '../utils/formatVerse';
import CountdownTimer from '../components/CountdownTimer';

type Props = NativeStackScreenProps<MainStackParamList, 'SelectedItems'>;

const candleSource = require('../../assets/candle.mp4');
const ambientSource = require('../../assets/ambient_candle.mp3');

// Nagranie świec (candle.mp4) NIE jest spokojną, ciągłą pętlą - w ostatnich
// ~10 sekundach ktoś na filmie faktycznie zdmuchuje świece jedna po drugiej.
// Zwykłe `loop: true` powtarzałoby więc całą sekwencję "płonie -> gaśnie ->
// nagle znów płonie" co ~51 sekund. Zamiast tego zapętlamy programowo tylko
// spokojny, płonący fragment (0 - CANDLE_LOOP_OUT_SECONDS) przez CAŁY czas
// modlitwy, niezależnie od tego, ile zostało na odliczaniu - świeca NIE gaśnie
// sama z końcem czasu. Końcówkę ze zdmuchiwaniem pokazujemy tylko wtedy, gdy
// użytkownik faktycznie wychodzi z tego ekranu (patrz useFocusEffect niżej).
const CANDLE_LOOP_OUT_SECONDS = 41;
// Klatka blisko samego końca nagrania - używana, gdy wychodzimy z tego
// ekranu "do przodu" (np. "Dalej" do Dziennika Modlitwy), żeby ekran
// zostawał na czymś innym niż spokojny, płonący fragment pętli.
const CANDLE_EXTINGUISHED_SECONDS = 50.5;
// UWAGA: w samym nagraniu główna, ostra świeca na pierwszym planie
// NIGDY faktycznie nie gaśnie (sprawdzone klatka po klatce) - gasną tylko
// dwie rozmyte świece w tle, ok. 47-49s. Samo poczekanie na koniec filmu
// więc NIE pokazuje widocznego gaśnięcia. Dlatego "gaśnięcie" po "Dalej"
// symulujemy osobno: przyciemnieniem (fade do czerni) nałożonym na wideo -
// patrz fadeAnim niżej.
// Ile czasu po "Dalej" czekamy z przyciemnieniem, zanim faktycznie
// przejdziemy do Dziennika Modlitwy.
const CANDLE_BLOWOUT_PREVIEW_MS = 1500;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Odpowiednik selected-items-page.component.ts.
// ion-alert z prompt-em na minuty zastąpiony własnym modalem (działa tak samo na iOS i Androidzie).
export default function SelectedItemsScreen({ route, navigation }: Props) {
  const { colors } = useAppTheme();
  const { selectedItems } = route.params;
  const { endTime, startTimer } = usePrayerTimer();

  // Czy modlitwa jest już w toku (np. wracamy na ten ekran po "Wstecz" albo
  // po "Dalej" i powrocie) - jeśli tak, NIE pytamy ponownie o czas i nie
  // zerujemy odliczania, tylko pokazujemy realnie pozostały czas. Liczone
  // tylko raz przy montowaniu - endTime samo w sobie tyka dalej niezależnie.
  const sessionActiveOnMount = endTime !== null && endTime > Date.now();

  const [minutes, setMinutes] = useState(() =>
    sessionActiveOnMount && endTime ? Math.max(1, Math.round((endTime - Date.now()) / 60_000)) : 10
  );
  const [promptVisible, setPromptVisible] = useState(!sessionActiveOnMount);
  const [draftMinutes, setDraftMinutes] = useState('10');
  const [musicOn, setMusicOn] = useState(true);

  // Które fragmenty zostały już "odmówione" (odkliknięte) w TEJ sesji
  // modlitwy - to jest CELOWO osobny, lokalny stan, NIE modyfikujący
  // wspólnego koszyka (SelectionContext). Dzięki temu, gdy dojdziesz do
  // zera, "Dziennik Modlitwy" (MyFormScreen) nadal ma dostęp do PEŁNEJ,
  // oryginalnej listy fragmentów do zapisania - a nie pustego koszyka.
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());
  const remainingCount = selectedItems.length - dismissedIndices.size;

  // Bezwzględny moment zakończenia do wyświetlenia - dopóki modlitwa nie
  // zostanie potwierdzona w modalu (pierwsze wejście na ekran), licznik jest
  // i tak schowany pod modalem, więc to tylko wartość zastępcza.
  const displayEndTime = endTime ?? Date.now() + minutes * 60_000;

  const player = useVideoPlayer(candleSource, (p) => {
    p.loop = false;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });

  // Czy końcowa sekwencja zdmuchiwania świec już wystartowała w TEJ sesji
  // modlitwy - po jej starcie przestajemy ingerować w odtwarzanie i
  // pozwalamy filmowi dograć naturalnie do końca (zgaszone świece).
  const candleTailStartedRef = useRef(false);

  // Nowa sesja modlitwy (albo pierwsze wejście na ekran) - świeca zaczyna
  // płonąć od nowa, od spokojnego początku nagrania.
  useEffect(() => {
    candleTailStartedRef.current = false;
    try {
      player.currentTime = 0;
      player.play();
    } catch (e) {
      // odtwarzacz mógł jeszcze nie być gotowy - nic nie robimy.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime]);

  // Pętla spokojnego fragmentu świecy - działa cały czas, niezależnie od
  // odliczania. candleTailStartedRef blokuje ją tylko wtedy, gdy świeca
  // została celowo zgaszona przy wyjściu z ekranu (patrz useFocusEffect niżej).
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (candleTailStartedRef.current) return;

    if (currentTime >= CANDLE_LOOP_OUT_SECONDS) {
      try {
        player.currentTime = 0;
      } catch (e) {
        // odtwarzacz mógł już zostać zwolniony - ignorujemy.
      }
    }
  });

  // ZNANY PROBLEM Androida (release build) z expo-video: odtwarzacz czasem
  // "zawiesza się" na pierwszej klatce (wygląda jak statyczny obraz), jeśli
  // play() zostanie wywołane zanim natywny widok w pełni się zamontuje - to
  // wyścig, który w Expo Go/trybie deweloperskim zwykle nie występuje.
  // Zapasowe, opóźnione wywołanie play() po faktycznym zamontowaniu
  // widoku to typowe, zalecane obejście tego problemu.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        player.play();
      } catch (e) {
        // odtwarzacz mógł już zostać zwolniony (np. szybkie wyjście z ekranu) - ignorujemy
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delikatna muzyka instrumentalna w tle podczas palącej się świecy - cicha
  // (35% głośności), żeby nie zagłuszać modlitwy. Gra TYLKO gdy ten ekran
  // jest aktywny (na wierzchu): useFocusEffect (nie zwykły useEffect) łapie
  // moment przejścia do formularza czy powrotu "Wstecz" - React Navigation
  // domyślnie nie odmontowuje poprzednich ekranów, więc zwykły useEffect z
  // czyszczeniem tylko przy odmontowaniu nie wystarczyłby, muzyka grałaby
  // dalej w tle po przejściu do formularza.
  const audioPlayer = useAudioPlayer(ambientSource);

  useFocusEffect(
    useCallback(() => {
      try {
        audioPlayer.loop = true;
        audioPlayer.volume = 0.35;
        if (musicOn) {
          audioPlayer.play();
        }
      } catch (e) {
        // Odtwarzacz mógł jeszcze nie być gotowy - nic nie robimy.
      }
      return () => {
        // WAŻNE: expo-audio automatycznie zwalnia natywny odtwarzacz przy
        // odmontowaniu ekranu (np. po "Wstecz" - React Navigation usuwa
        // wtedy ekran ze stosu). Jeśli to zdąży się stać przed tym
        // callbackiem, wywołanie .pause() na już zwolnionym obiekcie
        // rzuca błąd (ERR_USING_RELEASED_SHARED_OBJECT), który bez
        // przechwycenia wywala całą aplikację. Dlatego try/catch jest tu
        // konieczny, nie tylko "dla bezpieczeństwa".
        try {
          audioPlayer.pause();
        } catch (e) {
          // Odtwarzacz już zwolniony - to oczekiwane przy "Wstecz", ignorujemy.
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [musicOn])
  );

  // Przyciemnienie (fade do czerni) nakładane na wideo świecy - jedyny
  // NIEZAWODNY sposób pokazania "gaśnięcia" po "Dalej", bo samo nagranie
  // nigdy nie pokazuje w pełni zgaszonej głównej świecy (patrz komentarz
  // przy CANDLE_EXTINGUISHED_SECONDS wyżej).
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const leaveAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  // Czy właśnie trwa "wyjście" z ekranu (po "Dalej") - blokuje ponowne
  // wciśnięcie przycisku, dopóki nie będzie widać, jak świeca gaśnie.
  const [leaving, setLeaving] = useState(false);

  // Świeca gaśnie/pali się w zależności od tego, czy ten ekran jest aktywny -
  // React Navigation nie odmontowuje go po "Dalej" (tylko chowa pod
  // Dziennikiem Modlitwy), więc bez tego świeca paliłaby się dalej w tle.
  // Przy powrocie fokusu (pierwsze wejście ALBO "Wstecz" z Dziennika)
  // świeca zawsze zaczyna płonąć od nowa, od spokojnego początku nagrania,
  // a przyciemnienie z poprzedniego wyjścia znika.
  useFocusEffect(
    useCallback(() => {
      try {
        candleTailStartedRef.current = false;
        player.currentTime = 0;
        player.play();
      } catch (e) {
        // odtwarzacz mógł jeszcze nie być gotowy - nic nie robimy.
      }
      fadeAnim.setValue(0);
      setLeaving(false);
      return () => {
        // Utrata fokusu (np. "Dalej" do Dziennika Modlitwy) - blokujemy
        // listener odliczania, żeby nie próbował dalej pętlować wideo.
        try {
          candleTailStartedRef.current = true;
          player.currentTime = CANDLE_EXTINGUISHED_SECONDS;
          player.pause();
        } catch (e) {
          // odtwarzacz mógł już zostać zwolniony - ignorujemy.
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // "Dalej" nie przechodzi do Dziennika Modlitwy od razu - najpierw widać
  // przez chwilę przyciemnienie wideo (symulujące zgaszenie świec) i
  // dopiero PO jego zakończeniu nawigujemy dalej.
  function handleDalej() {
    if (leaving) return;
    setLeaving(true);
    try {
      candleTailStartedRef.current = true;
      if (player.currentTime < CANDLE_LOOP_OUT_SECONDS) {
        player.currentTime = CANDLE_LOOP_OUT_SECONDS;
      }
      player.play();
    } catch (e) {
      // odtwarzacz mógł już zostać zwolniony - ignorujemy.
    }
    const anim = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: CANDLE_BLOWOUT_PREVIEW_MS,
      useNativeDriver: true,
    });
    leaveAnimationRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) {
        navigation.navigate('MyForm');
      }
    });
  }

  function toggleMusic() {
    try {
      if (musicOn) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
    } catch (e) {
      // Odtwarzacz niedostępny - ignorujemy, stan przycisku i tak się zaktualizuje.
    }
    setMusicOn(!musicOn);
  }

  function dismissFragment(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDismissedIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }

  // Gdy odmówisz się już wszystkich wybranych fragmentów (odznaczysz je
  // jeden po drugim), appka automatycznie przenosi do "Dziennika Modlitwy"
  // - a tam, dzięki temu że koszyk (SelectionContext) jest nietknięty,
  // czeka na Ciebie PEŁNA, oryginalna lista fragmentów do zapisania.
  useEffect(() => {
    if (selectedItems.length > 0 && remainingCount === 0) {
      const t = setTimeout(() => navigation.replace('MyForm'), 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingCount]);

  function confirmMinutes() {
    const parsed = parseInt(draftMinutes, 10);
    const value = !isNaN(parsed) && parsed >= 0 ? parsed : minutes;
    setMinutes(value);
    startTimer(value);
    setPromptVisible(false);
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.videoWrap}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
        <View style={styles.timerOverlay}>
          <CountdownTimer endTime={displayEndTime} />
        </View>
        <Pressable
          style={[styles.editTimeButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            const remainingMinutes =
              endTime && endTime > Date.now()
                ? Math.max(1, Math.round((endTime - Date.now()) / 60_000))
                : minutes;
            setDraftMinutes(String(remainingMinutes));
            setPromptVisible(true);
          }}
        >
          <Text style={styles.editTimeButtonText}>Czas modlitwy</Text>
        </Pressable>
        <Pressable
          style={[styles.musicButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          onPress={toggleMusic}
        >
          <Text style={styles.musicButtonText}>{musicOn ? '🔊' : '🔇'}</Text>
        </Pressable>
        <Animated.View
          pointerEvents="none"
          style={[styles.blowoutOverlay, { opacity: fadeAnim }]}
        />
      </View>

      {selectedItems.length > 0 && (
        <Text style={[styles.progressLabel, { color: colors.subtext }]}>
          Zostało {remainingCount} z {selectedItems.length} - dotknij fragment, gdy się nim
          pomodlisz
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {selectedItems.length === 0 && (
          <Text style={{ color: colors.subtext }}>Nie wybrano jeszcze żadnych fragmentów.</Text>
        )}
        {selectedItems.map((item, index) => {
          if (dismissedIndices.has(index)) return null;
          return (
            <Pressable
              key={index}
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={() => dismissFragment(index)}
            >
              <View style={styles.itemHeaderRow}>
                <Text style={[styles.itemLabel, { color: colors.subtext }]}>
                  Wybrany fragment {index + 1}
                </Text>
                <Text style={[styles.dismissHint, { color: colors.subtext }]}>✓ odmówione</Text>
              </View>
              <Text style={[styles.itemSigla, { color: colors.primary }]}>
                {item.sigla?.name}{' '}
                {item.sigla?.number ? formatVerseNumber(item.sigla.number) : item.sigla?.ratio}
              </Text>
              <Text style={[styles.itemQuote, { color: colors.text }]}>{item.quote}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footerNav, { borderTopColor: colors.border }]}>
        <Pressable
          style={styles.navButton}
          onPress={() => {
            if (leaveAnimationRef.current) {
              leaveAnimationRef.current.stop();
              leaveAnimationRef.current = null;
              fadeAnim.setValue(0);
              setLeaving(false);
            }
            navigation.goBack();
          }}
        >
          <Text style={{ color: colors.text }}>Wstecz</Text>
        </Pressable>
        <Pressable style={[styles.navButton, { opacity: leaving ? 0.5 : 1 }]} onPress={handleDalej} disabled={leaving}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Dalej</Text>
        </Pressable>
      </View>

      <Modal visible={promptVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Czas na Modlitwę</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              Ile czasu chcesz dziś poświęcić na spotkanie z Panem?
            </Text>
            <TextInput
              value={draftMinutes}
              onChangeText={setDraftMinutes}
              keyboardType="number-pad"
              placeholder="Minuty"
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setPromptVisible(false)} style={styles.modalButton}>
                <Text style={{ color: colors.subtext }}>Anuluj</Text>
              </Pressable>
              <Pressable onPress={confirmMinutes} style={styles.modalButton}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Ustaw czas</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  videoWrap: { height: 220, position: 'relative' },
  video: { width: '100%', height: '100%' },
  timerOverlay: { position: 'absolute', top: 12, right: 12 },
  editTimeButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editTimeButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  musicButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicButtonText: { fontSize: 16 },
  blowoutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  progressLabel: { fontSize: 12, textAlign: 'center', paddingTop: 10, paddingHorizontal: 16 },
  content: { padding: 16 },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { fontSize: 12 },
  dismissHint: { fontSize: 11, opacity: 0.6 },
  itemSigla: { fontSize: 15, fontWeight: '700', marginVertical: 2 },
  itemQuote: { fontSize: 14, lineHeight: 20 },
  footerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navButton: { paddingVertical: 8, paddingHorizontal: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  modalButton: { paddingVertical: 8, paddingHorizontal: 8 },
});

