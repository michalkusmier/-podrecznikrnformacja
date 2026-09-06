// src/context/SelectionContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Reference } from '../types';

interface SelectionContextValue {
  fragments: Reference[];
  toggleFragment: (ref: Reference) => void;
  isSelected: (ref: Reference) => boolean;
  clearSelection: () => void;
  count: number;
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

function sameFragment(a: Reference, b: Reference): boolean {
  return a.sigla?.name === b.sigla?.name && a.sigla?.number === b.sigla?.number;
}

// Wspólny "koszyk" wybranych fragmentów do modlitwy - współdzielony przez
// Podręcznik (Adoracja/Proklamacja), Imiona i tytuły Boga oraz Biblię, żeby
// wybór fragmentów w różnych miejscach appki zbierał się w jedno miejsce
// (tak jak wcześniej działało to tylko pomiędzy Adoracją a Proklamacją,
// bo dzieliły jeden lokalny stan w tym samym komponencie).
export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fragments, setFragments] = useState<Reference[]>([]);

  const toggleFragment = useCallback((ref: Reference) => {
    setFragments((prev) => {
      const exists = prev.find((f) => sameFragment(f, ref));
      if (exists) return prev.filter((f) => f !== exists);
      return [...prev, ref];
    });
  }, []);

  const isSelected = useCallback(
    (ref: Reference) => fragments.some((f) => sameFragment(f, ref)),
    [fragments]
  );

  const clearSelection = useCallback(() => setFragments([]), []);

  const value = useMemo<SelectionContextValue>(
    () => ({ fragments, toggleFragment, isSelected, clearSelection, count: fragments.length }),
    [fragments, toggleFragment, isSelected, clearSelection]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error('useSelection musi być używany wewnątrz <SelectionProvider>');
  }
  return ctx;
}
