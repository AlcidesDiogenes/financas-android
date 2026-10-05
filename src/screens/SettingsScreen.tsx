import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../core/theme/ThemeContext';
import { useAuth } from '../services/auth/AuthContext';
import { useSecurity } from '../services/security/SecurityContext';
import { SupabaseService } from '../services/supabase/supabaseClient';
import { CloudSyncService } from '../services/supabase/CloudSyncService';
import { ExportService } from '../services/reports/ExportService';
import { useFinance } from '../modules/FinanceContext';
import { getMonthLabel } from '../core/utils/date';
import { Card } from '../core/components/Card';
import { Button } from '../core/components/Button';
import { Input } from '../core/components/Input';
import { Badge } from '../core/components/Badge';
import { Ionicons } from '@expo/vector-icons';

export const SettingsScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { isBiometricsEnabled, isHardwareSupported, toggleBiometrics } = useSecurity();
  const { transactions, selectedMonth, selectedYear, reloadAll, wipeAllData } = useFinance();

  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage('Sincronizando com a nuvem...');
    
    // First push local changes up, then pull latest changes down
    const pushRes = await CloudSyncService.syncLocalToCloud();
    const pullRes = await CloudSyncService.syncCloudToLocal();
    await reloadAll();

    setIsSyncing(false);
    if (pushRes.success && pullRes.success) {
      setStatusMessage('✅ Sincronização concluída com sucesso!');
    } else {
      setStatusMessage('⚠️ ' + (pushRes.message || pullRes.message));
    }
  };

  const handleSaveCustomKeys = async () => {
    if (!customUrl.trim() || !customKey.trim()) {
      Alert.alert('Aviso', 'Preencha a URL e a Chave antes de salvar.');
      return;
    }
    await SupabaseService.setCredentials(customUrl, customKey);
    Alert.alert('Sucesso', 'Novas chaves salvas com sucesso!');
    setShowAdvanced(false);
  };

  const handleExportCSV = async () => {
    const monthLabel = getMonthLabel(selectedMonth, selectedYear);
    const ok = await ExportService.exportTransactionsToCSV(transactions, monthLabel);
    if (!ok) {
      Alert.alert('Exportação', 'Não foi possível gerar ou compartilhar o arquivo.');
    }
  };

  const handleConfirmWipe = () => {
    Alert.alert(
      'Zerar Dados de Exemplo?',
      'Isso apagará todos os dados fictícios de teste para que você comece com o app zerado (R$ 0,00) para uso real.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Limpar Tudo',
          style: 'destructive',
          onPress: async () => {
            await wipeAllData();
            Alert.alert('Sucesso!', 'O aplicativo está 100% zerado e pronto para o seu uso real.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Ajustes
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
          Segurança, sincronização em nuvem e relatórios
        </Text>

        {/* User Profile Card */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cloudIconWrap, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="person" size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {user ? user.name : 'Modo Offline'}
              </Text>
              <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                {user ? user.email : 'Sem conta vinculada'}
              </Text>
            </View>
            {user ? (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Sair da Conta', 'Deseja realmente desconectar da sua conta?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sair', style: 'destructive', onPress: signOut },
                  ]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="log-out-outline" size={24} color={theme.danger} />
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        {/* Cloud Sync Status (No exposed keys) */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cloudIconWrap, { backgroundColor: theme.successLight }]}>
              <Ionicons name="cloud-done" size={24} color={theme.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Nuvem & Sincronização
              </Text>
              <Badge label="Automática & Ativa" variant="success" />
            </View>
          </View>

          <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
            Todas as suas receitas, despesas, orçamentos e metas são sincronizados
            automaticamente em tempo real. Se você e outra pessoa usarem o app, as
            alterações aparecem instantaneamente para ambos.
          </Text>

          {statusMessage ? (
            <Text style={[styles.statusBox, { color: theme.text, backgroundColor: theme.surfaceVariant }]}>
              {statusMessage}
            </Text>
          ) : null}

          <Button
            title="Sincronizar Manualmente Agora"
            variant="outline"
            loading={isSyncing}
            icon={<Ionicons name="sync" size={18} color={theme.text} />}
            onPress={handleManualSync}
            style={{ marginTop: 6 }}
          />

          {/* Collapsible Advanced section if ever needed */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={[styles.advancedToggleText, { color: theme.textMuted }]}>
              {showAdvanced ? '▲ Ocultar Servidor' : '⚙️ Configurações Avançadas de Servidor'}
            </Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={[styles.advancedBox, { backgroundColor: theme.surfaceVariant }]}>
              <Input
                label="Nova Project URL (Opcional)"
                placeholder="https://xyz.supabase.co"
                autoCapitalize="none"
                value={customUrl}
                onChangeText={setCustomUrl}
              />
              <Input
                label="Nova Anon Key (Opcional)"
                placeholder="eyJhbGci..."
                autoCapitalize="none"
                secureTextEntry
                value={customKey}
                onChangeText={setCustomKey}
              />
              <Button
                title="Salvar Novo Servidor"
                size="sm"
                onPress={handleSaveCustomKeys}
              />
            </View>
          )}
        </Card>

        {/* Security & Biometrics */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cloudIconWrap, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="finger-print" size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Segurança Biométrica
              </Text>
              <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                Impressão digital do seu Galaxy S26 Ultra
              </Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>
                Bloqueio por Digital / Face
              </Text>
              <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                {isHardwareSupported
                  ? 'Exigir autenticação ao abrir o aplicativo'
                  : 'Biometria não disponível neste aparelho'}
              </Text>
            </View>
            <Switch
              disabled={!isHardwareSupported}
              value={isBiometricsEnabled}
              onValueChange={() => {
                toggleBiometrics();
              }}
              thumbColor={isBiometricsEnabled ? theme.primary : '#ccc'}
            />
          </View>
        </Card>

        {/* Theme Settings */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cloudIconWrap, { backgroundColor: theme.infoLight }]}>
              <Ionicons name="color-palette-outline" size={24} color={theme.info} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Aparência
              </Text>
              <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                Alternar entre tema claro e escuro
              </Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>
                Tema Escuro (Dark Mode)
              </Text>
              <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                Visual escuro de alto contraste
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              thumbColor={isDark ? theme.primary : '#ccc'}
            />
          </View>
        </Card>

        {/* Export Data */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cloudIconWrap, { backgroundColor: theme.warningLight }]}>
              <Ionicons name="document-text-outline" size={24} color={theme.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Exportação de Extratos
              </Text>
              <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                Planilha mensal para WhatsApp e Excel
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
            Gere uma planilha Excel/CSV com os lançamentos de {getMonthLabel(selectedMonth, selectedYear)} para
            compartilhar ou arquivar.
          </Text>

          <Button
            title="Exportar Extrato em Planilha (CSV)"
            variant="outline"
            icon={<Ionicons name="share-social-outline" size={18} color={theme.text} />}
            onPress={handleExportCSV}
            style={{ marginTop: 4 }}
          />
        </Card>

        {/* Reset / Production Clean Data */}
        <Card variant="outlined" style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cloudIconWrap, { backgroundColor: theme.dangerLight }]}>
              <Ionicons name="sparkles-outline" size={24} color={theme.danger} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Iniciar Finanças Reais
              </Text>
              <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                Limpar dados de exemplo para começar do zero
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
            Deseja apagar todos os dados fictícios de teste para começar a cadastrar
            suas contas e receitas reais (Saldo R$ 0,00)?
          </Text>

          <Button
            title="Limpar Dados de Exemplo"
            variant="danger"
            size="sm"
            icon={<Ionicons name="trash-outline" size={16} color="#FFF" />}
            onPress={handleConfirmWipe}
            style={{ marginTop: 4 }}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  card: {
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cloudIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
  },
  statusBox: {
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  advancedToggle: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  advancedToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  advancedBox: {
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
});
