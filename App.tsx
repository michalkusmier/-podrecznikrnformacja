// App.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { SelectionProvider, useSelection } from './src/context/SelectionContext';
import { PrayerTimerProvider } from './src/context/PrayerTimerContext';
import GlobalPrayerBadge from './src/components/GlobalPrayerBadge';
import { navigationRef } from './src/navigation/navigationRef';
import type { MainStackParamList, TabParamList } from './src/types';

import HomeScreen from './src/screens/HomeScreen';
import WstepScreen from './src/screens/WstepScreen';
import BibliaScreen from './src/screens/BibliaScreen';
import DivineTitlesScreen from './src/screens/DivineTitlesScreen';
import FormacjaListScreen from './src/screens/FormacjaListScreen';
import FormacjaWeekScreen from './src/screens/FormacjaWeekScreen';
import FormacjaDayScreen from './src/screens/FormacjaDayScreen';
import SelectedItemsScreen from './src/screens/SelectedItemsScreen';
import MyFormScreen from './src/screens/MyFormScreen';
import FormHistoryScreen from './src/screens/FormHistoryScreen';
import JournalEntryScreen from './src/screens/JournalEntryScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Stos ekranów głównej części appki (wszystko poza Dziennikiem).
function MainStackNavigator() {
  const { colors, isDark, toggleTheme } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Podręcznik Adoracji Boga',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Pressable
                onPress={toggleTheme}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={isDark ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
              >
                <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={24} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Wstep')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Wstęp - pomoc"
                style={{ paddingRight: 4 }}
              >
                <Ionicons name="help-circle-outline" size={26} color={colors.text} />
              </Pressable>
            </View>
          ),
        })}
      />
      <Stack.Screen name="Wstep" component={WstepScreen} options={{ title: 'Wstęp' }} />
      <Stack.Screen name="Biblia" component={BibliaScreen} options={{ title: 'Biblia Tysiąclecia' }} />
      <Stack.Screen
        name="DivineTitles"
        component={DivineTitlesScreen}
        options={{ title: 'Imiona i tytuły Boga' }}
      />
      <Stack.Screen name="Formacja" component={FormacjaListScreen} options={{ title: 'Formacja' }} />
      <Stack.Screen name="FormacjaWeek" component={FormacjaWeekScreen} options={{ title: 'Formacja' }} />
      <Stack.Screen name="FormacjaDay" component={FormacjaDayScreen} options={{ title: 'Formacja' }} />
      <Stack.Screen
        name="SelectedItems"
        component={SelectedItemsScreen}
        options={{ title: 'Wybrane Fragmenty' }}
      />
      <Stack.Screen name="MyForm" component={MyFormScreen} options={{ title: 'Mój Formularz' }} />
      <Stack.Screen
        name="JournalEntry"
        component={JournalEntryScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

// Pusty placeholder - ta zakładka nigdy się nie renderuje, bo tabPress jest
// zawsze przechwytywany (patrz listeners w Tab.Screen "ModlitwaTab" niżej).
function ModlitwaTabPlaceholder() {
  return null;
}

// Dolny pasek zakładek - widoczny zawsze, z każdego miejsca w appce.
// "Główna" to cała reszta appki (stos powyżej). "Start" (dawniej "Modlitwa" -
// zmienione, żeby nie kolidować nazwą z kafelkiem "Modlitwa" na ekranie
// głównym) to SKRÓT bezpośrednio do ekranu ze świecą i licznikiem czasu (ten
// sam ekran, co po kliknięciu "Modlitwa" gdziekolwiek indziej w appce) - z
// tym, co akurat jest we wspólnym koszyku (SelectionContext). Jeśli koszyk
// jest pusty, nadal można zapalić świecę i ustawić czas - nie trzeba
// wcześniej wybrać żadnych fragmentów. "Dziennik" to Historia Dziennika,
// dostępna niezależnie od tego, gdzie akurat jesteś.
function TabNavigator() {
  const { colors } = useAppTheme();
  const { fragments } = useSelection();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'GlownaTab'
              ? 'book-outline'
              : route.name === 'ModlitwaTab'
              ? 'flame-outline'
              : 'time-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="GlownaTab"
        component={MainStackNavigator}
        options={{ title: 'Główna' }}
        listeners={({ navigation }) => ({
          // Zakładka "Główna" ma zawsze znaczyć "wróć na sam start" - bez
          // tego React Navigation po prostu pokazuje ostatni ekran, na
          // którym zostawiłeś ten stos (np. Dzień IV Formacji), zamiast
          // ekranu startowego z 6 kafelkami. Działa też, gdy jesteś już na
          // tej zakładce - kliknięcie zawsze resetuje stos do "Home".
          tabPress: () => {
            navigation.navigate('GlownaTab', { screen: 'Home', params: { resetAt: Date.now() } });
          },
        })}
      />
      <Tab.Screen
        name="ModlitwaTab"
        component={ModlitwaTabPlaceholder}
        options={{ title: 'Start' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('GlownaTab', {
              screen: 'SelectedItems',
              params: { selectedItems: fragments },
            });
          },
        })}
      />
      <Tab.Screen name="DziennikTab" component={FormHistoryScreen} options={{ title: 'Dziennik' }} />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { isDark, colors } = useAppTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <TabNavigator />
      <GlobalPrayerBadge />
    </NavigationContainer>
  );
}

export default function App() {
  // Ustawione RAZ, globalnie - bez tego cicha muzyka w tle podczas modlitwy
  // (ambient_candle.mp3) może nie być wcale słyszalna: na iOS domyślna
  // sesja audio nie zawsze gra, gdy telefon jest wyciszony przełącznikiem
  // dzwonka, a bez jawnego trybu "mixWithOthers" odtwarzacz wideo świecy
  // (zawsze wyciszony, ale wciąż aktywujący sesję audio) może wygaszać
  // dźwięk odtwarzacza muzyki w tle.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {
      // Brak dźwięku nie powinien wywalać appki - w najgorszym razie muzyka w tle się nie odezwie.
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SelectionProvider>
          <PrayerTimerProvider>
            <Navigation />
          </PrayerTimerProvider>
        </SelectionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
