// Controlador Central de Versão e Notas de Atualização (Changelog)
// Padrão Semantic Versioning (SemVer): MAJOR.MINOR.PATCH (ex: 1.1.0)
export interface ReleaseNote {
  version: string;
  buildNumber?: number;
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
  version: '1.1.0',
  releaseDate: '08/10/2026',
  environment: 'production',
  platform: 'Android',
};

export const getAppVersionString = (): string => {
  return `Versão ${APP_VERSION_CONFIG.version}`;
};

export const RELEASE_HISTORY: ReleaseNote[] = [
  {
    version: '1.1.0',
    date: '08/10/2026',
    title: 'Melhorias em Metas, Recorrências e Recuperação de Senha 🎯',
    highlight:
      'Nova experiência de metas com histórico de movimentações, prazo flexível em mês/ano, identificação de quem deu baixa na conta no extrato e recuperação de senha direto no app.',
    changes: [
      {
        icon: 'time-outline',
        title: 'Histórico de Aportes e Resgates de Metas',
        description:
          'Toque no card de qualquer meta para visualizar o histórico cronológico de todos os depósitos e resgates com valores, data/hora e autor.',
      },
      {
        icon: 'calendar-outline',
        title: 'Prazos de Metas em Mês/Ano Bidirecional',
        description:
          'Defina o prazo de conclusão digitando a quantidade de meses ou escolhendo o mês e ano final, com cálculo automático e sugestão mensal de economia.',
      },
      {
        icon: 'person-circle-outline',
        title: 'Quem Deu Baixa na Conta (Extrato)',
        description:
          'Veja no extrato quem confirmou o pagamento ou recebimento ("✓ Pago por [Nome]"), mantendo o card de contas fixas limpo.',
      },
      {
        icon: 'key-outline',
        title: 'Recuperação de Senha Integrada',
        description:
          'Ao clicar no link de recuperação de senha enviado por e-mail, o aplicativo abre imediatamente a tela para cadastrar sua nova senha com segurança.',
      },
      {
        icon: 'cloud-download-outline',
        title: 'Atualizações Online Centralizadas no Modal',
        description:
          'A busca, progresso de download, aviso de manter tela ligada e mensagens de conexão agora acontecem 100% dentro do modal elegante.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '06/10/2026',
    title: 'Aprovação Prévia de Entrada em Espaços Compartilhados 🛡️',
    highlight:
      'Controle absoluto do proprietário: agora, quem insere o código de convite envia uma solicitação pendente. O dono do espaço decide se aceita ou recusa e define se a pessoa poderá editar ou apenas visualizar.',
    changes: [
      {
        icon: 'hand-right-outline',
        title: 'Solicitação com Aprovação Obrigatória',
        description:
          'Nenhum usuário entra mais diretamente por código. A solicitação fica pendente até a revisão formal do proprietário.',
      },
      {
        icon: 'options-outline',
        title: 'Definição de Papel na Aprovação',
        description:
          'Ao aprovar uma solicitação, o proprietário escolhe imediatamente se a pessoa terá permissão de "Pode Editar" ou "Apenas Ver".',
      },
      {
        icon: 'shield-checkmark-outline',
        title: 'Bloqueio de Dados até Autorização',
        description:
          'Usuários pendentes não têm acesso a lançamentos, orçamentos ou contas até que sua entrada seja confirmada.',
      },
    ],
  },
  {
    version: '1.0.0',
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
