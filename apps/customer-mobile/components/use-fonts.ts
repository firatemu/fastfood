import { Anton_400Regular, useFonts as useAnton } from '@expo-google-fonts/anton';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts as useJakarta,
} from '@expo-google-fonts/plus-jakarta-sans';

export function useBurgerHomeFonts(): boolean {
  const [anton] = useAnton({ Anton_400Regular });
  const [jakarta] = useJakarta({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  return anton && jakarta;
}
