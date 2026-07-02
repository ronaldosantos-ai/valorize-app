import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';

const STEPS = ['Boas-vindas', 'Custos Fixos', 'Trabalho', 'Fiscal'];

export default function OnboardingScreen() {
  const { user, setCostConfig } = useAppStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0
  const [name, setName] = useState(user?.name || '');

  // Step 1 — Custos fixos
  const [rent, setRent] = useState('');
  const [electricity, setElectricity] = useState('');
  const [internet, setInternet] = useState('');
  const [otherFixed, setOtherFixed] = useState('');
  const [equipmentValue, setEquipmentValue] = useState('');

  // Step 2 — Trabalho
  const [desiredSalary, setDesiredSalary] = useState('');
  const [workDays, setWorkDays] = useState('22');
  const [workHours, setWorkHours] = useState('8');

  // Step 3 — Fiscal
  const [dasMei, setDasMei] = useState('75.90');
  const [cardFee, setCardFee] = useState('2.50');
  const [pixFee, setPixFee] = useState('0.99');
  const [taxReform, setTaxReform] = useState('3.50');

  function toNum(val: string) {
    return parseFloat(val.replace(',', '.')) || 0;
  }

  async function handleFinish() {
    if (!desiredSalary) {
      Alert.alert('Atenção', 'Informe o salário que deseja ganhar.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuária não autenticada.');

      const config = {
        user_id: authUser.id,
        rent: toNum(rent),
        electricity: toNum(electricity),
        internet: toNum(internet),
        other_fixed: toNum(otherFixed),
        equipment_value: toNum(equipmentValue),
        equipment_lifespan_months: 24,
        desired_salary: toNum(desiredSalary),
        work_days_per_month: toNum(workDays),
        work_hours_per_day: toNum(workHours),
        das_mei_monthly: toNum(dasMei),
        card_fee_percent: toNum(cardFee),
        pix_fee_percent: toNum(pixFee),
        tax_reform_adjustment: toNum(taxReform),
      };

      const { error: configError } = await supabase
        .from('cost_configs')
        .insert(config);
      if (configError) throw configError;

      await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true, name })
        .eq('id', authUser.id);

      setCostConfig({ ...config, id: '', updated_at: new Date().toISOString() });
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Algo deu errado.');
    } finally {
      setLoading(false);
    }
  }

  function canAdvance() {
    if (step === 0) return name.trim().length > 0;
    if (step === 2) return toNum(desiredSalary) > 0;
    return true;
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={styles.stepEmoji}>👋</Text>
            <Text style={styles.stepTitle}>Olá! Vamos começar.</Text>
            <Text style={styles.stepDesc}>
              Em menos de 2 minutos você vai saber exatamente quanto cobrar para ter o lucro que merece.
            </Text>
            <View style={styles.field}>
              <Text style={styles.label}>Como você se chama?</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Ana Paula"
                placeholderTextColor={COLORS.gray300}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.stepEmoji}>🏠</Text>
            <Text style={styles.stepTitle}>Seus custos fixos</Text>
            <Text style={styles.stepDesc}>
              Esses são os custos que existem mesmo quando você não atende ninguém. Coloque 0 se não tiver.
            </Text>
            {[
              { label: 'Aluguel (R$)', value: rent, set: setRent, placeholder: '0,00' },
              { label: 'Luz (R$)', value: electricity, set: setElectricity, placeholder: '0,00' },
              { label: 'Internet (R$)', value: internet, set: setInternet, placeholder: '0,00' },
              { label: 'Outros fixos (R$)', value: otherFixed, set: setOtherFixed, placeholder: '0,00' },
              { label: 'Valor dos equipamentos (R$)', value: equipmentValue, set: setEquipmentValue, placeholder: 'Ex: 2000,00' },
            ].map((f) => (
              <View style={styles.field} key={f.label}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={COLORS.gray300}
                  value={f.value}
                  onChangeText={f.set}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.stepEmoji}>💰</Text>
            <Text style={styles.stepTitle}>Quanto você quer ganhar?</Text>
            <Text style={styles.stepDesc}>
              Defina o salário que você merece receber todo mês. O app vai calcular o preço mínimo para chegar lá.
            </Text>
            {[
              { label: 'Salário desejado (R$) *', value: desiredSalary, set: setDesiredSalary, placeholder: 'Ex: 3000,00' },
              { label: 'Dias trabalhados por mês', value: workDays, set: setWorkDays, placeholder: '22' },
              { label: 'Horas por dia', value: workHours, set: setWorkHours, placeholder: '8' },
            ].map((f) => (
              <View style={styles.field} key={f.label}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={COLORS.gray300}
                  value={f.value}
                  onChangeText={f.set}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.stepEmoji}>📋</Text>
            <Text style={styles.stepTitle}>Impostos e taxas</Text>
            <Text style={styles.stepDesc}>
              Já deixamos tudo configurado com os valores de 2026. Você pode ajustar se precisar.
            </Text>
            {[
              { label: 'DAS MEI mensal (R$)', value: dasMei, set: setDasMei },
              { label: 'Taxa maquininha (%)', value: cardFee, set: setCardFee },
              { label: 'Taxa Pix (%)', value: pixFee, set: setPixFee },
              { label: 'Ajuste Reforma 2026 (%)', value: taxReform, set: setTaxReform },
            ].map((f) => (
              <View style={styles.field} key={f.label}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={[styles.input, styles.inputPrefilled]}
                  value={f.value}
                  onChangeText={f.set}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Esses valores são atualizados automaticamente conforme as regras do MEI 2026.
              </Text>
            </View>
          </View>
        );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Progress bar */}
        <View style={styles.progressRow}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.progressItem}>
              <View style={[styles.progressDot, i <= step && styles.progressDotActive]}>
                <Text style={[styles.progressDotText, i <= step && styles.progressDotTextActive]}>
                  {i < step ? '✓' : String(i + 1)}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.progressLine, i < step && styles.progressLineActive]} />
              )}
            </View>
          ))}
        </View>

        {/* Conteúdo do step */}
        <View style={styles.card}>
          {renderStep()}
        </View>

        {/* Botões */}
        <View style={styles.btnRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.btnBack} onPress={() => setStep(step - 1)}>
              <Text style={styles.btnBackText}>Voltar</Text>
            </TouchableOpacity>
          )}

          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[styles.btn, !canAdvance() && styles.btnDisabled, step === 0 && styles.btnFull]}
              onPress={() => canAdvance() && setStep(step + 1)}
              disabled={!canAdvance()}
            >
              <Text style={styles.btnText}>Continuar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleFinish}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnText}>Começar a usar 🚀</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },

  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gray300,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  progressDotText: { fontSize: 12, fontWeight: '700', color: COLORS.gray500 },
  progressDotTextActive: { color: COLORS.white },
  progressLine: { width: 32, height: 2, backgroundColor: COLORS.gray300 },
  progressLineActive: { backgroundColor: COLORS.primary },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  stepEmoji: { fontSize: 48, textAlign: 'center', marginBottom: SPACING.sm },
  stepTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  stepDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },

  // Campos
  field: { marginBottom: SPACING.md },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.black,
    backgroundColor: COLORS.offWhite,
  },
  inputPrefilled: {
    borderColor: COLORS.primaryLight,
    backgroundColor: '#EEF4FB',
  },

  // Info box
  infoBox: {
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  infoText: { fontSize: FONT_SIZES.sm, color: COLORS.gray700, lineHeight: 20 },

  // Botões
  btnRow: { flexDirection: 'row', gap: SPACING.sm },
  btn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
  },
  btnFull: { flex: 1 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  btnBack: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
  },
  btnBackText: { color: COLORS.gray500, fontSize: FONT_SIZES.md, fontWeight: '600' },
});
