import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useAuth } from '../services/auth/AuthContext';
import { Input } from '../core/components/Input';
import { Button } from '../core/components/Button';
import { Card } from '../core/components/Card';
import { Ionicons } from '@expo/vector-icons';

interface AuthScreenProps {
  onClose?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const { signIn, signUp, resendVerificationEmail, resetPassword, skipAuth } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showResendBtn, setShowResendBtn] = useState(false);

  const handleResendEmail = async () => {
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail para reenviar o link de ativação.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    const res = await resendVerificationEmail(email.trim());
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao reenviar e-mail.');
    } else {
      Alert.alert(
        'E-mail Reenviado! 📬',
        `Um novo link de ativação foi enviado para:\n\n${email.trim()}\n\nVerifique sua caixa de entrada e pasta de spam.`
      );
    }
  };

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
        if (res.error?.includes('já está cadastrado')) {
          Alert.alert(
            'Conta já Existente ⚠️',
            `O e-mail "${email.trim()}" já possui cadastro no aplicativo.\n\nDeseja entrar com sua senha ou recuperar o acesso?`,
            [
              {
                text: 'Recuperar Senha',
                onPress: () => {
                  setMode('forgot');
                  setErrorMessage('');
                },
              },
              {
                text: 'Ir para Entrar',
                onPress: () => {
                  setMode('signin');
                  setErrorMessage('');
                },
              },
            ]
          );
        }
      } else if (res.requiresEmailConfirmation) {
        Alert.alert(
          'Quase lá! Confirme seu E-mail 📬',
          `Enviamos um link de ativação para:\n\n${email.trim()}\n\nPor favor, abra sua caixa de entrada (ou pasta de spam) e clique no link para ativar sua conta antes de fazer login.`,
          [
            {
              text: 'Entendi, ir para Login',
              onPress: () => {
                setMode('signin');
                setPassword('');
              },
            },
          ]
        );
      } else {
        if (onClose) onClose();
      }
    } else {
      const res = await signIn(email, password);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'E-mail ou senha incorretos.');
        if (
          res.error?.toLowerCase().includes('não confirmado') ||
          res.error?.toLowerCase().includes('not confirmed')
        ) {
          setShowResendBtn(true);
        }
      } else {
        if (onClose) onClose();
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail para receber o link de redefinição.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    const res = await resetPassword(email.trim());
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao solicitar recuperação de senha.');
    } else {
      Alert.alert(
        'E-mail Enviado! 📬',
        `Enviamos um link seguro de redefinição de senha para:\n\n${email.trim()}\n\nVerifique sua caixa de entrada (e pasta de spam) para cadastrar sua nova senha.`,
        [
          {
            text: 'Ir para Entrar',
            onPress: () => {
              setMode('signin');
              setErrorMessage('');
            },
          },
        ]
      );
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
        {/* Header Close button if opened from Settings */}
        {onClose ? (
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeModalBtn, { backgroundColor: theme.surfaceVariant }]}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        ) : null}

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
          {mode === 'forgot' ? (
            /* Forgot Password Flow */
            <View>
              <TouchableOpacity
                style={styles.backToLoginRow}
                onPress={() => {
                  setMode('signin');
                  setErrorMessage('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={theme.primary} />
                <Text style={[styles.backToLoginText, { color: theme.primary }]}>
                  Voltar para o Login
                </Text>
              </TouchableOpacity>

              <View style={styles.forgotHeader}>
                <Text style={[styles.forgotTitle, { color: theme.text }]}>
                  Recuperar Senha 🔑
                </Text>
                <Text style={[styles.forgotSubtitle, { color: theme.textMuted }]}>
                  Informe seu e-mail cadastrado e enviaremos um link para você redefinir sua senha com segurança.
                </Text>
              </View>

              <Input
                label="Seu E-mail Cadastrado"
                placeholder="seu@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: theme.dangerLight }]}>
                  <Ionicons name="alert-circle" size={16} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <Button
                title="Enviar Link de Recuperação"
                loading={loading}
                onPress={handleResetPassword}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            /* Standard SignIn / SignUp Flow */
            <View>
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
                  placeholder="Ex: Seu Nome"
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

              {/* Forgot Password Button (only in signin mode) */}
              {mode === 'signin' && (
                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => {
                    setMode('forgot');
                    setErrorMessage('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.forgotText, { color: theme.primary }]}>
                    Esqueceu sua senha?
                  </Text>
                </TouchableOpacity>
              )}

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: theme.dangerLight }]}>
                  <Ionicons name="alert-circle" size={16} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              {showResendBtn && (
                <TouchableOpacity
                  style={[styles.resendBtn, { backgroundColor: `${theme.primary}15` }]}
                  onPress={handleResendEmail}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-unread-outline" size={18} color={theme.primary} />
                  <Text style={[styles.resendBtnText, { color: theme.primary }]}>
                    Reenviar e-mail de ativação
                  </Text>
                </TouchableOpacity>
              )}

              <Button
                title={mode === 'signin' ? 'Entrar no Finanças' : 'Criar Minha Conta'}
                loading={loading}
                onPress={handleAction}
                style={{ marginTop: 16 }}
              />
            </View>
          )}
        </Card>

        {/* Skip Guest Mode (only when onboarding / first open) */}
        {!onClose && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={skipAuth}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: theme.textMuted }]}>
              Continuar sem conta (Modo Offline) →
            </Text>
          </TouchableOpacity>
        )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  formCard: {
    padding: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 36,
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  backToLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  forgotHeader: {
    marginBottom: 18,
  },
  forgotTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  forgotSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  skipBtn: {
    marginTop: 24,
    alignItems: 'center',
    padding: 10,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
