import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeProvider } from '../theme/ThemeContext';

// A primeira montagem carrega ícones e fontes e pode passar dos 5 s padrão em máquinas ocupadas (CI)
jest.setTimeout(30000);

// Componente que falha ao desenhar enquanto a flag estiver ligada
let shouldThrow = true;
const UnstableScreen: React.FC = () => {
  if (shouldThrow) {
    throw new Error('erro de teste ao desenhar');
  }
  return <Text>Tela recuperada</Text>;
};

const renderWithBoundary = () =>
  render(
    <ThemeProvider>
      <ErrorBoundary>
        <UnstableScreen />
      </ErrorBoundary>
    </ThemeProvider>
  );

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    shouldThrow = true;
    // O React e o ErrorBoundary registram o erro no console; silencia nos testes
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('mostra a tela amigável em vez de quebrar o app', async () => {
    await renderWithBoundary();

    expect(screen.getByText('Algo deu errado')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
    expect(screen.getByText('Reiniciar o app')).toBeTruthy();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('"Tentar novamente" desenha a tela de novo quando o erro passou', async () => {
    await renderWithBoundary();

    shouldThrow = false;
    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(screen.getByText('Tela recuperada')).toBeTruthy();
    expect(screen.queryByText('Algo deu errado')).toBeNull();
  });
});
