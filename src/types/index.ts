// ─── Usuária ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

// ─── Item extra de custo fixo ──────────────────────────────
export interface ExtraCostItem {
  id: string;
  label: string;
  value: number;
}

// ─── Configuração de Custos ────────────────────────────────
export interface CostConfig {
  id: string;
  user_id: string;
  // Estrutura
  rent: number;           // aluguel
  electricity: number;    // luz
  internet: number;       // internet
  other_fixed: number;    // outros fixos
  extra_costs?: ExtraCostItem[]; // itens extras nomeados pela usuária
  // Equipamentos
  equipment_value: number;       // valor total dos equipamentos
  equipment_lifespan_months: number; // vida útil em meses
  // Pessoal
  desired_salary: number;     // pró-labore desejado
  work_days_per_month: number;
  work_hours_per_day: number;
  // Fiscal
  das_mei_monthly: number;    // DAS MEI mensal (atualizado 2026)
  card_fee_percent: number;   // taxa maquininha %
  pix_fee_percent: number;    // taxa pix % (mantido no banco, não exibido na UI — Pix é gratuito na prática)
  tax_reform_adjustment: number; // reserva de segurança opcional (%)
  updated_at: string;
}

// ─── Cliente ───────────────────────────────────────────────
export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  birthday?: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Serviço ───────────────────────────────────────────────
export interface Service {
  id: string;
  user_id: string;
  name: string;             // ex: "Esmaltação Simples"
  duration_minutes: number;
  supply_cost: number;      // custo dos insumos por atendimento
  min_price: number;        // Preço Mínimo de Sobrevivência
  perceived_price: number;  // Preço de Valor Percebido
  shielded_price: number;   // Preço Blindado 2026 (com impostos)
  is_active: boolean;
  created_at: string;
}

// ─── Atendimento ───────────────────────────────────────────
export interface Appointment {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  client_name?: string;
  client_id?: string;
  charged_price: number;
  net_profit: number;       // lucro líquido real
  payment_method: 'pix' | 'card' | 'cash';
  notes?: string;
  attended_at: string;
  created_at: string;
}

// ─── Resumo Mensal ─────────────────────────────────────────
export interface MonthlySummary {
  month: string;             // YYYY-MM
  total_revenue: number;
  total_net_profit: number;
  total_appointments: number;
  mei_limit: number;         // R$ 81.000 / 12
  mei_used_percent: number;
  salary_goal: number;
  salary_achieved_percent: number;
}

// ─── Script de Reajuste ────────────────────────────────────
export type ScriptType = 'standard' | 'fiscal_2026' | 'quality';

export interface PriceScript {
  type: ScriptType;
  label: string;
  message: string;
}
