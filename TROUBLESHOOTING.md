# 🛠️ Registro de Problemas Reconhecidos, Causas e Soluções (Troubleshooting)

Este documento registra os problemas técnicos, desafios de arquitetura e decisões de engenharia enfrentados durante o desenvolvimento do **Finanças App**, servindo como fonte de verdade para evitar regressões futuras.

---

## 1. 🔄 Reordenação Manual (Drag-and-Drop) vs. Ordenação Natural Cronológica

### Sintoma
Ao tentar arrastar uma conta recorrente para reordenar a lista:
* O dispositivo entrava em ciclo de vibração excessiva contínua.
* Os itens vizinhos ficavam piscando e tremendo na tela.
* Ao soltar o item, ocorria um efeito elástico/mola que parecia arremessar o item para cima de forma não natural.

### Causa Raiz
* **Conflito de Gestos no Scroll:** O `PanResponder` vertical do item concorria com o manipulador nativo de rolagem do `ScrollView`.
* **Loop de Histerese:** Conforme um item se movia alguns pixels, o cálculo de troca de slot reordenava a lista em memória; isso alterava a posição física dos itens adjacentes, fazendo com que o item arrastado cruzasse novamente o limiar na direção oposta, disparando dezenas de trocas e vibrações por segundo.
* **Física de Soltura:** A transição com `Animated.spring` na liberação não coincidia perfeitamente com a altura do slot de destino enquanto o scroll estava ativo.

### Solução Definitiva
* **Remoção Completa do Drag-and-Drop:** Eliminou-se toda a complexidade de `PanResponder` vertical, timers de toque longo (`holdTimer`), alças `≡` e cálculos de histerese.
* **Adoção da Ordenação Cronológica Natural (`dueDay`):**
  ```typescript
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => a.dueDay - b.dueDay);
  }, [filteredList]);
  ```
* **Resultado:** Lista 100% estável, rolagem nativa a 60 FPS, sem vibrações espúrias e apresentação natural e cronológica de vencimento que faz muito mais sentido para o usuário financeiro. As ações horizontais por deslize (swipe para pagar e swipe para excluir) foram preservadas com total suavidade.

---

## 2. 🗑️ Exclusão de Contas Recorrentes sem Destruir o Histórico

### Sintoma
Ao excluir uma conta fixa no mês atual (ex: um cancelamento de Netflix em Outubro), todo o histórico de pagamentos de Janeiro a Setembro era apagado do extrato e dos relatórios passados.

### Causa Raiz
A operação de exclusão executava um `DELETE` absoluto na linha da tabela `recurrings`, cascateando a perda dos registros em todas as competências.

### Solução Definitiva
Criação do modal de escopo temporal [`DeleteRecurringScopeModal`](./src/modules/recurrings/components/DeleteRecurringScopeModal.tsx), oferecendo 3 opções claras ao usuário:
1. **Apenas deste mês:** Adiciona a competência atual (`YYYY-MM`) no array `excludedMonths` da conta. O item não é exibido nem cobrado no mês atual, mas segue existindo nos meses passados e futuros.
2. **Deste mês em diante:** Preenche o campo `endDate` da conta com o mês anterior (`YYYY-MM`), preservando 100% do histórico financeiro acumulado.
3. **Excluir tudo (Definitivo):** Remove a conta permanentemente de todas as competências (apenas quando o usuário realmente deseja expurgar o cadastro).

---

## 3. 💡 Contas de Consumo com Valores Variáveis Mês a Mês

### Sintoma
Ao alterar o valor de uma conta de energia ou água (que varia a cada fatura), a alteração modificava o valor retroativamente nos meses passados, distorcendo os balanços já consolidados.

### Causa Raiz
A entidade possuía apenas o campo global `amount: number`.

### Solução Definitiva
* Implementou-se o campo `monthlyOverrides?: Record<string, number>` na entidade e na coluna `monthly_overrides JSONB` no Supabase:
  ```json
  {
    "2026-09": 142.50,
    "2026-10": 185.20
  }
  ```
* Ao editar o valor pela listagem, o usuário escolhe se a alteração vale **Apenas para este mês**, **Deste mês em diante** ou se redefine o **Valor padrão**.

---

## 4. 🛡️ Segurança e Aprovação Obrigatória em Espaços Compartilhados

### Sintoma
Qualquer pessoa que obtivesse o código de 6 caracteres entrava diretamente no espaço compartilhado e obtinha acesso imediato às finanças da família ou da empresa.

### Causa Raiz
O repositório realizava a vinculação direta do membro na tabela `workspace_members` no momento em que o código era inserido.

### Solução Definitiva
* Criou-se a tabela `workspace_join_requests` no Supabase.
* **Fluxo com Triagem:**
  1. O usuário digita o código de convite e seu pedido fica com status `pending`.
  2. O proprietário visualiza um badge de notificação e a lista de solicitações pendentes na tela de Espaços.
  3. Ao aceitar, o proprietário escolhe formalmente o papel:
     * **Pode Editar (Editor):** Lança despesas, dá baixa em contas e gerencia orçamentos.
     * **Apenas Ver (Visualizador):** Visualiza saldos e relatórios em modo somente leitura.
  4. Nenhum dado financeiro é baixado pelo dispositivo solicitante enquanto o pedido estiver pendente.

---

## 5. 📱 Biometria Nativa e Bloqueio de Sessão no Android

### Sintoma
Em alguns modelos Android com leitor de digital sob a tela, o app travava em tela preta ou não respondia se o usuário minimizasse e retornasse rapidamente ao app.

### Causa Raiz
Chamadas concorrentes a `authenticateAsync` do `expo-local-authentication` antes do ciclo de vida da tela estar totalmente em foco (`AppState`).

### Solução Definitiva
* O [`SecurityContext.tsx`](./src/services/security/SecurityContext.tsx) gerencia o estado da biometria com travas de ciclo de vida (`AppState` listener calibrado).
* Validação prévia com `hasHardwareAsync()` e `isEnrolledAsync()`.
* Ativação de fallback nativo do sistema operacional (PIN ou padrão de desbloqueio do Android) quando a digital falha repetidamente.

---

## 6. 🌐 Arquitetura Offline-First e Sincronização com Supabase

### Sintoma
Telas travadas ou lentas ao abrir em conexões de internet fracas ou 4G instável.

### Causa Raiz
Arquitetura tradicional dependente de requisições HTTP bloqueantes antes de renderizar a interface.

### Solução Definitiva
* **Leitura e Gravação Instantânea Local:** Todas as telas consomem os dados do `AsyncStorage` via `FinanceContext`. A interface responde em 0ms.
* **Sincronização em Segundo Plano:** O [`CloudSyncService.ts`](./src/services/supabase/CloudSyncService.ts) envia lotes de alterações para o Supabase em background e realiza download de deltas com comparação de carimbo de data/hora (`updated_at` / `created_at`).
* **Purga Automática de Cache:** Ao trocar de workspace ou deslogar, o cache de dados do workspace anterior é purgado para evitar vazamento de memória ou contaminação de dados.

---

## 7. 📁 Pasta Espelho `C:\Financas` (Uso Exclusivo para Compilação Nativa Local)

### Contexto e Motivação
* O caminho principal do projeto contém um espaço em branco (`Financas android`), o que quebra ferramentas nativas do Android (CMake, Ninja e NDK) durante builds locais no Windows (`react-native-safe-area-context` C++ codegen).
* A pasta `C:\Financas` existe na raiz do disco para servir de ambiente de build sem espaços e com caminho curto (evitando o limite `MAX_PATH` de 260 caracteres do Windows).

### Regra Operacional Atualizada
* **Espelhar sob demanda:** A pasta `C:\Financas` só deve ser sincronizada quando houver solicitação explícita de compilação nativa local (ex: `gradlew assembleRelease` ou build local do Android).
* No fluxo habitual de desenvolvimento, testes com Expo Go, checagem de tipos (`cmd /c npx tsc --noEmit`) e commits no Git, trabalha-se exclusivamente no diretório principal.
