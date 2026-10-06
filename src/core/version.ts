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
  version: '1.3.9',
  buildNumber: 15,
  releaseDate: '06/10/2026',
  environment: 'production',
  platform: 'Android',
};

export const getAppVersionString = (): string => {
  return `Versão ${APP_VERSION_CONFIG.version} (Build ${APP_VERSION_CONFIG.buildNumber})`;
};

export const RELEASE_HISTORY: ReleaseNote[] = [
  {
    version: '1.3.9',
    buildNumber: 15,
    date: '06/10/2026',
    title: 'Arquitetura Robusta & Alta Performance 🚀',
    highlight: 'Sincronização inteligente com resolução de conflitos (Last-Write-Wins), desacoplamento de modais e índices de alta escala.',
    changes: [
      {
        icon: 'sync-circle-outline',
        title: 'Reconciliação Inteligente Nuvem / Local',
        description: 'Chega de sobrescrita cega! O app agora sincroniza dados comparando carimbos de atualização (timestamps), garantindo que edições offline ou simultâneas nunca sejam perdidas.',
      },
      {
        icon: 'layers-outline',
        title: 'Modularização e Desempenho Visual',
        description: 'Telas grandes e modais complexos foram modularizados em componentes independentes, tornando a navegação mais fluida e reduzindo o consumo de memória.',
      },
      {
        icon: 'speedometer-outline',
        title: 'Pronto para Anos de Dados',
        description: 'Consultas com limites de segurança e índices compostos de alta performance no banco para navegação instantânea em históricos com milhares de lançamentos.',
      },
    ],
  },
  {
    version: '1.3.8',
    buildNumber: 14,
    date: '06/10/2026',
    title: 'Ajustes Mais Profissionais & Minimalistas ✨',
    highlight: 'Interface de Preferências redesenhada no padrão fintech moderno com seletores em bottom sheet e navegação elegante.',
    changes: [
      {
        icon: 'sparkles-outline',
        title: 'Design Limpo e Profissional',
        description: 'Os botões aglomerados foram substituídos por células elegantes com o valor atual em destaque e setas discretas.',
      },
      {
        icon: 'options-outline',
        title: 'Seletores em Folha Inferior (Modal)',
        description: 'Ao tocar em qualquer preferência (Avisos, Cálculo de Saldo ou Gesto de Deslize), abre-se um modal dedicado com cards explicativos e feedback instantâneo.',
      },
      {
        icon: 'color-palette-outline',
        title: 'Harmonia Visual Fintech',
        description: 'Alinhamento visual uniforme mantendo a consistência com biometria, tema escuro e gestão de conta.',
      },
    ],
  },
  {
    version: '1.3.7',
    buildNumber: 13,
    date: '06/10/2026',
    title: 'Ações por Deslize (Swipe) e Exclusão Segura ✨',
    highlight: 'Deslize para marcar como pago ou excluir, inversão de lados nos ajustes e fim de cliques acidentais.',
    changes: [
      {
        icon: 'swap-horizontal-outline',
        title: 'Deslizar para Pagar ou Excluir',
        description: 'Deslize o item da conta para os lados para marcar como pago/recebido rapidamente ou excluir com confirmação.',
      },
      {
        icon: 'options-outline',
        title: 'Inversão de Lados nos Ajustes',
        description: 'Escolha em Ajustes qual lado você prefere para dar baixa nas contas e qual lado prefere para exclusão.',
      },
      {
        icon: 'shield-checkmark-outline',
        title: 'Proteção contra Exclusão Acidental',
        description: 'O botão de lixeira foi removido da lista principal e alocado com destaque seguro dentro do formulário de edição.',
      },
      {
        icon: 'people-outline',
        title: 'Novo Modal de Gestão de Membros',
        description: 'Substituição dos diálogos nativos do sistema por um modal moderno, com perfil do participante, cards explicativos de permissão e transferência segura.',
      },
      {
        icon: 'calculator-outline',
        title: 'Saldo Real vs Previsto Total Dinâmico',
        description: 'No modo Previsto, os cards de Saldo, Receitas e Despesas agora calculam dinamicamente todas as entradas e saídas planejadas do mês.',
      },
      {
        icon: 'people-outline',
        title: 'Gestão Segura de Espaços',
        description: 'Membros convidados podem sair do espaço a qualquer momento, e apenas o proprietário pode excluir ou transferir a titularidade.',
      },
      {
        icon: 'alert-circle-outline',
        title: 'Validação Vermelha por Campo',
        description: 'Avisos visuais imediatos embaixo de cada campo quando faltar preenchimento ou valor inválido.',
      },
      {
        icon: 'cloud-download-outline',
        title: 'Atualizações Mais Rápidas e Limpas',
        description: 'Feedback de download refinado com progresso contínuo e sem travas.',
      },
      {
        icon: 'key-outline',
        title: 'Teclado e Layout Otimizados',
        description: 'Campos de login e modais sobem perfeitamente quando o teclado do celular abre.',
      },
    ],
  },
  {
    version: '1.3.6',
    buildNumber: 8,
    date: '06/10/2026',
    title: 'Notas de Atualização & Boas-Vindas 🎉',
    highlight: 'Veja tudo o que mudou no aplicativo de forma clara e interativa.',
    changes: [
      {
        icon: 'sparkles',
        title: 'Mural de Novidades',
        description: 'Exibição automática de tudo que mudou desde a sua versão anterior ao atualizar o app.',
      },
      {
        icon: 'calendar',
        title: 'Vigência Otimizada em Recorrências',
        description: 'Início de vigência simplificado: não polui mais a tela inicial e aparece apenas na aba "Todos".',
      },
      {
        icon: 'star',
        title: 'Espaço Financeiro Padrão',
        description: 'Defina seu espaço favorito para abrir direto ao iniciar o app ou relogar.',
      },
      {
        icon: 'cloud-download',
        title: 'Atualizações em 2 Etapas',
        description: 'Feedback visual dividido entre Download e Instalação, sem travas ou sensação de espera.',
      },
      {
        icon: 'notifications',
        title: 'Avisos da Barra Inferior',
        description: 'Escolha se deseja ver número, bolinha discreta ou nenhum alerta na barra de navegação.',
      },
    ],
  },
  {
    version: '1.3.5',
    buildNumber: 7,
    date: '06/10/2026',
    title: 'Espaço Padrão e Atualização em Etapas',
    highlight: 'Definição de espaço padrão e feedback transparente no download OTA.',
    changes: [
      {
        icon: 'star',
        title: 'Tornar Espaço Padrão',
        description: 'Escolha qual espaço financeiro é aberto automaticamente ao acessar o aplicativo.',
      },
      {
        icon: 'construct',
        title: 'Instalação Transparente',
        description: 'Separação clara entre a fase de download dos arquivos e a fase de instalação dos pacotes.',
      },
      {
        icon: 'sync',
        title: 'Persistência de Contas Recorrentes',
        description: 'Status de pago/recebido mantido seguro na nuvem mesmo ao alternar ou deslogar da conta.',
      },
    ],
  },
  {
    version: '1.3.4',
    buildNumber: 6,
    date: '06/10/2026',
    title: 'Personalização da Barra Inferior & Modais',
    highlight: 'Opções de visualização de alertas e adaptação inteligente do teclado.',
    changes: [
      {
        icon: 'options',
        title: 'Estilo de Alertas na Barra',
        description: 'Escolha entre número (3), bolinha ou barra limpa sem avisos.',
      },
      {
        icon: 'keypad',
        title: 'Teclado Inteligente',
        description: 'O teclado virtual não cobre mais os campos de digitação em nenhum modal do app.',
      },
      {
        icon: 'color-palette',
        title: 'Harmonia Visual sem Sobreposições',
        description: 'Cards de perfil e itens de contas recorrentes reformulados para nunca colidirem.',
      },
    ],
  },
  {
    version: '1.3.3',
    buildNumber: 5,
    date: '06/10/2026',
    title: 'Correção de Altura de Teclado',
    highlight: 'Melhorias de responsividade em aparelhos Android com teclados grandes.',
    changes: [
      {
        icon: 'phone-portrait',
        title: 'ModalContainer com Auto-Scroll',
        description: 'Campos de formulários deslizam para o topo automaticamente quando o teclado abre.',
      },
    ],
  },
  {
    version: '1.3.2',
    buildNumber: 4,
    date: '06/10/2026',
    title: 'Segurança & Edição de Nome de Perfil',
    highlight: 'Confirmação obrigatória de senha e troca do nome de exibição.',
    changes: [
      {
        icon: 'lock-closed',
        title: 'Segurança Reforçada',
        description: 'Alteração de senha só é permitida após confirmação da senha atual.',
      },
      {
        icon: 'person',
        title: 'Editar Nome do Perfil',
        description: 'Altere seu nome de exibição no app a qualquer momento em Ajustes.',
      },
    ],
  },
];
