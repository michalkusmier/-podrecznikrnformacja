// src/navigation/navigationRef.ts
import { createNavigationContainerRef } from '@react-navigation/native';
import type { TabParamList } from '../types';

// Referencja do nawigacji dostępna POZA drzewem nawigatora - potrzebna np.
// przez GlobalPrayerBadge, który renderuje się jako rodzeństwo TabNavigator
// (nie jego potomek), więc zwykły hook useNavigation() nie miałby tam do
// czego się podłączyć (brak nadrzędnego Navigatora w drzewie komponentów).
export const navigationRef = createNavigationContainerRef<TabParamList>();
