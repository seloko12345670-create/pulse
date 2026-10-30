# PULSE — Personal Trainer e Nutrição Inteligente

O **PULSE** é um aplicativo mobile-first de saúde, nutrição econômica baseada na tabela **TACO/UNICAMP e TBCA/USP**, planejamento de treinos personalizados e acompanhamento de evolução física, com identidade visual em preto (`#080808`, `#121212`, `#1B1B1B`) e rosa (`#FF2D8D`, `#FF65AD`).

---

## 1. Arquitetura e Decisões Técnicas

No ambiente de execução containerizado (Linux + Node.js + Vite + Express), optamos por uma arquitetura **Mobile-First PWA / Capacitor-Ready com React 19 + TypeScript + Express Backend**:

- **Camada de Domínio Pura e Determinística (`src/domain/`)**:
  - `types.ts`: 19 modelos de dados estruturados (Perfil, Objetivos, Metas Nutricionais, Alimentos, Valores Nutricionais, Refeições, Ingredientes, Receitas, Diário Alimentar, Planos Alimentares, Planos de Treino, Exercícios, Séries, Registros de Treino, Medidas Corporais, Lista de Compras, Conversas com Assistente, Preferências e Histórico de Alterações).
  - `nutritionCalculator.ts`: Cálculo energético determinístico via **Equação de Mifflin-St Jeor (1990)** com opção explícita para estimativa neutra quando o usuário prefere não informar a variável fisiológica (sem suposições silenciosas), análise de segurança do peso desejado e travas de proteção clínica para menores de 18 anos, gestantes/lactantes, histórico de transtorno alimentar e condições metabólicas.
  - `foodDatabase.ts`: Base nutricional brasileira estruturada com referência **TACO 4ª Edição (UNICAMP)** e **TBCA (USP)**, medidas caseiras, alérgenos e preços médios aproximados editáveis.
  - `dietGenerator.ts`: Gerador inteligente de refeições, **Modo Econômico** (prioriza itens já disponíveis na despensa em casa e compartilha ingredientes básicos), substituições equivalentes e gerador de **Lista de Compras** para 3, 7 ou 14 dias.
  - `workoutGenerator.ts` & `exerciseDatabase.ts`: Prescrição de treinos (Academia, Casa, Ao Ar Livre, Halteres, Peso Corporal) respeitando limitações articulares (joelho, ombro, lombar, punho, impacto) e progressão gradual segura.
  - `assistantEngine.ts`: Motor conversacional determinístico local para o **PULSE AI**, garantindo funcionamento 100% offline e propostas de ação confirmáveis que atualizam o banco de dados real.
- **Backend Seguro (`server.ts`)**:
  - Servidor Express que protege a chave `GEMINI_API_KEY` no lado do servidor (`/api/pulse-ai`) usando o SDK oficial `@google/genai` (`gemini-3.8-flash`). Se nenhuma chave estiver configurada ou não houver internet, o app informa com transparência e utiliza o motor determinístico local.

---

## 2. Como Instalar as Dependências e Executar

```bash
# 1. Instalar dependências
npm install

# 2. Executar a suíte de testes automatizados (node:test via tsx)
npm test

# 3. Iniciar o servidor de desenvolvimento (porta 3000)
npm run dev

# 4. Compilar para produção
npm run build
```

---

## 3. Como Executar e Instalar no Celular Android

### Opção A — Instalação Direta como PWA no Android (Mais Rápida)
1. Acesse a URL do aplicativo pelo navegador **Google Chrome** no seu celular Android.
2. Toque no menu superior direito (`⋮`) e selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
3. O PULSE será instalado com seu ícone original em preto e rosa, abrindo em tela cheia (`standalone`) e funcionando offline para todos os dados salvos no dispositivo.

### Opção B — Gerar Pacote APK Nativo com Capacitor e Android Studio
Caso deseje gerar um arquivo `.apk` instalável localmente:
```bash
# 1. Compilar o bundle web de produção
npm run build

# 2. Instalar Capacitor CLI e plataforma Android
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init PULSE com.pulse.fitness --web-dir=dist
npx cap add android
npx cap sync android

# 3. Gerar o APK via Gradle (requer Android SDK configurado na máquina local)
cd android && ./gradlew assembleDebug
```
O APK gerado ficará disponível em `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 4. Configuração de Serviços Externos (`.env`)

Consulte o arquivo `.env.example` na raiz do projeto:
- `GEMINI_API_KEY`: Opcional. Quando configurada no servidor, habilita respostas generativas no endpoint `/api/pulse-ai`. A chave nunca é exposta ao navegador. Sem ela, o PULSE AI opera integralmente através do motor determinístico local.

---

## 5. Limitações Conhecidas e Transparência

1. **Estimativas Energéticas e de Preços**: O gasto energético (TMB/TDEE) é calculado por equações preditivas populacionais e pode variar conforme composição corporal individual. Os preços de alimentos em reais (R$) são médias nacionais de referência identificadas como aproximadas e podem ser editados pelo usuário na Lista de Compras.
2. **Armazenamento Offline**: Os dados pessoais e fotos opcionais ficam armazenados localmente no dispositivo (`localStorage` com migração de schema e exportação/exclusão em JSON).
