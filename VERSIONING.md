# Padrão de Versionamento do Finanças (SemVer)

O aplicativo Finanças adota o padrão **Semantic Versioning (SemVer)** formal, representado no formato:

$$\text{MAJOR} . \text{MINOR} . \text{PATCH} \quad (\text{Exemplo: } 1.1.0)$$

> **Nota:** Não utilizamos números de build na interface do usuário (ex: `Build 1`, `Build 2`). A versão exibida em telas, menus e notas de lançamento é exclusivamente limpa no formato `Versão X.Y.Z`.

---

## 📌 Quando Cada Número Muda?

### 1. `MAJOR` (1º número — ex: `1.0.0` ➔ `2.0.0`)
- **Mudanças estruturais de grande escala**: reformulação visual completa (redesign geral), reestruturação do banco de dados com quebra de retrocompatibilidade ou mudança de arquitetura de dados.
- **Novos marcos de produto**: inclusão de módulos de grande porte (ex: integração bancária Open Finance, multi-moedas internacional, etc.).

### 2. `MINOR` (2º número — ex: `1.0.0` ➔ `1.1.0`)
- **Novas funcionalidades e módulos**: recursos adicionados sem quebrar o que já existe (retrocompatíveis).
- *Exemplos:*
  - Histórico de movimentações (aportes/resgates) em Metas.
  - Definição bidirecional de prazos por quantidade de meses ou mês/ano final.
  - Registro de quem deu baixa na conta (`paidBy`) no extrato.
  - Novos gráficos ou filtros no planejamento financeiro.

### 3. `PATCH` (3º número — ex: `1.1.0` ➔ `1.1.1`)
- **Correções de bugs e ajustes finos (Hotfixes)**:
  - Correção de deep links (ex: fluxo de recuperação de senha).
  - Ajustes de alinhamento visual e estabilidade de cards.
  - Melhorias de tratamento de erro e conexão de rede.
  - Nenhuma funcionalidade nova é adicionada, apenas refinamento e correção.

---

## 🛡️ Regra de Consolidação ("Considerar apenas uma")

- **Consolidação de Lançamentos:**
  Se múltiplas correções ou recursos forem desenvolvidos em um mesmo ciclo/dia, eles não são divididos em várias versões picadas; são agrupados sob **uma única versão consolidada**.
- **Modal de Novidades (What's New):**
  Quando o usuário atualiza o aplicativo, mesmo que ele tenha pulado versões anteriores, o app exibe **apenas uma única atualização consolidada** (as novidades da versão mais recente instalada), evitando empilhar múltiplas telas ou notas repetitivas.
