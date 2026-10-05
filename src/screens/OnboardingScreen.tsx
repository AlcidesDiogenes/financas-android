import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../core/theme/ThemeContext';
import { Button } from '../core/components/Button';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const ONBOARDING_COMPLETED_KEY = '@financas:onboarding_completed_v1';

interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  highlights: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    detail: string;
  }[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    badge: 'Visão Geral',
    title: 'Painel & Saldo Líquido',
    subtitle: 'Controle absoluto de cada centavo em tempo real',
    description:
      'Consolida receitas, despesas e economias do mês em um resumo financeiro inteligente e automático.',
    icon: 'wallet',
    color: '#3B82F6',
    highlights: [
      {
        icon: 'trending-up',
        label: 'Receitas & Entradas',
        detail: 'Salários, rendas fixas e ganhos extras somados no mês.',
      },
      {
        icon: 'trending-down',
        label: 'Despesas Realizadas',
        detail: 'Tudo o que já foi pago ou debitado na competência.',
      },
      {
        icon: 'cash-outline',
        label: 'Economia Guardada',
        detail: 'Valores guardados no banco ou aportes de investimentos.',
      },
      {
        icon: 'stats-chart',
        label: 'Projeção Inteligente',
        detail: 'Previsão de saldo até o fim do mês considerando contas pendentes.',
      },
    ],
  },
  {
    id: '2',
    badge: 'Automação & Vigência',
    title: 'Contas Fixas & Rendas',
    subtitle: 'Vigência programada e ajuste mensal inteligente',
    description:
      'Preveja salários e despesas fixas com controle de validade e histórico independente por mês.',
    icon: 'repeat',
    color: '#8B5CF6',
    highlights: [
      {
        icon: 'hourglass-outline',
        label: 'Vigência com Início e Fim',
        detail: 'Defina até quando uma renda ou conta vigora (ex: contratos ou parcelas).',
      },
      {
        icon: 'flash-outline',
        label: 'Variação por Competência',
        detail: 'Água, luz ou cartão: ajuste valor e status do mês sem estragar o padrão.',
      },
      {
        icon: 'create-outline',
        label: 'Edição Completa da Recorrência',
        detail: 'Edite valor base, categoria, vencimento ou vigência quando quiser.',
      },
      {
        icon: 'checkmark-circle-outline',
        label: 'Status em 1 Toque',
        detail: 'Marque como "Pago" ou "Recebido" diretamente na lista do mês.',
      },
    ],
  },
  {
    id: '3',
    badge: 'Extrato Avançado',
    title: 'Competências & Períodos',
    subtitle: 'Filtre por mês ou selecione qualquer intervalo de datas',
    description:
      'Histórico completo com alternância entre mês fechado ou período personalizado livre.',
    icon: 'calendar',
    color: '#0EA5E9',
    highlights: [
      {
        icon: 'calendar-outline',
        label: 'Navegação por Competência',
        detail: 'Alterne rapidamente mês a mês para acompanhar o fechamento.',
      },
      {
        icon: 'options-outline',
        label: 'Novo Filtro por Período',
        detail: 'Selecione datas De/Até (ex: 05/01 a 20/02) com saldo total do intervalo.',
      },
      {
        icon: 'pricetags-outline',
        label: 'Categorias & Responsáveis',
        detail: 'Classifique por Alimentação, Moradia, etc., e identifique o pagador.',
      },
      {
        icon: 'download-outline',
        label: 'Exportação CSV do Intervalo',
        detail: 'Baixe relatórios mensais ou do período selecionado para o Excel.',
      },
    ],
  },
  {
    id: '4',
    badge: 'Planejamento Inteligente',
    title: 'Tetos de Gastos & Metas',
    subtitle: 'Orçamentos contínuos com vigência programada',
    description:
      'Defina limites de gastos sem precisar recriar todo mês e acompanhe suas metas de economia.',
    icon: 'flag',
    color: '#10B981',
    highlights: [
      {
        icon: 'speedometer-outline',
        label: 'Tetos com Vigência Contínua',
        detail: 'Limites válidos para todos os meses do período, sem cópias manuais.',
      },
      {
        icon: 'alert-circle-outline',
        label: 'Alertas Visuais de Limite',
        detail: 'Barras que avisam quando o gasto da categoria está perto do teto.',
      },
      {
        icon: 'trophy-outline',
        label: 'Metas Financeiras & Depósitos',
        detail: 'Acompanhe sonhos (reserva, viagem) com depósitos e barra de progresso.',
      },
      {
        icon: 'pie-chart-outline',
        label: 'Orçado vs. Realizado',
        detail: 'Descubra exatamente onde está economizando e onde pode melhorar.',
      },
    ],
  },
  {
    id: '5',
    badge: 'Multi-Espaços',
    title: 'Espaços de Trabalho',
    subtitle: 'Sincronização em tempo real entre celulares',
    description:
      'Separe suas contas pessoais e divida orçamentos conjuntos com a família ou sócios.',
    icon: 'people',
    color: '#EC4899',
    highlights: [
      {
        icon: 'briefcase-outline',
        label: 'Múltiplos Espaços',
        detail: 'Alterne entre Pessoal, Família ou Empresa direto pelo menu.',
      },
      {
        icon: 'logo-whatsapp',
        label: 'Convite Rápido via WhatsApp',
        detail: 'Compartilhe o código de acesso para familiares entrarem em segundos.',
      },
      {
        icon: 'sync-outline',
        label: 'Sincronização em Tempo Real',
        detail: 'Lançamentos aparecem instantaneamente nos aparelhos conectados.',
      },
      {
        icon: 'shield-outline',
        label: 'Permissões Sob Medida',
        detail: 'Defina quem pode adicionar transações ou apenas visualizar.',
      },
    ],
  },
  {
    id: '6',
    badge: 'Segurança & Ajustes',
    title: 'Privacidade & Preferências',
    subtitle: 'Central organizada, biometria e tema escuro',
    description:
      'Use o aplicativo com discrição em público e configure cada detalhe do seu jeito.',
    icon: 'shield-checkmark',
    color: '#F59E0B',
    highlights: [
      {
        icon: 'eye-off-outline',
        label: 'Modo Privacidade (Olhinho)',
        detail: 'Oculte todos os valores na tela com 1 toque para usar em público.',
      },
      {
        icon: 'finger-print-outline',
        label: 'Bloqueio por Biometria',
        detail: 'Proteja a abertura com digital ou reconhecimento facial.',
      },
      {
        icon: 'moon-outline',
        label: 'Tema Escuro (Dark Mode)',
        detail: 'Visual elegante e confortável para os olhos durante a noite.',
      },
      {
        icon: 'settings-outline',
        label: 'Central de Ajustes Organizada',
        detail: 'Acesso rápido a perfil, sincronização em nuvem e exportação de dados.',
      },
    ],
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {}
    onFinish();
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar with Skip */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="wallet" size={16} color={theme.primary} />
          </View>
          <Text style={[styles.logoText, { color: theme.text }]}>Finanças</Text>
        </View>

        <TouchableOpacity
          onPress={completeOnboarding}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipText, { color: theme.textMuted }]}>
            Pular Tutorial
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIdx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIdx);
        }}
        renderItem={({ item }: { item: OnboardingSlide }) => (
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Icon & Badge */}
            <View style={styles.headerBlock}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${item.color}15`, borderColor: `${item.color}30` },
                ]}
              >
                <Ionicons name={item.icon} size={42} color={item.color} />
              </View>

              <View style={[styles.badgePill, { backgroundColor: `${item.color}18` }]}>
                <Text style={[styles.badgeText, { color: item.color }]}>
                  {item.badge}
                </Text>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.subtitle, { color: item.color }]}>
                {item.subtitle}
              </Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>
                {item.description}
              </Text>
            </View>

            {/* Highlights Mini-Cards */}
            <View style={styles.highlightsContainer}>
              {item.highlights.map((hl, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.highlightCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.highlightIconBox,
                      { backgroundColor: `${item.color}15` },
                    ]}
                  >
                    <Ionicons name={hl.icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.highlightTextWrap}>
                    <Text style={[styles.highlightLabel, { color: theme.text }]}>
                      {hl.label}
                    </Text>
                    <Text style={[styles.highlightDetail, { color: theme.textMuted }]}>
                      {hl.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      />

      {/* Footer Navigation Area */}
      <View style={[styles.footerArea, { borderTopColor: theme.border }]}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? theme.primary : theme.border,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <Button
          title={
            currentIndex === SLIDES.length - 1
              ? 'Começar a Usar o App 🚀'
              : 'Próximo Passo'
          }
          variant="primary"
          icon={
            <Ionicons
              name={currentIndex === SLIDES.length - 1 ? 'rocket' : 'arrow-forward'}
              size={18}
              color="#FFF"
            />
          }
          onPress={handleNext}
          style={styles.mainBtn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 17,
    fontWeight: '800',
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  slideScroll: {
    width,
  },
  slideContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  highlightsContainer: {
    gap: 8,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  highlightIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  highlightTextWrap: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  highlightDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerArea: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  mainBtn: {
    width: '100%',
  },
});
