// Simulador do AsyncStorage em memória (fornecido pelo próprio pacote) para os testes
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
