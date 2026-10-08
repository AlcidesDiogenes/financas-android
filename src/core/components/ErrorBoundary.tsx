import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Proteção global: se uma tela tiver um erro inesperado ao desenhar, mostra uma tela
// amigável com opção de tentar de novo, em vez de deixar o app com a tela em branco.
// Deve ficar dentro do ThemeProvider (a tela de erro usa as cores do tema).
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // Em desenvolvimento (Expo Go) o recarregamento pode não estar disponível
      this.handleRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} onRestart={this.handleRestart} />;
    }
    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ onRetry: () => void; onRestart: () => void }> = ({ onRetry, onRestart }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.iconCircle, { backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name="alert-circle-outline" size={56} color={theme.danger} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>Algo deu errado</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Ocorreu um erro inesperado nesta tela. Seus dados continuam salvos no aparelho.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
        onPress={onRetry}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Ionicons name="refresh-outline" size={18} color="#FFF" />
        <Text style={styles.primaryBtnText}>Tentar novamente</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { borderColor: theme.border }]}
        onPress={onRestart}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Reiniciar o app</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
