import { Platform, Vibration } from 'react-native';

/**
 * Universal tactile feedback helper for BURGER HOME mobile.
 * Uses native micro-vibrations for tactile response without external native modules.
 */
export const haptic = {
  /** Subtle touch for button presses, tab changes, pill selections. */
  light(): void {
    if (Platform.OS === 'android') {
      Vibration.vibrate(12);
    }
  },

  /** Noticeable click for add-to-cart, toggle favorites, quantity steps. */
  medium(): void {
    if (Platform.OS === 'android') {
      Vibration.vibrate(25);
    }
  },

  /** Success feedback for order placed, wheel spin win, address saved. */
  success(): void {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 20, 50, 30]);
    }
  },

  /** Warning or error feedback for invalid inputs or failed actions. */
  warning(): void {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 30, 60, 40]);
    }
  },
};
