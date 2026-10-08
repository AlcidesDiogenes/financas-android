import { Alert } from 'react-native';

// Executa uma ação assíncrona da interface e, se ela falhar, avisa o usuário em vez de
// falhar em silêncio (promessa rejeitada sem tratamento).
// Devolve true quando a ação terminou sem erro.
export async function runSafely(
  action: () => Promise<unknown> | unknown,
  errorMessage: string
): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (e) {
    console.warn('[runSafely]', errorMessage, e);
    Alert.alert('Erro', errorMessage);
    return false;
  }
}

// Pede confirmação antes de uma ação destrutiva e a executa com tratamento de erro.
export function confirmAndRun(
  title: string,
  message: string,
  action: () => Promise<unknown> | unknown,
  errorMessage: string,
  confirmText = 'Excluir'
): void {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: confirmText,
      style: 'destructive',
      onPress: () => {
        runSafely(action, errorMessage);
      },
    },
  ]);
}
