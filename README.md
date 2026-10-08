# 💰 Finanças App

Aplicativo móvel completo de gestão financeira pessoal e colaborativa, desenvolvido em **React Native**, **Expo (SDK 57)**, **TypeScript** e **Supabase (PostgreSQL com Realtime)**, baseado em **Clean Architecture**, **SOLID** e arquitetura **Offline-First**.

---

## 🚀 Funcionalidades Principais

### 1. 📊 Dashboard Financeiro & Projeção de Caixa
* **Balanço Líquido em Tempo Real:** Receitas, despesas, saldo atual consolidado e sobra livre.
* **Saldo Real vs. Saldo Previsto:** Alternância instantânea entre o que já foi efetivamente liquidado e a projeção financeira até o fim do mês com contas pendentes.
* **Distribuição de Gastos:** Gráficos visuais por categorias financeiras.
* **Seletor de Competência:** Navegação mensal e anual simplificada.

### 2. 👥 Múltiplos Espaços de Trabalho (Solo & Compartilhado)
* **Espaço Solo:** Totalmente privado, individual e criptografado no armazenamento.
* **Espaços Compartilhados (Família, Casal ou Projetos):**
  * Criação com geração automática de código de convite de 6 caracteres.
  * **Aprovação Prévia Obrigatória:** Qualquer pessoa que insere o código fica em estado *pendente* até a aprovação formal do proprietário.
  * **Controle Granular de Permissões:** O dono define na aprovação se o membro terá permissão de **Editor** (*Pode lançar e editar*) ou **Visualizador** (*Apenas ver*).
  * **Isolamento Multi-Tenant:** Todas as transações, contas e metas são isoladas estritamente por `workspace_id`.

### 3. 🔄 Contas Recorrentes, Assinaturas & Proventos
* **Gestão de Despesas e Rendas Fixas:** Aluguel, internet, streaming, salários, dividendos, etc.
* **Ordenação Cronológica Natural:** Listagem limpa e estável ordenada automaticamente pelo dia do vencimento/recebimento (`dueDay`).
* **Ações por Deslize (Swipe):**
  * Deslize lateral suave para marcar como Pago/Recebido ou Desmarcar.
  * Deslize reverso para exclusão com confirmação.
* **Escopo Temporal de Exclusão (Proteção de Histórico):**
  * Ao excluir uma recorrência, escolha entre:
    1. **Apenas deste mês:** Adiciona o mês aos `excludedMonths` sem apagar os outros meses.
    2. **Deste mês em diante:** Define `endDate` retroativo, preservando o histórico passado.
    3. **Excluir tudo:** Remove permanentemente a recorrência de todas as competências.
* **Valores Variáveis por Competência (`monthlyOverrides`):** Altere o valor de uma conta de consumo (ex: energia) no mês vigente sem afetar o valor cadastrado nos meses anteriores.
* **Vigência Programada:** Suporte a datas de início (`startDate`) e término (`endDate`).

### 4. 🎯 Planejamento Financeiro: Tetos & Metas
* **Orçamentos Mensais:** Tetos de gastos por categoria com barras visuais de progresso (*No Limite*, *Atenção*, *Estourado*).
* **Metas Financeiras (Cofres):** Objetivos de economia com valor alvo, data limite, cálculo de economia mensal recomendada e botões de aporte e resgate rápidos com geração opcional de transação.

### 5. 🔒 Segurança, Biometria & Privacidade
* **Biometria Nativa:** Bloqueio e desbloqueio por impressão digital (ultrassônica/óptica) ou reconhecimento facial via `expo-local-authentication`.
* **Modo Privacidade:** Botão de olho no cabeçalho para ofuscar todos os valores monetários sensíveis (`R$ •••••`).
* **Bloqueio por Inatividade:** Proteção de sessão automática ao fechar ou alternar de app.

### 6. ☁️ Sincronização em Nuvem em Tempo Real (Supabase)
* **Arquitetura Offline-First:** Toda operação é gravada imediatamente no `AsyncStorage` local (UI com latência zero) e sincronizada em segundo plano com o Supabase.
* **Recuperação de Falhas:** Fila de sincronização e reconciliação com carimbo de hora.

### 7. 📄 Exportação & Compartilhamento
* Geração nativa de extratos em planilhas **CSV** formatadas, compatíveis com Excel e Google Sheets, com compartilhamento direto via WhatsApp, e-mail ou nuvem.

### 8. 🎨 Design System, Temas & Novidades
* **Dark Mode & Light Mode:** Suporte completo com contraste calibrado.
* **Onboarding Interativo:** Tutorial guiado no primeiro acesso de novos usuários.
* **Modal de Novidades ("What's New"):** Exibição automática do changelog detalhado quando o app é atualizado para uma nova versão.

---

## 🛠️ Tecnologias e Bibliotecas

| Categoria | Tecnologia | Versão |
|---|---|---|
| **Core** | React Native | 0.86.3 |
| **Plataforma** | Expo | SDK 57.0.26 |
| **Linguagem** | TypeScript | 6.0.3 (Strict Mode) |
| **Backend & Nuvem** | Supabase | `@supabase/supabase-js` 2.117.2 |
| **Persistência Local** | AsyncStorage | `@react-native-async-storage/async-storage` 2.2.0 |
| **Biometria** | Local Authentication | `expo-local-authentication` 57.0.3 |
| **Compartilhamento** | Expo Sharing & FileSystem | `expo-sharing` / `expo-file-system` |
| **Ícones** | Ionicons | `@expo/vector-icons` 15.0.2 |

---

## 🏗️ Padrões de Projeto & Arquitetura

O projeto adota uma arquitetura em camadas focada em modularidade e manutenibilidade:

```
src/
├── core/                  # Elementos fundamentais do app
│   ├── components/        # Componentes reutilizáveis (Button, Card, Input, Badge, Modals)
│   ├── theme/             # Contextos de Tema, Privacidade e Badges
│   └── utils/             # Utilitários de moeda, data, categorias e versão
├── modules/               # Módulos de domínio de negócio (Clean Architecture)
│   ├── recurrings/        # Componentes, tipos e lógica de contas fixas
│   ├── workspaces/        # Repositórios e contexto de espaços compartilhados
│   └── FinanceContext.tsx # Orquestrador central de finanças (Estado Global)
├── navigation/            # Navegação centralizada
│   └── MainNavigator.tsx  # Navegação por abas com badges inteligentes
├── screens/               # Telas do aplicativo
│   ├── HomeScreen.tsx
│   ├── TransactionsScreen.tsx
│   ├── RecurringsScreen.tsx
│   ├── PlanningScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── WorkspacesScreen.tsx
│   ├── AuthScreen.tsx
│   └── OnboardingScreen.tsx
└── services/              # Serviços de infraestrutura
    ├── auth/              # Contexto e gerenciamento de autenticação
    ├── security/          # Biometria e segurança nativa
    └── supabase/          # Cliente Supabase e CloudSyncService
```

### Princípios Chave:
1. **Single Source of Truth:** `FinanceContext` centraliza os estados de transações, recorrências, orçamentos e metas em memória.
2. **Offline-First:** Leitura e escrita no disco antes da nuvem. O usuário nunca espera requisições HTTP para ver uma alteração refletida na tela.
3. **Isolamento de Negócio:** Cada entidade carrega seu `workspaceId`. Espaços Solo usam prefixos únicos locais e espaços compartilhados utilizam UUIDs persistidos na nuvem.

---

## 📱 Como Rodar o Projeto

### Pré-requisitos
* **Node.js** v18+ instalado.
* Celular físico com o app **Expo Go** instalado (Android ou iOS) ou emulador Android configurado.

### Passo a Passo:
1. Clone o repositório:
   ```bash
   git clone https://github.com/AlcidesDiogenes/financas-android.git
   cd financas-android
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```

4. Abra o **Expo Go** no celular e escaneie o QR Code exibido no terminal.

---

## ☁️ Configuração do Banco de Dados (Supabase)

O aplicativo pode operar offline ou sincronizado com o Supabase.

1. Acesse seu painel em [supabase.com](https://supabase.com/) e crie um novo projeto PostgreSQL.
2. No menu lateral, acesse **SQL Editor** ➔ **New Query**.
3. Copie todo o conteúdo de [`supabase_schema.sql`](./supabase_schema.sql), cole no editor e clique em **Run**. Ele cria as tabelas e os índices:
   * `workspaces` e `workspace_members` (membros por e-mail, com papéis `owner`, `editor`, `viewer` e `pending`)
   * `transactions`
   * `recurrings` e `recurring_month_records`
   * `budgets` e `goals`
4. **Obrigatório:** em uma nova query, rode também [`supabase_security_fix.sql`](./supabase_security_fix.sql). Ele cria as regras de acesso (RLS) por membro do espaço, a busca por código de convite e a função de exclusão de conta. Sem ele, o RLS fica ligado sem nenhuma regra e o app não consegue ler nem gravar dados.
5. Em **Authentication ➔ Sign In / Providers**, mantenha **Confirm email** ligado: as regras de acesso identificam o usuário pelo e-mail.
6. Para o tempo real entre celulares, rode [`supabase_realtime.sql`](./supabase_realtime.sql), que coloca as tabelas na publicação do Realtime. O `supabase_schema.sql` já faz isso num banco novo; o script serve para conferir ou corrigir um banco existente.

> O endereço e a chave pública do projeto ficam fixos em `src/services/supabase/supabaseClient.ts`. Para usar outro projeto Supabase, altere as constantes `DEFAULT_SUPABASE_URL` e `DEFAULT_SUPABASE_ANON_KEY` e publique uma nova versão do app.
>
> Bancos criados antes de outubro/2026 devem rodar também [`supabase_sync_fix.sql`](./supabase_sync_fix.sql), que acrescenta as colunas sincronizadas a partir dessa versão. Em um banco novo, o `supabase_schema.sql` já as inclui.

---

## 📦 Build e Geração de APK

Para gerar um APK instalável no Android usando o serviço na nuvem da Expo (EAS Build):

```bash
# 1. Instalar EAS CLI se ainda não tiver
npm install -g eas-cli

# 2. Fazer login na conta Expo
eas login

# 3. Gerar APK de visualização direta
eas build -p android --profile preview
```

---

## 📚 Documentação Complementar

* [**AGENTS.md**](./AGENTS.md): Regras de desenvolvimento, restrições e diretrizes operacionais.
* [**TROUBLESHOOTING.md**](./TROUBLESHOOTING.md): Histórico completo de problemas enfrentados, causas raiz e soluções de engenharia implementadas.
