# 🚀 Finduo: Visão Estratégica, Monetização, Escalabilidade & Internacionalização

Este documento consolida o planejamento estratégico de produto, diferenciais de mercado, modelo de monetização sustentável, arquitetura de escalabilidade e a estratégia de **internacionalização global** para o **Finduo** (antigo Finanças).

---

## 🎯 1. Proposta de Valor & Posicionamento

### Identidade Oficial de Marca
- **Nome Oficial:** **Finduo** (*Fin* de finanças + *Duo* de parceria/dupla colaborativa).
- **Ícone e Logo:** *Monograma 'F' em Dupla* — dois traços dinâmicos paralelos e ascendentes em Azul Real e Verde Esmeralda/Ciano, simbolizando crescimento conjunto, parceria e evolução patrimonial.
- **Público Abrangente:** Projetado não apenas para casais, mas para qualquer parceria financeira: sócios de pequenas empresas, amigos/colegas de quarto que dividem moradia, familiares e pessoas com metas conjuntas.

### O Problema do Mercado (Brasil e Global)
Os grandes players de finanças pessoais (Mobills, Organizze no Brasil; YNAB, Rocket Money, Copilot nos EUA):
- São caros (assinaturas anuais entre R$ 150 e R$ 250 no Brasil; US$ 99 a US$ 120/ano nos EUA).
- São poluídos de anúncios e popups intrusivos na versão gratuita.
- São complexos demais para o dia a dia de pessoas comuns.
- São centrados quase exclusivamente no indivíduo, ignorando a dor de finanças a dois ou familiares.
- São excessivamente dependentes de conexões bancárias que frequentemente quebram ou geram desconfiança de privacidade.

### O Posicionamento Campeão do Finduo
> **"O controle financeiro mais simples, rápido e colaborativo para você e sua parceria (casais, sócios e família)."**

### Os 3 Pilares Competitivos
1. **Colaboração em Tempo Real (Workspaces):** Espaços individuais e conjuntos sincronizados instantaneamente entre múltiplos celulares (`RealtimeSync`).
2. **Offline-First Real:** Funciona sem internet (no mercado, garagem, viagem), sem travas nem perda de dados, com sincronização em fila silenciosa.
3. **Experiência Fintech:** Fluidez, design limpo, biometria, atualizações transparentes e sem atrito.

---

## 💰 2. Modelo de Monetização (Freemium / SaaS)

O modelo de assinatura recorrente de baixo atrito é o mais previsível e escalável para aplicativos móveis.

### Tabela de Planos Sugeridos (Nacional vs. Internacional)

| Nível | Recursos Inclusos | Preço Brasil | Preço Global (US$) |
| :--- | :--- | :--- | :--- |
| **Gratuito (Free)** | • Modo offline ilimitado<br>• Lançamentos e categorias ilimitadas<br>• 1 Workspace pessoal<br>• 1 Meta financeira | **R$ 0,00** | **$0.00** |
| **Premium Individual** | • Backup automático na nuvem<br>• Metas e orçamentos ilimitados<br>• Exportação de relatórios (PDF e Excel)<br>• Sincronização multidispositivo | **R$ 9,90 / mês**<br>*(R$ 69,90/ano)* | **$2.99 / mês**<br>*($24.99/ano)* |
| **Plano Casal / Família** ⭐ | • Tudo do Premium Individual<br>• **Workspaces compartilhados em tempo real**<br>• Acesso para 2 a 4 pessoas da mesma família<br>• Histórico completo de quem pagou cada conta (`paidBy`) | **R$ 14,90 / mês**<br>*(R$ 99,90/ano)* | **$4.99 / mês**<br>*($39.99/ano)* |

### 📈 Projeção de Faturamento Recorrente (MRR)

#### Mercado Nacional (BRL):
- **100 famílias assinantes:** R$ 1.490 / mês (~R$ 17.880 / ano)
- **500 famílias assinantes:** R$ 7.450 / mês (~R$ 89.400 / ano)
- **2.000 famílias assinantes:** R$ 29.800 / mês (~R$ 357.600 / ano)

#### Mercado Global (Dólar - Câmbio médio ~R$ 5,50):
- **200 famílias assinantes:** US$ 998 / mês = **~R$ 5.480 / mês**
- **500 famílias assinantes:** US$ 2.495 / mês = **~R$ 13.700 / mês**
- **1.500 famílias assinantes:** US$ 7.485 / mês = **~R$ 41.100 / mês**

---

## 🌍 3. Estratégia de Internacionalização (App Global)

A dor de finanças a dois é universal. Nos Estados Unidos, o app líder (YNAB) cobra **US$ 14,99/mês**, abrindo uma oportunidade gigantesca para um app ágil e acessível por **US$ 4,99/mês**.

### Pilares de Internacionalização Técnica:
1. **Sistema Multilíngue (`i18n`):**
   - Biblioteca: `expo-localization` + `i18next`.
   - Separação de strings: `pt-BR.json`, `en-US.json`, `es.json`.
   - Detecção automática baseada no idioma do sistema operacional do smartphone.
2. **Sistema Multi-Moeda Dinâmico:**
   - Atualização do utilitário `currency.ts` para usar a API nativa `Intl.NumberFormat`.
   - Suporte a seleção de moeda na Workspace (Real `R$`, Dólar `$`, Euro `€`, Libra `£`, etc.).
3. **Formatos de Data e Calendário Globais:**
   - Adaptação dinâmica via `Intl.DateTimeFormat` (DD/MM/AAAA para Brasil/Europa vs. MM/DD/YYYY para EUA).
4. **Branding e Presença nas Lojas Internacionais:**
   - Subtítulo internacional para as lojas: **Financas – Couple & Family Budget**.
   - Fácil de encontrar e digitar mesmo sem teclado ABNT (`ç` e `~`).

### Mercados Estratégicos de Expansão:
- **Onda 1 (Nacional):** Brasil (validação, primeiros 100 usuários e feedbacks de UX).
- **Onda 2 (Ibero-América):** Portugal, Espanha e América Latina (Espanhol e Português têm forte alinhamento cultural e baixa concorrência de qualidade).
- **Onda 3 (Países de Moeda Forte):** Estados Unidos, Canadá e Reino Unido (alto poder aquisitivo e valorização de assinaturas recorrentes).

---

## 📣 4. Estratégia de Distribuição Orgânica (Zero Custo)

1. **Vídeos Curtos (TikTok, Instagram Reels e YouTube Shorts):**
   - Conteúdo focado em dores reais:
     - *"Como eu e minha noiva paramos de brigar por dinheiro no final do mês."*
     - *"O app simples que usamos para dividir as compras do mês sem planilhas chatas."*
   - Vídeos demonstrando a tela: um celular lança a despesa e o outro atualiza em tempo real na mesma hora.
2. **Nichos Específicos de Entrada:**
   - Casais de noivos planejando casamento ou reforma da casa.
   - Universitários que dividem república.
   - Famílias buscando cortar gastos supérfluos.
3. **Validação Inicial com Piloto Beta:**
   - Colocar o app nas mãos de 10 a 20 casais/amigos próximos para colher feedbacks e depoimentos reais.

---

## 🛠️ 5. Roadmap Técnico Completo (Em 5 Fases)

### Fase 1: Fundação para Produção (Imediato)
- [ ] **Configuração de Provedor SMTP no Supabase:**
  - Integrar serviço gratuito profissional (ex: **Resend**, com 3.000 e-mails/mês gratuitos).
  - Eliminar o limite padrão de 2 e-mails/hora do Supabase para recuperação de senha e ativação de contas.
- [ ] **Auditoria de Índices no PostgreSQL (Supabase):**
  - Garantir índices compostos em `(workspace_id, date)`, `(workspace_id, category_id)` e `(workspace_id, user_id)` para consultas instantâneas em tabelas grandes de transações.

### Fase 2: Conectividade & Experiência de Rede
- [ ] **Detecção Automática de Rede com `@react-native-community/netinfo`:**
  - Monitorar transições de offline ➔ online.
  - Disparar a fila de sincronização (`SyncQueue`) automaticamente em background assim que a conexão com a internet for restabelecida, sem exigir ação manual do usuário.
- [ ] **Indicador Discreto de Sincronização:**
  - Pequeno ícone de nuvem no topo da tela informando estado: *Sincronizado* (nuvem com check) ou *Sincronizando pendências...*.

### Fase 3: Escala de Dados Locais (Alto Volume)
- [ ] **Migração Gradual de AsyncStorage para SQLite (`expo-sqlite`):**
  - O `AsyncStorage` atual funciona muito bem para pequenos e médios volumes.
  - Para usuários que acumularem mais de 5.000 a 10.000 transações ao longo de anos, substituir o armazenamento JSON por tabelas relacionais locais em SQLite acelera consultas, paginação e ordenação com consumo mínimo de memória RAM.

### Fase 4: Monetização Nativa (In-App Purchases)
- [ ] **Integração com RevenueCat (`react-native-purchases`):**
  - Gerenciamento simplificado de assinaturas na Google Play Store e Apple App Store.
  - Controle de paywall, períodos de teste gratuitos (ex: 7 dias grátis) e renovações automáticas em qualquer moeda (BRL, USD, EUR).

### Fase 5: Internacionalização & Expansão Global
- [ ] **Setup de i18n (`expo-localization` + `i18next`):**
  - Dicionários em Português (`pt-BR`), Inglês (`en-US`) e Espanhol (`es`).
- [ ] **Motor Multi-Moeda no Core:**
  - Suporte a seleção de moeda por Workspace ou Usuário (BRL, USD, EUR, etc.).
- [ ] **Lançamento em Lojas Globais:**
  - Metadados, capturas de tela e palavras-chave otimizadas em múltiplos idiomas na Google Play Console e App Store Connect.

---

*Documento gerado como guia permanente de desenvolvimento, evolução e internacionalização do Finanças App.*
