import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useAuth } from '../services/auth/AuthContext';
import { Input } from '../core/components/Input';
import { Button } from '../core/components/Button';
import { Card } from '../core/components/Card';
import { Ionicons } from '@expo/vector-icons';

export const AuthScreen: React.FC = () => {
  const { theme } = useTheme();
  const { signIn, signUp, skipAuth } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAction = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Preencha seu e-mail e sua senha.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setErrorMessage('Informe seu nome para criar a conta.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    if (mode === 'signup') {
      const res = await signUp(email, password, name);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao cadastrar.');
      }
    } else {
      const res = await signIn(email, password);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'E-mail ou senha incorretos.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="wallet" size={38} color={theme.primary} />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Finanças</Text>
          <Text style={[styles.appSubtitle, { color: theme.textMuted }]}>
            Controle pessoal e colaborativo em tempo real
          </Text>
        </View>

        {/* Auth Form Card */}
        <Card variant="elevated" style={styles.formCard}>
          {/* Tabs: Entrar vs Criar Conta */}
          <View style={[styles.tabBar, { backgroundColor: theme.surfaceVariant }]}>
            <TouchableOpacity
              style={[
                styles.tabItem,
                mode === 'signin' && { backgroundColor: theme.surface },
              ]}
              onPress={() => {
                setMode('signin');
                setErrorMessage('');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: mode === 'signin' ? theme.text : theme.textMuted,
                    fontWeight: mode === 'signin' ? '700' : '500',
                  },
                ]}
              >
                Entrar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabItem,
                mode === 'signup' && { backgroundColor: theme.surface },
              ]}
              onPress={() => {
                setMode('signup');
                setErrorMessage('');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: mode === 'signup' ? theme.text : theme.textMuted,
                    fontWeight: mode === 'signup' ? '700' : '500',
                  },
                ]}
              >
                Criar Conta
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <Input
              label="Seu Nome Completo"
              placeholder="Ex: Alcides Diógenes"
              value={name}
              onChangeText={setName}
            />
          )}

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.passwordWrap}>
            <Input
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              containerStyle={{ marginBottom: 0, flex: 1 }}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textMuted}
              />
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerLight }]}>
              <Ionicons name="alert-circle" size={16} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Button
            title={mode === 'signin' ? 'Entrar no Finanças' : 'Criar Minha Conta'}
            loading={loading}
            onPress={handleAction}
            style={{ marginTop: 16 }}
          />
        </Card>

        {/* Skip Guest Mode */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={skipAuth}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: theme.textMuted }]}>
            Continuar sem conta (Modo Offline) →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
  },
  appSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    padding: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 14,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  eyeBtn: {
    padding: 12,
    marginBottom: 2,
    marginLeft: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  errorText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  skipBtn: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
