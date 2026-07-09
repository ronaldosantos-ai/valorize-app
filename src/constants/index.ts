// ─── Fiscal 2026 ───────────────────────────────────────────
export const MEI_ANNUAL_LIMIT = 81_000;         // R$ 81.000/ano
export const MEI_MONTHLY_LIMIT = MEI_ANNUAL_LIMIT / 12; // R$ 6.750/mês
export const MEI_ALERT_THRESHOLD = 0.8;         // alerta em 80%
export const DAS_MEI_DEFAULT = 75.90;           // valor base 2026 (atualizar anualmente)
export const TAX_REFORM_ADJUSTMENT_DEFAULT = 3.5; // % de ajuste Reforma 2026

// ─── Paleta de Cores (Premium — Azul-marinho + Dourado) ────
export const COLORS = {
  primary: '#101E36',       // Azul-marinho profundo (principal)
  primaryLight: '#1C2F52',  // Um tom acima, para variação/hover
  primaryDark: '#0A1424',   // Ainda mais escuro, para profundidade
  gold: '#C9A84C',          // Dourado
  goldLight: '#E8D49E',
  white: '#FFFFFF',
  offWhite: '#F8F6F0',
  gray100: '#F3F4F6',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray700: '#374151',
  black: '#111827',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#FAFAF8',
};

// ─── Tipografia ────────────────────────────────────────────
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

// ─── Espaçamento ───────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Taxas de Pagamento ────────────────────────────────────
export const DEFAULT_FEES = {
  card: 2.5,  // %
  pix: 0.99,  // %
  cash: 0,
};

// ─── Scripts de Reajuste ───────────────────────────────────
export const PRICE_SCRIPTS = {
  standard: (name: string, service: string, oldPrice: number, newPrice: number, date: string) =>
    `Olá! Aqui é ${name}. 💅\n\nPrimeiro, obrigada pela sua confiança e carinho sempre!\n\nPara continuar oferecendo o mesmo nível de qualidade e cuidado que você merece, precisarei ajustar o valor do(a) ${service} de R$ ${oldPrice.toFixed(2)} para R$ ${newPrice.toFixed(2)} a partir do dia ${date}.\n\nEsse ajuste garante que eu continue investindo em produtos e técnicas melhores para você. 🌟\n\nQualquer dúvida, estou à disposição! ❤️`,

  fiscal_2026: (name: string, service: string, oldPrice: number, newPrice: number, date: string) =>
    `Olá! Aqui é ${name}. 💅\n\nCom as novas obrigações fiscais de 2026, precisei revisar meus custos para manter a qualidade do serviço que você merece.\n\nA partir do dia ${date}, o(a) ${service} passará de R$ ${oldPrice.toFixed(2)} para R$ ${newPrice.toFixed(2)}.\n\nEsse reajuste reflete o aumento real dos meus custos operacionais — e meu compromisso de continuar te atendendo com excelência! 🌟`,

  quality: (name: string, service: string, oldPrice: number, newPrice: number, date: string) =>
    `Oi! Tudo bem? Aqui é ${name}. 💅\n\nInvesti em novos produtos e aperfeiçoamento técnico para elevar ainda mais a qualidade do seu atendimento!\n\nPor isso, a partir de ${date}, o(a) ${service} terá o novo valor de R$ ${newPrice.toFixed(2)} (antes R$ ${oldPrice.toFixed(2)}).\n\nSeu resultado vai ficar ainda mais incrível! Vem comigo? ✨`,
};
