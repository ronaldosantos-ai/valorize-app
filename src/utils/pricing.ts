import { CostConfig } from '../types';
import { MEI_MONTHLY_LIMIT, MEI_ANNUAL_LIMIT } from '../constants';

// ─── Calcula o custo fixo por hora trabalhada ──────────────
export function calcHourlyCost(config: CostConfig): number {
  const monthlyHours = config.work_days_per_month * config.work_hours_per_day;
  if (monthlyHours === 0) return 0;

  const depreciation = config.equipment_value / config.equipment_lifespan_months;
  const extraCostsTotal = (config.extra_costs || []).reduce((sum, item) => sum + item.value, 0);
  const totalFixed =
    config.rent +
    config.electricity +
    config.internet +
    config.other_fixed +
    extraCostsTotal +
    depreciation +
    config.das_mei_monthly +
    config.desired_salary;

  return totalFixed / monthlyHours;
}

// ─── Preço Mínimo de Sobrevivência ─────────────────────────
export function calcMinPrice(
  config: CostConfig,
  durationMinutes: number,
  supplyCost: number
): number {
  const hourlyCost = calcHourlyCost(config);
  const serviceHours = durationMinutes / 60;
  const laborCost = hourlyCost * serviceHours;
  return laborCost + supplyCost;
}

// ─── Preço de Valor Percebido ──────────────────────────────
export function calcPerceivedPrice(minPrice: number, marginPercent = 35): number {
  return minPrice * (1 + marginPercent / 100);
}

// ─── Preço Blindado 2026 (com todos os impostos e taxas) ───
export function calcShieldedPrice(
  config: CostConfig,
  durationMinutes: number,
  supplyCost: number
): number {
  const min = calcMinPrice(config, durationMinutes, supplyCost);
  const withMargin = calcPerceivedPrice(min);
  const withCardFee = withMargin / (1 - config.card_fee_percent / 100);
  const withReform = withCardFee * (1 + config.tax_reform_adjustment / 100);
  return Math.ceil(withReform * 2) / 2; // arredonda para R$ 0,50 mais próximo
}

// ─── Lucro líquido de um atendimento ───────────────────────
export function calcNetProfit(
  chargedPrice: number,
  supplyCost: number,
  config: CostConfig,
  durationMinutes: number,
  paymentMethod: 'pix' | 'card' | 'cash'
): number {
  const hourlyCost = calcHourlyCost(config);
  const laborCost = hourlyCost * (durationMinutes / 60);

  const fee =
    paymentMethod === 'card'
      ? chargedPrice * (config.card_fee_percent / 100)
      : paymentMethod === 'pix'
      ? chargedPrice * (config.pix_fee_percent / 100)
      : 0;

  return chargedPrice - fee - supplyCost - laborCost;
}

// ─── Progresso do limite MEI ───────────────────────────────
export function calcMeiProgress(totalRevenueYear: number): {
  used: number;
  remaining: number;
  percent: number;
  isAlert: boolean;
} {
  const percent = (totalRevenueYear / MEI_ANNUAL_LIMIT) * 100;
  return {
    used: totalRevenueYear,
    remaining: Math.max(0, MEI_ANNUAL_LIMIT - totalRevenueYear),
    percent: Math.min(percent, 100),
    isAlert: percent >= 80,
  };
}

// ─── Simulador de cenários ─────────────────────────────────
export function simulateScenario(
  baseAppointments: number,
  extraAppointments: number,
  avgNetProfit: number
): {
  currentMonthly: number;
  simulatedMonthly: number;
  extraMonthly: number;
  extraAnnual: number;
} {
  const currentMonthly = baseAppointments * avgNetProfit;
  const simulatedMonthly = (baseAppointments + extraAppointments) * avgNetProfit;
  const extraMonthly = simulatedMonthly - currentMonthly;
  return {
    currentMonthly,
    simulatedMonthly,
    extraMonthly,
    extraAnnual: extraMonthly * 12,
  };
}

// ─── Formata moeda BR ──────────────────────────────────────
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Progresso do salário mensal ──────────────────────────
export function calcSalaryProgress(
  currentProfit: number,
  desiredSalary: number
): { percent: number; remaining: number } {
  const percent = Math.min((currentProfit / desiredSalary) * 100, 100);
  return { percent, remaining: Math.max(0, desiredSalary - currentProfit) };
}
