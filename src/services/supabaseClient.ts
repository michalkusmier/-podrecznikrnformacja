// src/services/supabaseClient.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// EXPO_PUBLIC_* trafiają do zbudowanej paczki jako zwykłe stałe tekstowe -
// to normalne dla appki mobilnej bez własnego serwera. Klucz "publishable"
// (dawniej "anon") jest zaprojektowany jako publiczny - realną ochronę
// danych daje RLS w bazie, nie ukrycie tego klucza.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    'Brak EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY - logowanie nie będzie działać. Sprawdź plik .env.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // AsyncStorage (nie domyślny localStorage, niedostępny w RN) - sesja
    // przetrwa zamknięcie i ponowne otwarcie appki.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Appka nie obsługuje żadnych deep-linków logowania (np. z linku e-mail) -
    // wyłączone, żeby supabase-js nie próbowało parsować URL-a appki.
    detectSessionInUrl: false,
  },
});
