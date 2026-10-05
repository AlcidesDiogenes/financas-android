# 💰 Finanças App

Aplicativo móvel completo de controle financeiro pessoal e colaborativo, desenvolvido em **React Native**, **Expo**, **TypeScript** e **Supabase** seguindo princípios de **Clean Architecture** e **SOLID**.

---

## 🚀 Funcionalidades Principais

* **📊 Dashboard Financeiro Completo:**
  * Balanço líquido em tempo real (Receitas, Despesas, Saldo Atual).
  * Projeção financeira até o fim do mês considerando débitos pendentes.
  * Gráfico interativo com distribuição de despesas por categoria.

* **🔒 Segurança & Privacidade:**
  * **Biometria Nativa:** Bloqueio e desbloqueio por impressão digital (ultrassônica) ou reconhecimento facial.
  * **Modo Privacidade:** Botão de olho para ocultar valores sensíveis (`R$ •••••`).

* **👥 Modo Solo vs. Modo Compartilhado (Colaborativo):**
  * **Espaço Solo:** Totalmente privado e individual.
  * **Espaço Compartilhado:** Com código de convite e controle granular de permissões (Visualizador vs. Editor).

* **🔄 Débitos Recorrentes & Assinaturas:**
  * Gestão de contas fixas (Netflix, Aluguel, Internet, etc.) com dia de vencimento.
  * Alternador de status **Pago / Pendente** no mês vigente.

* **🎯 Planejamento de Gastos (Tetos & Metas):**
  * **Orçamentos:** Tetos mensais por categoria com alertas visuais (*No Limite*, *Atenção*, *Estourado*).
  * **Metas Financeiras:** Objetivos de economia com barra de progresso, prazos e botão de aporte rápido.

* **☁️ Sincronização em Nuvem em Tempo Real (Supabase):**
  * Sincronização automática em segundo plano via PostgreSQL com Realtime.
  * Offline-First: funciona sem conexão e sincroniza automaticamente ao reconectar.

* **📄 Exportação de Extratos:**
  * Geração e compartilhamento nativo de planilhas formatadas em **CSV** para WhatsApp, e-mail e Google Drive.

* **🌗 Tema Claro e Escuro (Dark Mode):**
  * Suporte nativo a temas com alto contraste.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/) (SDK 57)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Design & Ícones:** `@expo/vector-icons` (Ionicons) + Design System Customizado
* **Segurança:** `expo-local-authentication`
* **Persistência Local:** `@react-native-async-storage/async-storage`
* **Nuvem & Backend:** [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
* **Compartilhamento & Arquivos:** `expo-sharing` e `expo-file-system`

---

## 📱 Como Rodar o Projeto

### Pré-requisitos
* Node.js v18+ instalado.
* Aplicativo **Expo Go** instalado no celular Android/iOS (disponível na Google Play Store e App Store).

### Passos:
1. Clone o repositório:
   ```bash
   git clone https://github.com/AlcidesDiogenes/financas-android.git
   cd financas-android
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor Expo:
   ```bash
   npm start
   ```

4. Abra o app **Expo Go** no celular e leia o QR Code exibido no terminal.

---

## 📦 Gerar APK Instalável (EAS Build)

Para gerar o arquivo `.apk` de produção sem precisar de ambiente local pesado:

```bash
npx eas login
npx eas build -p android --profile preview
```
