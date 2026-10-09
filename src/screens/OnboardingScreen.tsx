import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../core/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const ONBOARDING_COMPLETED_KEY = '@financas:onboarding_v1_0_completed';

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
    badge: 'Painel Financeiro',
    title: 'Saldo Real vs. Previsto Total',
    subtitle: 'Controle absoluto do presente e projeção do futuro',
    description:
      'Alterne instantaneamente entre o saldo estritamente realizado de caixa e a projeção completa do mês considerando todas as suas contas.',
    icon: 'wallet',
    color: '#3B82F6',
    highlights: [
      {
        icon: 'swap-horizontal',
        label: 'Modo Duplo de Saldo (Real & Previsto)',
        detail: 'Veja o saldo das contas quitadas ou a previsão total de fechamento do mês com 1 toque.',
      },
      {
        icon: 'trending-up',
        label: 'Receitas & Entradas',
        detail: 'Consolide salários, rendas fixas e receitas planejadas com cálculo em tempo real.',
      },
      {
        icon: 'trending-down',
        label: 'Despesas Realizadas & Previstas',
        detail: 'Acompanhe custos pagos e monitore o impacto das pendências no fechamento.',
      },
      {
        icon: 'pie-chart',
        label: 'Economia & Reservas Guardadas',
        detail: 'Visualize o dinheiro economizado no mês sem distorcer o fluxo de caixa corrente.',
      },
    ],
  },
  {
    id: '2',
    badge: 'Agilidade & Gestos',
    title: 'Contas Recorrentes & Deslize',
    subtitle: 'Pague e organize deslizando para os lados',
    description:
      'Gerencie contas fixas e salários com vigência programada, competências independentes e ações instantâneas por gestos.',
    icon: 'repeat',
    color: '#8B5CF6',
    highlights: [
      {
        icon: 'swap-horizontal-outline',
        label: 'Ações por Deslize (Swipe)',
        detail: 'Deslize o item da conta para pagar/receber rapidamente ou excluir com segurança.',
      },
      {
        icon: 'options-outline',
        label: 'Inversão de Lados nos Ajustes',
        detail: 'Defina nas preferências qual lado do gesto você prefere para dar baixa e para apagar.',
      },
      {
        icon: 'calendar-outline',
        label: 'Vigência Programada',
        detail: 'Defina mês de início e fim da recorrência (ex: parcelas ou contratos com término).',
      },
      {
        icon: 'flash-outline',
        label: 'Variação por Competência',
        detail: 'Altere o valor ou status de contas flutuantes (luz, água, cartão) sem afetar o padrão futuro.',
      },
    ],
  },
  {
    id: '3',
    badge: 'Histórico Completo',
    title: 'Extrato & Intervalos Livres',
    subtitle: 'Filtre por mês ou qualquer período de datas',
    description:
      'Navegação temporal completa entre meses fechados ou seleção personalizada de datas com exportação em CSV.',
    icon: 'calendar',
    color: '#0EA5E9',
    highlights: [
      {
        icon: 'calendar-number-outline',
        label: 'Navegação por Competência',
        detail: 'Alterne mês a mês de forma ágil para acompanhar o histórico de fechamentos.',
      },
      {
        icon: 'filter-outline',
        label: 'Filtro por Período Personalizado',
        detail: 'Consulte intervalos livres (ex: 05/01 a 20/02) com soma e saldo do intervalo.',
      },
      {
        icon: 'pricetags-outline',
        label: 'Categorias & Participantes',
        detail: 'Saiba exatamente onde o dinheiro foi investido e identifique o membro responsável.',
      },
      {
        icon: 'download-outline',
        label: 'Exportação para Excel (CSV)',
        detail: 'Baixe relatórios detalhados com um toque para abrir em planilhas ou prestar contas.',
      },
    ],
  },
  {
    id: '4',
    badge: 'Planejamento Inteligente',
    title: 'Tetos de Gastos & Metas',
    subtitle: 'Orçamentos contínuos e cofrinhos para sonhos',
    description:
      'Defina limites inteligentes para não estourar o orçamento e guarde dinheiro para suas metas com acompanhamento visual.',
    icon: 'flag',
    color: '#10B981',
    highlights: [
      {
        icon: 'speedometer-outline',
        label: 'Tetos com Vigência Contínua',
        detail: 'Estabeleça limites por categoria que se renovam automaticamente mês a mês.',
      },
      {
        icon: 'alert-circle-outline',
        label: 'Barras de Alerta Visual',
        detail: 'Cores dinâmicas indicando o percentual consumido antes de atingir o limite.',
      },
      {
        icon: 'trophy-outline',
        label: 'Metas Financeiras & Depósitos',
        detail: 'Crie cofrinhos com prazos e acompanhe o progresso com aportes e resgates.',
      },
      {
        icon: 'stats-chart-outline',
        label: 'Orçado vs. Realizado',
        detail: 'Visão comparativa clara para identificar economias e oportunidades de melhoria.',
      },
    ],
  },
  {
    id: '5',
    badge: 'Colaboração em Nuvem',
    title: 'Espaços & Sincronização',
    subtitle: 'Contas conjuntas sem risco de conflito',
    description:
      'Crie múltiplos espaços para finanças pessoais, família ou negócios com sincronização em nuvem e resolução inteligente de edições.',
    icon: 'people',
    color: '#EC4899',
    highlights: [
      {
        icon: 'briefcase-outline',
        label: 'Múltiplos Espaços de Trabalho',
        detail: 'Alterne entre Finanças Pessoais, Casal, Família ou Empresa direto pelo menu.',
      },
      {
        icon: 'logo-whatsapp',
        label: 'Convite Rápido via WhatsApp',
        detail: 'Compartilhe o código de acesso para familiares ou sócios entrarem em segundos.',
      },
      {
        icon: 'sync-circle-outline',
        label: 'Sincronização Inteligente (Nuvem)',
        detail: 'Atualizações em tempo real com reconciliação segura por carimbo de data/hora.',
      },
      {
        icon: 'shield-outline',
        label: 'Controle de Papéis & Permissões',
        detail: 'Defina quem pode editar ou apenas visualizar, com saída e transferência de titularidade.',
      },
    ],
  },
  {
    id: '6',
    badge: 'Padrão Fintech',
    title: 'Segurança & Personalização',
    subtitle: 'Proteção biométrica, discrição e temas',
    description:
      'Configurações completas para deixar o aplicativo com a sua cara, com bloqueio seguro e modo de privacidade com 1 toque.',
    icon: 'shield-checkmark',
    color: '#F59E0B',
    highlights: [
      {
        icon: 'eye-off-outline',
        label: 'Modo Privacidade (Olhinho)',
        detail: 'Oculte todos os valores na tela com 1 toque para consultar o app em público.',
      },
      {
        icon: 'finger-print-outline',
        label: 'Bloqueio por Biometria',
        detail: 'Proteja seus dados com abertura rápida por digital ou reconhecimento facial.',
      },
      {
        icon: 'moon-outline',
        label: 'Tema Escuro (Dark Mode) & Claro',
        detail: 'Visual refinado e confortável para os olhos durante o dia e a noite.',
      },
      {
        icon: 'options-outline',
        label: 'Preferências em Folha Inferior',
        detail: 'Personalize estilo dos avisos na barra inferior (número, bolinha ou limpa) com modais modernos.',
      },
    ],
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({
        index: nextIdx,
        animated: true,
      });
      setCurrentIndex(nextIdx);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      flatListRef.current?.scrollToIndex({
        index: prevIdx,
        animated: true,
      });
      setCurrentIndex(prevIdx);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar with Logo, Step Indicator & Skip */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top + 8, 20),
          },
        ]}
      >
        <View style={styles.logoRow}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="wallet" size={16} color={theme.primary} />
          </View>
          <Text style={[styles.logoText, { color: theme.text }]}>Finanças</Text>
          <View style={[styles.stepPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.stepPillText, { color: theme.textMuted }]}>
              {currentIndex + 1} de {SLIDES.length}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={completeOnboarding}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.skipBtn}
          activeOpacity={0.7}
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
            {/* Header Icon, Badge, Title & Description */}
            <View style={styles.headerBlock}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: `${item.color}15`,
                    borderColor: `${item.color}35`,
                  },
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
      <View
        style={[
          styles.footerArea,
          {
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom + 12, 20),
          },
        ]}
      >
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatListRef.current?.scrollToIndex({ index: i, animated: true });
                setCurrentIndex(i);
              }}
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

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          {currentIndex > 0 && (
            <TouchableOpacity
              onPress={handlePrev}
              style={[
                styles.prevBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={theme.text} />
              <Text style={[styles.prevBtnText, { color: theme.text }]}>
                Voltar
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleNext}
            style={[
              styles.nextBtn,
              { backgroundColor: theme.primary },
              currentIndex === 0 && { flex: 1 },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>
              {currentIndex === SLIDES.length - 1
                ? 'Começar a Usar o Finduo'
                : 'Próximo Passo'}
            </Text>
            <Ionicons
              name={currentIndex === SLIDES.length - 1 ? 'rocket' : 'arrow-forward'}
              size={18}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  stepPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 4,
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '700',
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
    letterSpacing: -0.4,
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
    marginBottom: 14,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
