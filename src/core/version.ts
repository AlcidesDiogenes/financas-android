// Controlador Central de Versão e Notas de Atualização (Changelog)
export interface ReleaseNote {
  version: string;
  buildNumber: number;
  date: string;
  title: string;
  highlight: string;
  changes: {
    icon: string;
    title: string;
    description: string;
  }[];
}

export const APP_VERSION_CONFIG = {
  version: '1.0.0',
  buildNumber: 2,
  releaseDate: '06/10/2026',
  environment: 'production',
  platform: 'Android',
};

export const getAppVersionString = (): string => {
  return `Versão ${APP_VERSION_CONFIG.version} (Build ${APP_VERSION_CONFIG.buildNumber})`;
};

export const RELEASE_HISTORY: ReleaseNote[] = [
  {
    version: '1.0.0',
    buildNumber: 2,
    date: '06/10/2026',
    title: 'Isolamento Estrito de Contas & Privacidade Multi-Tenant 🔒',
    highlight:
      'Garantia matemática de privacidade: cada usuário possui seu espaço pessoal 100% isolado na nuvem e no dispositivo. Espaços compartilhados são restritos estritamente aos membros autorizados.',
    changes: [
      {
        icon: 'lock-closed-outline',
        title: 'Espaços Pessoais Exclusivos',
        description:
          'O espaço pessoal de cada usuário agora utiliza um identificador exclusivo criptografado vinculado à sua conta, impedindo qualquer cruzamento de dados com terceiros.',
      },
      {
        icon: 'people-outline',
        title: 'Controle de Compartilhamento',
        description:
          'Espaços compartilhados exigem permissão explícita na nuvem. Apenas membros convidados e confirmados visualizam ou interagem com os lançamentos.',
      },
      {
        icon: 'trash-outline',
        title: 'Purga Automática de Cache Órfão',
        description:
          'O sincronizador agora remove automaticamente do armazenamento local qualquer dado que não pertença aos espaços autorizados da conta conectada.',
      },
    ],
  },
  {
    version: '1.0.0',
    buildNumber: 1,
    date: '06/10/2026',
    title: 'Lançamento Oficial Finanças 1.0 🚀',
    highlight:
      'Bem-vindo à versão oficial de lançamento do Finanças! Gestão completa de caixa, ações por deslize, múltiplos espaços e segurança fintech.',
    changes: [
      {
        icon: 'wallet-outline',
        title: 'Saldo Real vs Previsto Total',
        description:
          'Alterne instantaneamente entre o saldo estritamente consolidado de caixa e a projeção total planejada até o fim do mês.',
      },
      {
        icon: 'swap-horizontal-outline',
        title: 'Contas Recorrentes & Ações por Deslize',
        description:
          'Deslize itens para dar baixa rápida ou excluir com segurança, com vigências programadas e controle independente de competências.',
      },
      {
        icon: 'people-outline',
        title: 'Espaços de Trabalho & Sincronização Inteligente',
        description:
          'Crie espaços pessoais, familiares ou empresariais com convites rápidos e sincronização em nuvem resiliente por carimbo de hora.',
      },
      {
        icon: 'pie-chart-outline',
        title: 'Tetos de Gastos, Orçamentos & Metas',
        description:
          'Estabeleça limites contínuos por categoria com alertas visuais e guarde reservas financeiras com depósitos e acompanhamento de metas.',
      },
      {
        icon: 'shield-checkmark-outline',
        title: 'Segurança, Biometria & Privacidade',
        description:
          'Proteja seus dados com biometria, oculte valores na tela com 1 toque no modo privacidade e desfrute de um design escuro ou claro impecável.',
      },
      {
        icon: 'sparkles-outline',
        title: 'Novo Tutorial Interativo (Onboarding)',
        description:
          'Apresentação completa de todas as funcionalidades e atalhos do aplicativo para dominar suas finanças desde o primeiro dia.',
      },
    ],
  },
];
