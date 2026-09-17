// src/components/FormacjaAccessGate.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'signup';

// Osłania Formację (i w przyszłości ewentualnie inne zamknięte części
// appki) - dopóki nie ma zalogowanej sesji Supabase, zamiast właściwego
// ekranu pokazuje formularz logowania/rejestracji z kodem dostępu. Sama
// treść Formacji (src/data/formacja.ts) nadal jedzie w paczce appki - to
// blokuje dostęp z POZIOMU UI, a nie kryptograficzne zabezpieczenie danych
// (patrz rozmowa o kompromisach tego podejścia).
export default function FormacjaAccessGate({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  return <>{children}</>;
}

function AuthForm() {
  const { colors } = useAppTheme();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setError(null);

    if (!email.trim() || !password) {
      setError('Podaj e-mail i hasło.');
      return;
    }
    if (mode === 'signup' && !inviteCode.trim()) {
      setError('Podaj kod dostępu.');
      return;
    }

    setSubmitting(true);
    const result =
      mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, inviteCode);
    setSubmitting(false);

    if (result.error) {
      setError(translateAuthError(result.error));
      return;
    }

    if (mode === 'signup') {
      // Supabase domyślnie wymaga potwierdzenia e-maila zanim sesja stanie
      // się aktywna - użytkownik nie jest od razu zalogowany, więc pokazujemy
      // czytelny komunikat zamiast ciszy (Auth.getSession po prostu nie
      // zwróci jeszcze sesji, dopóki nie kliknie linku w mailu).
      setSignupDone(true);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.text }]}>Formacja</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            {mode === 'login'
              ? 'Zaloguj się, żeby zobaczyć Formację.'
              : 'Załóż konto kodem dostępu, żeby odblokować Formację.'}
          </Text>

          {signupDone ? (
            <View style={[styles.infoBox, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text }}>
                Konto założone. Sprawdź skrzynkę {email.trim()} i potwierdź adres e-mail, żeby
                móc się zalogować.
              </Text>
              <Pressable
                style={[styles.linkButton]}
                onPress={() => {
                  setSignupDone(false);
                  setMode('login');
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Przejdź do logowania</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="E-mail"
                placeholderTextColor={colors.subtext}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Hasło"
                placeholderTextColor={colors.subtext}
                secureTextEntry
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              />
              {mode === 'signup' && (
                <TextInput
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="Kod dostępu"
                  placeholderTextColor={colors.subtext}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                />
              )}

              {error && (
                <Text style={[styles.error, { color: '#D64545' }]}>{error}</Text>
              )}

              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? 'Chwila...' : mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.linkButton}
                onPress={() => {
                  setError(null);
                  setMode(mode === 'login' ? 'signup' : 'login');
                }}
              >
                <Text style={{ color: colors.subtext }}>
                  {mode === 'login' ? 'Masz kod dostępu? Załóż konto' : 'Masz już konto? Zaloguj się'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Komunikaty Supabase przychodzą po angielsku - tłumaczymy te najczęstsze,
// resztę pokazujemy jak leci (lepsze niż ukryć błąd całkowicie).
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Nieprawidłowy e-mail albo hasło.';
  if (lower.includes('user already registered')) return 'Konto z tym e-mailem już istnieje - zaloguj się.';
  if (lower.includes('nieprawidłowy albo już wykorzystany kod')) return 'Nieprawidłowy albo już wykorzystany kod dostępu.';
  if (lower.includes('brak kodu dostępu')) return 'Podaj kod dostępu.';
  if (lower.includes('password') && lower.includes('6 characters')) return 'Hasło musi mieć co najmniej 6 znaków.';
  return message;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  error: { fontSize: 13, marginBottom: 12, textAlign: 'center' },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkButton: { alignItems: 'center', marginTop: 16, padding: 8 },
  infoBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 16, gap: 12 },
});
