import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { useAppStore } from '../../store';
import { formatCurrency, simulateScenario } from '../../utils/pricing';

type SimMode = 'appointments' | 'price' | 'goal';

const MODES: { key: SimMode; label: string; icon: string; desc: string }[] = [
  { key: 'appointments', label: 'Mais atendimentos', icon: 'people-outline', desc: 'E se eu atender mais clientes?' },
  { key: 'price', label: 'Aumento de preço', icon: 'trending-up-outline', desc: 'E se eu subir meu preço?' },
  { key: 'goal', label: 'Meta de renda', icon: 'trophy-outline', desc: 'Quanto preciso atender?' },
];

export default function SimulatorScreen() {
  const { costConfig, services } = useAppStore();
  const [mode, setMode] = useState<SimMode>('appointments');

  // Modo 1 — mais atendimentos
  const [currentAppointments, setCurrentAppointments] = useState('');
  const [extraAppointments, setExtraAppointments] = useState('');
  const [avgProfit, setAvgProfit] = useState('');

  // Modo 2 — aumento de preço
  const [currentPrice, setCurrentPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [monthlyClients, setMonthlyClients] = useState('');

  // Modo 3 — meta de renda
  const [incomeGoal, setIncomeGoal] = useState(
    costConfig?.desired_salary?.toString() || ''
  );
  const [servicePrice, setServicePrice] = useState('');

  function toNum(val: string) {
    return parseFloat(val.replace(',', '.')) || 0;
  }

  // ─── Resultados ────────────────────────────────────────────

  function renderAppointmentsResult() {
    const base = toNum(currentAppointments);
    const extra = toNum(extraAppointments);
    const profit = toNum(avgProfit);
    if (!base || !extra || !profit) return null;

    const result = simulateScenario(base, extra, profit);
    return (
      <View style={styles.resultBox}>
        <Text style={styles.resultTitle}>📊 Resultado da simulação</Text>
        <View style={styles.resultGrid}>
          <ResultItem label="Hoje (por mês)" value={formatCurrency(result.currentMonthly)} color={COLORS.gray500} />
          <ResultItem label="Com mais atendimentos" value={formatCurrency(result.simulatedMonthly)} color={COLORS.primary} />
          <ResultItem label="Ganho extra/mês" value={`+${formatCurrency(result.extraMonthly)}`} color={COLORS.success} highlight />
          <ResultItem label="Ganho extra/ano" value={`+${formatCurrency(result.extraAnnual)}`} color={COLORS.gold} highlight />
        </View>
        <View style={styles.insightBox}>
          <Text style={styles.insightText}>
            💡 Atendendo {extra} cliente{extra > 1 ? 's' : ''} a mais por dia, você ganha{' '}
            <Text style={styles.insightHighlight}>{formatCurrency(result.extraMonthly)} a mais por mês</Text>
            {' '}— o equivalente a {formatCurrency(result.extraAnnual)} por ano!
          </Text>
        </View>
      </View>
    );
  }

  function renderPriceResult() {
    const current = toNum(currentPrice);
    const novo = toNum(newPrice);
    const clients = toNum(monthlyClients);
    if (!current || !novo || !clients) return null;

    const currentMonthly = current * clients;
    const newMonthly = novo * clients;
    const extraMonthly = newMonthly - currentMonthly;
    const extraAnnual = extraMonthly * 12;
    const percentIncrease = ((novo - current) / current * 100).toFixed(1);

    return (
      <View style={styles.resultBox}>
        <Text style={styles.resultTitle}>📊 Resultado da simulação</Text>
        <View style={styles.resultGrid}>
          <ResultItem label="Faturamento atual/mês" value={formatCurrency(currentMonthly)} color={COLORS.gray500} />
          <ResultItem label="Novo faturamento/mês" value={formatCurrency(newMonthly)} color={COLORS.primary} />
          <ResultItem label="Ganho extra/mês" value={`+${formatCurrency(extraMonthly)}`} color={COLORS.success} highlight />
          <ResultItem label="Ganho extra/ano" value={`+${formatCurrency(extraAnnual)}`} color={COLORS.gold} highlight />
        </View>
        <View style={styles.insightBox}>
          <Text style={styles.insightText}>
            💡 Um aumento de apenas <Text style={styles.insightHighlight}>{percentIncrease}%</Text> no preço representa{' '}
            <Text style={styles.insightHighlight}>{formatCurrency(extraAnnual)} a mais por ano</Text>.
            Vale a conversa com suas clientes! 😊
          </Text>
        </View>
      </View>
    );
  }

  function renderGoalResult() {
    const goal = toNum(incomeGoal);
    const price = toNum(servicePrice);
    if (!goal || !price) return null;

    const appointmentsPerMonth = Math.ceil(goal / price);
    const appointmentsPerDay = Math.ceil(appointmentsPerMonth / (costConfig?.work_days_per_month || 22));
    const appointmentsPerWeek = Math.ceil(appointmentsPerMonth / 4);

    return (
      <View style={styles.resultBox}>
        <Text style={styles.resultTitle}>📊 Para atingir {formatCurrency(goal)}/mês</Text>
        <View style={styles.resultGrid}>
          <ResultItem label="Atendimentos/mês" value={String(appointmentsPerMonth)} color={COLORS.primary} highlight />
          <ResultItem label="Atendimentos/semana" value={String(appointmentsPerWeek)} color={COLORS.primaryLight} highlight />
          <ResultItem label="Atendimentos/dia" value={String(appointmentsPerDay)} color={COLORS.success} highlight />
          <ResultItem label="Preço por serviço" value={formatCurrency(price)} color={COLORS.gold} />
        </View>
        <View style={styles.insightBox}>
          <Text style={styles.insightText}>
            💡 Para ganhar <Text style={styles.insightHighlight}>{formatCurrency(goal)} por mês</Text> cobrando{' '}
            {formatCurrency(price)} por serviço, você precisa de{' '}
            <Text style={styles.insightHighlight}>{appointmentsPerDay} atendimento{appointmentsPerDay > 1 ? 's' : ''} por dia</Text>.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Simulador</Text>
          <Text style={styles.subtitle}>Planeje seus ganhos antes de acontecer</Text>
        </View>

        {/* Seletor de modo */}
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeCard, mode === m.key && styles.modeCardActive]}
            onPress={() => setMode(m.key)}
          >
            <View style={[styles.modeIcon, mode === m.key && styles.modeIconActive]}>
              <Ionicons name={m.icon as any} size={22} color={mode === m.key ? COLORS.white : COLORS.gray500} />
            </View>
            <View style={styles.modeText}>
              <Text style={[styles.modeLabel, mode === m.key && styles.modeLabelActive]}>{m.label}</Text>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </View>
            <Ionicons
              name={mode === m.key ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={mode === m.key ? COLORS.primary : COLORS.gray300}
            />
          </TouchableOpacity>
        ))}

        {/* Formulários por modo */}
        <View style={styles.formCard}>
          {mode === 'appointments' && (
            <>
              <Text style={styles.formTitle}>E se eu atender mais clientes?</Text>
              <Field label="Atendimentos atuais por dia" value={currentAppointments} onChange={setCurrentAppointments} placeholder="Ex: 4" />
              <Field label="Quantos a mais por dia?" value={extraAppointments} onChange={setExtraAppointments} placeholder="Ex: 2" />
              <Field label="Lucro médio por atendimento (R$)" value={avgProfit} onChange={setAvgProfit} placeholder="Ex: 45,00" decimal />
              {renderAppointmentsResult()}
            </>
          )}

          {mode === 'price' && (
            <>
              <Text style={styles.formTitle}>E se eu subir meu preço?</Text>
              <Field label="Preço atual (R$)" value={currentPrice} onChange={setCurrentPrice} placeholder="Ex: 40,00" decimal />
              <Field label="Novo preço (R$)" value={newPrice} onChange={setNewPrice} placeholder="Ex: 50,00" decimal />
              <Field label="Clientes por mês" value={monthlyClients} onChange={setMonthlyClients} placeholder="Ex: 80" />
              {renderPriceResult()}
            </>
          )}

          {mode === 'goal' && (
            <>
              <Text style={styles.formTitle}>Quanto preciso atender?</Text>
              <Field label="Meta de renda mensal (R$)" value={incomeGoal} onChange={setIncomeGoal} placeholder="Ex: 3000,00" decimal />
              <Field label="Preço do serviço (R$)" value={servicePrice} onChange={setServicePrice} placeholder="Ex: 55,00" decimal />
              {renderGoalResult()}
            </>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Componente auxiliar ───────────────────────────────────
function Field({ label, value, onChange, placeholder, decimal }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; decimal?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray300}
        value={value}
        onChangeText={onChange}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      />
    </View>
  );
}

function ResultItem({ label, value, color, highlight }: {
  label: string; value: string; color: string; highlight?: boolean;
}) {
  return (
    <View style={[styles.resultItem, highlight && styles.resultItemHighlight]}>
      <Text style={styles.resultItemLabel}>{label}</Text>
      <Text style={[styles.resultItemValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: { paddingTop: SPACING.lg, marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, marginTop: 2 },

  // Modos
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.gray100,
    gap: SPACING.sm,
    elevation: 1,
  },
  modeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '05' },
  modeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconActive: { backgroundColor: COLORS.primary },
  modeText: { flex: 1 },
  modeLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700 },
  modeLabelActive: { color: COLORS.primary },
  modeDesc: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2 },

  // Formulário
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  formTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.lg },
  field: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.gray700, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.black,
    backgroundColor: COLORS.offWhite,
  },

  // Resultado
  resultBox: {
    backgroundColor: COLORS.gray100,
    borderRadius: 16,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  resultTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700, marginBottom: SPACING.md },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  resultItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.sm,
  },
  resultItemHighlight: { borderWidth: 1.5, borderColor: COLORS.primary + '30' },
  resultItemLabel: { fontSize: 10, color: COLORS.gray500, fontWeight: '600', marginBottom: 4 },
  resultItemValue: { fontSize: FONT_SIZES.lg, fontWeight: '800' },

  // Insight
  insightBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  insightText: { fontSize: FONT_SIZES.xs, color: COLORS.gray700, lineHeight: 20 },
  insightHighlight: { fontWeight: '800', color: COLORS.primary },
});
