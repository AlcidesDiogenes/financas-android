# Diretrizes e Regras do Projeto (Finanças Android)

## 🚨 REGRAS INVIOLÁVEIS DO PROJETO

1. **PLANEJAMENTO E APROVAÇÃO PRÉVIA ANTES DE CODAR:**
   - Antes de criar, alterar ou editar qualquer código ou arquivo do projeto:
     - Elaborar plano detalhado explicando o que será feito, a causa raiz do problema e os arquivos impactados.
     - **Aguardar aprovação explícita do usuário**: É terminantemente proibido alterar código sem aprovação prévia do plano.
2. **NUNCA COMMITAR OU DAR PUSH NO GIT SEM CONFIRMAÇÃO:**
   - Jamais executar `git commit` ou `git push` sem autorização explícita e direta do usuário na mensagem.
3. **ESPELHO EM `C:\Financas` (SOMENTE PARA COMPILAÇÃO LOCAL):**
   - A pasta `C:\Financas` serve exclusivamente para contornar problemas de espaços no caminho durante compilações nativas locais do Android (Gradle/CMake/NDK).
   - **Espelhar APENAS quando for solicitado explicitamente um comando de compilação nativa local** (ex: `gradlew assembleRelease` ou build nativo local do Android).
   - No desenvolvimento diário, testes com Expo Go, commits no Git e checagem de tipos (`cmd /c npx tsc --noEmit`), trabalhar e validar diretamente no repositório principal `C:\Users\alcidesdiogenes\Desktop\Projetos\Financas android`.

---

## 📱 Arquitetura Real do Projeto (Expo / React Native)

> **ATENÇÃO:** Este projeto **NÃO** utiliza `expo-router` e **NÃO** possui rotas baseadas em arquivos em `src/app/`.
> A navegação é baseada em abas nativas gerenciada por estado central no componente `src/navigation/MainNavigator.tsx`.

### Estrutura de Pastas e Responsabilidades
- `src/navigation/MainNavigator.tsx`: Navegador principal por abas (Início, Extrato, Recorrentes, Planejar, Ajustes, Espaços).
- `src/screens/*`: Telas completas do aplicativo (`HomeScreen`, `TransactionsScreen`, `RecurringsScreen`, `PlanningScreen`, `SettingsScreen`, `WorkspacesScreen`, `AuthScreen`, `OnboardingScreen`).
- `src/modules/*`: Módulos de domínio desacoplados:
  - `recurrings`: Componentes, tipos e lógica de contas fixas e proventos.
  - `workspaces`: Gerenciamento de espaços Solo e Compartilhados, aprovação de membros e permissões.
  - `FinanceContext.tsx`: Contexto central que orquestra dados financeiros em memória e sincronização.
- `src/services/*`: Serviços externos e infraestrutura:
  - `auth`: Autenticação e sessão do usuário (`AuthContext.tsx`).
  - `security`: Biometria nativa e bloqueio de tela por inatividade (`SecurityContext.tsx`).
  - `supabase`: Cliente Supabase (`supabaseClient.ts`) e sincronizador resiliente (`CloudSyncService.ts`).
- `src/core/*`: Design System, componentes base (`Button`, `Card`, `Input`, `Badge`, `ModalContainer`), tema claro/escuro (`ThemeContext.tsx`), privacidade (`PrivacyContext.tsx`), utilitários de formatação e controle de versão (`src/core/version.ts`).

### Estratégia de Dados (Offline-First)
- **Persistência Local Instantânea:** Todas as mutações são salvas imediatamente no `AsyncStorage`, garantindo resposta imediata na UI sem travamentos.
- **Sincronização em Nuvem em Segundo Plano:** O `CloudSyncService` sincroniza alterações com o Supabase quando há conexão com a internet.
- **Isolamento por Workspace:** Toda transação, recorrência, orçamento e meta possui `workspace_id` associado, garantindo isolamento total entre espaços.

### Padrões de Código e UI
- **TypeScript Strict Mode:** Toda tipagem deve ser estrita, evitando `any`.
- **Tema Dinâmico:** Sempre consumir cores e tokens via `useTheme()` (`theme.background`, `theme.card`, `theme.primary`, `theme.text`, etc.).
- **Gesto e Animações:** Usar `Animated` nativo da `react-native`. Ações de swipe (arrastar para pagar/excluir) devem ter tolerância calibrada e retorno suave com mola.
- **Sem Drag-and-Drop em Listas com Scroll:** As listas devem manter ordenação cronológica ou natural previsível (ex: dia de vencimento `dueDay`), evitando conflitos entre `PanResponder` e `ScrollView`.

### Comandos Essenciais
```bash
npx expo start              # Inicia o servidor de desenvolvimento Expo
cmd /c npx tsc --noEmit     # Verificação rigorosa de tipos TypeScript (deve passar com 0 erros)
npx expo install <package>  # Instala pacotes compatíveis com o SDK do Expo
```
