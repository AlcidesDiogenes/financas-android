import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { Badge } from './Badge';
import { ReleaseNote, APP_VERSION_CONFIG } from '../version';

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
  previousVersion?: string | null;
  releaseNotes: ReleaseNote[];
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  visible,
  onClose,
  previousVersion,
  releaseNotes,
}) => {
  const { theme, isDark } = useTheme();

  if (!visible || releaseNotes.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header com Gradiente/Cores */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${theme.primary}18` },
              ]}
            >
              <Ionicons name="sparkles" size={32} color={theme.primary} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              Novidades da Atualização! 🎉
            </Text>

            <View style={styles.versionRow}>
              {previousVersion ? (
                <>
                  <Text style={[styles.versionTag, { color: theme.textMuted }]}>
                    v{previousVersion}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={theme.primary}
                    style={{ marginHorizontal: 6 }}
                  />
                </>
              ) : null}
              <Badge
                label={`v${APP_VERSION_CONFIG.version}`}
                variant="primary"
                size="md"
              />
            </View>

            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {previousVersion
                ? `Veja as melhorias preparadas desde a versão que você usava:`
                : `Confira os recursos e otimizações adicionados nesta versão:`}
            </Text>
          </View>

          {/* Lista de Novidades por Versão com Rolagem Suave */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {releaseNotes.map((note) => (
              <View key={note.version} style={styles.releaseBlock}>
                <View style={styles.releaseHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="rocket-outline" size={16} color={theme.primary} />
                    <Text style={[styles.releaseTitle, { color: theme.text }]}>
                      Versão {note.version}
                    </Text>
                  </View>
                  <Text style={[styles.releaseDate, { color: theme.textMuted }]}>
                    {note.date}
                  </Text>
                </View>

                {note.highlight ? (
                  <Text style={[styles.releaseHighlight, { color: theme.textMuted }]}>
                    {note.highlight}
                  </Text>
                ) : null}

                <View style={styles.changesList}>
                  {note.changes.map((change, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.changeItem,
                        {
                          backgroundColor: isDark ? `${theme.surface}90` : '#F9FAFB',
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.changeIconWrap,
                          { backgroundColor: `${theme.primary}15` },
                        ]}
                      >
                        <Ionicons
                          name={(change.icon as any) || 'checkmark-circle-outline'}
                          size={18}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.changeTextWrap}>
                        <Text style={[styles.changeTitle, { color: theme.text }]}>
                          {change.title}
                        </Text>
                        <Text
                          style={[styles.changeDesc, { color: theme.textMuted }]}
                        >
                          {change.description}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Botão de Fechar */}
          <View style={styles.footer}>
            <Button
              title="Entendi, vamos lá!"
              icon={<Ionicons name="rocket-outline" size={18} color="#FFF" />}
              variant="primary"
              onPress={onClose}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '86%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  versionTag: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  scrollList: {
    flexGrow: 0,
    maxHeight: 380,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  releaseBlock: {
    marginBottom: 16,
  },
  releaseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  releaseTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  releaseDate: {
    fontSize: 11,
  },
  releaseHighlight: {
    fontSize: 12,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  changesList: {
    gap: 8,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  changeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  changeTextWrap: {
    flex: 1,
  },
  changeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  changeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
});
