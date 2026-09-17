// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextValue {
  session: Session | null;
  // Dopóki true, jeszcze nie wiadomo, czy jest zapisana sesja (np. appka
  // dopiero co się uruchomiła) - w tym czasie NIE pokazujemy ekranu
  // logowania, żeby zalogowany użytkownik nie widział go na mgnienie oka
  // przy każdym starcie appki.
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  // inviteCode - kod dostępu wpisany przy rejestracji, sprawdzany po stronie
  // bazy (patrz supabase/migrations/0001_access_codes.sql) - jeśli
  // nieprawidłowy albo już wykorzystany, signUp zwróci błąd i konto NIE
  // powstanie.
  signUp: (email: string, password: string, inviteCode: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Dostęp do Formacji (i w przyszłości innych zamkniętych części appki) -
// gotowość zależy od jednej wspólnej sesji Supabase, sprawdzanej raz przy
// starcie appki i odświeżanej automatycznie przez supabase-js w tle.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUp(email, password, inviteCode) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { invite_code: inviteCode.trim() } },
        });
        return { error: error?.message ?? null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth musi być używany wewnątrz <AuthProvider>');
  }
  return ctx;
}
