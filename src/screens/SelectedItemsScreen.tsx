// src/screens/SelectedItemsScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { formatVerseNumber } from '../utils/formatVerse';
import CountdownTimer from '../components/CountdownTimer';

type Props = NativeStackScreenProps<MainStackParamList, 'SelectedItems'>;

const candleSource = require('../../assets/candle.mp4');
const ambientSource = require('../../assets/ambient_candle.mp3');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Odpowiednik selected-items-page.component.ts.
// ion-alert z prompt-em na minuty zastąpiony własnym modalem (działa tak samo na iOS i Androidzie).
export default function SelectedItemsScreen({ route, navigation }: Props) {
  const { colors } = useAppTheme();
  const { selectedItems } = route.params;

  const [minutes, setMinutes] = useState(10);
  const [promptVisible, setPromptVisible] = useState(true);
  const [draftMinutes, setDraftMinutes] = useState('10');
  const [musicOn, setMusicOn] = useState(true);

  // Które fragmenty zostały już "odmówione" (odkliknięte) w TEJ sesji
  // modlitwy - to jest CELOWO osobny, lokalny stan, NIE modyfikujący
  // wspólnego koszyka (SelectionContext). Dzięki temu, gdy dojdziesz do
  // zera, "Dziennik Modlitwy" (MyFormScreen) nadal ma dostęp do PEŁNEJ,
  // oryginalnej listy fragmentów do zapisania - a nie pustego koszyka.
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(new Set());
  const remainingCount = selectedItems.length - dismissedIndices.size;

  const player = useVideoPlayer(candleSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
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
    if (!isNaN(parsed) && parsed >= 0) {
      setMinutes(parsed);
    }
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
          <CountdownTimer startInSeconds={minutes * 60} />
        </View>
        <Pressable
          style={[styles.editTimeButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setDraftMinutes(String(minutes));
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
        <Pressable style={styles.navButton} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.text }}>Wstecz</Text>
        </Pressable>
        <Pressable style={styles.navButton} onPress={() => navigation.navigate('MyForm')}>
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

