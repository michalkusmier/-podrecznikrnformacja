// src/context/PrayerTimerContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface PrayerTimerContextValue {
  // Bezwzględny znacznik czasu (Date.now() + minuty), kiedy licznik ma dojść
  // do zera - albo null, jeśli żadna modlitwa nie jest aktualnie w toku.
  endTime: number | null;
  startTimer: (minutes: number) => void;
  clearTimer: () => void;
}

const PrayerTimerContext = createContext<PrayerTimerContextValue | undefined>(undefined);

// Stan licznika modlitwy żyje TUTAJ, na poziomie całej appki - a nie lokalnie
// w SelectedItemsScreen. Dzięki temu odliczanie liczy się od stałego,
// bezwzględnego momentu w czasie i działa dalej niezależnie od tego, czy
// ekran "Czas modlitwy" zostanie odmontowany (np. po "Wstecz" do Home) i
// otwarty ponownie, czy zostanie tylko schowany pod kolejnym ekranem
// (np. po "Dalej" do Dziennika Modlitwy) - w obu przypadkach po powrocie
// licznik pokazuje realny, upływający czas, a nie zaczyna od nowa.
export const PrayerTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [endTime, setEndTime] = useState<number | null>(null);

  const startTimer = useCallback((minutes: number) => {
    setEndTime(Date.now() + minutes * 60_000);
  }, []);

  const clearTimer = useCallback(() => setEndTime(null), []);

  const value = useMemo<PrayerTimerContextValue>(
    () => ({ endTime, startTimer, clearTimer }),
    [endTime, startTimer, clearTimer]
  );

  return <PrayerTimerContext.Provider value={value}>{children}</PrayerTimerContext.Provider>;
};

export function usePrayerTimer(): PrayerTimerContextValue {
  const ctx = useContext(PrayerTimerContext);
  if (!ctx) {
    throw new Error('usePrayerTimer musi być używany wewnątrz <PrayerTimerProvider>');
  }
  return ctx;
}
