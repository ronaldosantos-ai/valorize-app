# 💅 Valorize App

> Gestão de lucro, precificação e conformidade fiscal para MEI de beleza.

O Valorize transforma o "chute" na precificação em **autoridade matemática**, provando que a profissional não é "cara" — seu trabalho tem um custo real e um valor justo. Inclui conformidade com a **Reforma Tributária de 2026** e monitoramento do limite MEI.

---

## 🛠 Stack

| Camada | Tecnologia |
|---|---|
| Mobile | Expo (React Native) + TypeScript |
| Backend / Auth | Supabase (PostgreSQL + Auth + Storage) |
| Navegação | React Navigation v6 |
| Estado global | Zustand |
| Formulários | React Hook Form |

---

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go no celular (iOS ou Android)

### 1. Clone o repositório
```bash
git clone https://github.com/ronaldosantos-ai/valorize-app.git
cd valorize-app
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais do Supabase:
```
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

### 4. Configure o banco de dados
- Acesse seu projeto em [supabase.com](https://supabase.com)
- Vá em **SQL Editor**
- Cole e execute o conteúdo de `supabase/schema.sql`

### 5. Rode o app
```bash
npx expo start
```
Escaneie o QR code com o Expo Go no celular.

---

## 📁 Estrutura do Projeto

```
valorize-app/
├── src/
│   ├── components/       # Componentes reutilizáveis
│   ├── constants/        # Cores, tamanhos, fiscal 2026
│   ├── hooks/            # Custom hooks
│   ├── lib/
│   │   └── supabase.ts   # Client Supabase
│   ├── navigation/       # Rotas do app
│   ├── screens/
│   │   ├── auth/         # Login / Cadastro
│   │   ├── onboarding/   # Configuração inicial de custos
│   │   ├── home/         # Dashboard + progresso do salário
│   │   ├── calculator/   # Calculadora de Custo Real 2026
│   │   ├── register/     # Botão "+" de atendimento
│   │   ├── table/        # Gerador de tabela premium
│   │   └── simulator/    # Simulador de cenários
│   ├── store/            # Estado global (Zustand)
│   ├── types/            # Tipos TypeScript
│   └── utils/
│       └── pricing.ts    # Cálculos financeiros e fiscais
├── supabase/
│   └── schema.sql        # Schema do banco de dados
├── .env.example
└── App.tsx
```

---

## 💰 Funcionalidades (MVP)

- [x] Estrutura base e navegação
- [x] Schema do banco de dados
- [x] Utilitários de cálculo financeiro
- [ ] Tela de Login / Cadastro
- [ ] Onboarding de custos (assistente guiado)
- [ ] Dashboard com progresso de salário e limite MEI
- [ ] Calculadora de Preço Mínimo, Percebido e Blindado 2026
- [ ] Registrador de atendimento (botão "+")
- [ ] Gerador de tabela premium para Instagram
- [ ] Scripts Anti-Medo para reajuste
- [ ] Simulador de cenários de produtividade
- [ ] Alerta de 80% do limite MEI

---

## 📊 Modelo de Negócio

| Plano | Valor |
|---|---|
| Mensal | R$ 29,90/mês |
| Anual | R$ 197,00/ano (≈ R$ 16/mês) |

Trial gratuito de 3 dias.

---

## 📄 Licença

Proprietário — © 2026 Valorize. Todos os direitos reservados.
