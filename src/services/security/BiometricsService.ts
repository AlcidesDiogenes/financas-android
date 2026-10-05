import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRICS_ENABLED_KEY = '@financas:biometrics_enabled_v1';

export class BiometricsService {
  static async isHardwareSupported(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }

  static async isBiometricsEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(BIOMETRICS_ENABLED_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  }

  static async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(BIOMETRICS_ENABLED_KEY, String(enabled));
  }

  static async authenticate(promptMessage = 'Autentique-se para acessar suas finanças'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Usar senha do aparelho',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }
}
