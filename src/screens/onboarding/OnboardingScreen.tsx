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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import InfoTip from '../../components/InfoTip';
import { ExtraCostItem } from '../../types';

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
  const [extraCosts, setExtraCosts] = useState<ExtraCostItem[]>([]);
  const [newExtraLabel, setNewExtraLabel] = useState('');
  const [newExtraValue, setNewExtraValue] = useState('');

  // Step 2 — Trabalho
  const [desiredSalary, setDesiredSalary] = useState('');
  const [workDays, setWorkDays] = useState('22');
  const [workHours, setWorkHours] = useState('8');

  // Step 3 — Fiscal
  const [dasMei, setDasMei] = useState('86.05');
  const [cardFee, setCardFee] = useState('2.50');
  const [taxReform, setTaxReform] = useState('0');

  function toNum(val: string) {
    return parseFloat(val.replace(',', '.')) || 0;
  }

  const extraCostsTotal = extraCosts.reduce((sum, item) => sum + item.value, 0);

  function handleAddExtraCost() {
    if (!newExtraLabel.trim() || !toNum(newExtraValue)) {
      Alert.alert('Atenção', 'Informe o nome e o valor do item extra.');
      return;
    }
    setExtraCosts([...extraCosts, {
      id: Date.now().toString(),
      label: newExtraLabel.trim(),
      value: toNum(newExtraValue),
    }]);
    setNewExtraLabel('');
    setNewExtraValue('');
  }

  function handleRemoveExtraCost(id: string) {
    setExtraCosts(extraCosts.filter(item => item.id !== id));
  }

  async function handleFinish() {
    if (!desiredSalary) {
      Alert.alert('Atenção', 'Informe o salário que deseja ganhar.');
      return;
    }
    setLoading(true);

    // Timeout de segurança: nunca deixa o botão girando para sempre.
    // Comum em locais com internet instável (atendimento domiciliar).
    const timeoutId = setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Conexão lenta',
        'A internet parece instável. Verifique sua conexão e tente novamente.'
      );
    }, 15000);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuária não autenticada.');

      const config = {
        rent: toNum(rent),
        electricity: toNum(electricity),
        internet: toNum(internet),
        other_fixed: toNum(otherFixed),
        extra_costs: extraCosts,
        equipment_value: toNum(equipmentValue),
        equipment_lifespan_months: 24,
        desired_salary: toNum(desiredSalary),
        work_days_per_month: toNum(workDays),
        work_hours_per_day: toNum(workHours),
        das_mei_monthly: toNum(dasMei),
        card_fee_percent: toNum(cardFee),
        pix_fee_percent: 0,
        tax_reform_adjustment: toNum(taxReform),
      };

      // Evita duplicar registro caso a usuária já tenha um (ex: tentativa anterior)
      const { data: existing } = await supabase
        .from('cost_configs')
        .select('id')
        .eq('user_id', authUser.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      let savedConfig;
      if (existing && existing.length > 0) {
        const { data, error } = await supabase
          .from('cost_configs')
          .update(config)
          .eq('id', existing[0].id)
          .select()
          .single();
        if (error) throw error;
        savedConfig = data;
      } else {
        const { data, error } = await supabase
          .from('cost_configs')
          .insert({ user_id: authUser.id, ...config })
          .select()
          .single();
        if (error) throw error;
        savedConfig = data;
      }

      await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true, name })
        .eq('id', authUser.id);

      setCostConfig(savedConfig);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Algo deu errado. Verifique sua internet e tente novamente.');
    } finally {
      clearTimeout(timeoutId);
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

            {/* Valor dos equipamentos com dica */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Valor dos equipamentos (R$)</Text>
                <InfoTip
                  title="Valor dos equipamentos"
                  description="Some o valor que você gastou (ou gastaria para repor) alicates, lixas elétricas, cabines, luminárias e outros itens duráveis do seu trabalho. O app divide esse valor aos poucos ao longo de 24 meses, sem pesar tudo de uma vez no seu preço."
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ex: 2000,00"
                placeholderTextColor={COLORS.gray300}
                value={equipmentValue}
                onChangeText={setEquipmentValue}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Itens extras de custo fixo */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Itens extras (opcional)</Text>
                <InfoTip
                  title="Itens extras"
                  description='Use para custos fixos que não se encaixam nas categorias acima — por exemplo "Contador", "Transporte", "Assinatura de app". Você pode adicionar quantos quiser, e editar ou remover depois quando precisar.'
                />
              </View>

              {extraCosts.map((item) => (
                <View key={item.id} style={styles.extraItemRow}>
                  <Text style={styles.extraItemText}>{item.label}</Text>
                  <Text style={styles.extraItemValue}>
                    {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveExtraCost(item.id)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.gray300} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addExtraRow}>
                <TextInput
                  style={[styles.input, styles.extraLabelInput]}
                  placeholder="Nome do item"
                  placeholderTextColor={COLORS.gray300}
                  value={newExtraLabel}
                  onChangeText={setNewExtraLabel}
                />
                <TextInput
                  style={[styles.input, styles.extraValueInput]}
                  placeholder="R$"
                  placeholderTextColor={COLORS.gray300}
                  value={newExtraValue}
                  onChangeText={setNewExtraValue}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.addExtraBtn} onPress={handleAddExtraCost}>
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Prévia do custo fixo mensal total */}
            {(toNum(rent) + toNum(electricity) + toNum(internet) + toNum(otherFixed) + extraCostsTotal > 0) && (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>💡 Seus custos fixos somam</Text>
                <Text style={styles.previewValue}>
                  {(toNum(rent) + toNum(electricity) + toNum(internet) + toNum(otherFixed) + extraCostsTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  <Text style={styles.previewUnit}> /mês</Text>
                </Text>
                {toNum(equipmentValue) > 0 && (
                  <Text style={styles.previewSub}>
                    + equipamentos divididos aos poucos ao longo do tempo
                  </Text>
                )}
              </View>
            )}
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

            {/* Prévia do custo por hora que precisa cobrar */}
            {toNum(desiredSalary) > 0 && toNum(workDays) > 0 && toNum(workHours) > 0 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>💡 Para ganhar isso, você precisa faturar</Text>
                <Text style={styles.previewValue}>
                  {(
                    (toNum(desiredSalary) +
                      toNum(rent) + toNum(electricity) + toNum(internet) + toNum(otherFixed) + extraCostsTotal +
                      toNum(dasMei)) /
                    (toNum(workDays) * toNum(workHours))
                  ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  <Text style={styles.previewUnit}> por hora trabalhada</Text>
                </Text>
                <Text style={styles.previewSub}>
                  Já incluindo seus custos fixos. Os impostos entram no próximo passo.
                </Text>
              </View>
            )}
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

            <View style={styles.field}>
              <Text style={styles.label}>DAS MEI mensal (R$)</Text>
              <TextInput
                style={[styles.input, styles.inputPrefilled]}
                value={dasMei}
                onChangeText={setDasMei}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Taxa maquininha (%)</Text>
              <TextInput
                style={[styles.input, styles.inputPrefilled]}
                value={cardFee}
                onChangeText={setCardFee}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Reserva de segurança (opcional)</Text>
                <InfoTip
                  title="Reserva de segurança"
                  description="Não é um imposto do governo — o MEI é isento dos novos impostos da Reforma Tributária (CBS/IBS) enquanto faturar até R$ 81 mil/ano. Esse campo é só uma margem extra que você escolhe adicionar por conta própria, como proteção contra aumento de fornecedores ou imprevistos."
                />
              </View>
              <TextInput
                style={[styles.input, styles.inputPrefilled]}
                value={taxReform}
                onChangeText={setTaxReform}
                keyboardType="decimal-pad"
              />
              <Text style={styles.fieldHint}>
                Deixe 0 se não quiser usar essa margem extra.
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 O DAS MEI já vem no valor de 2026 para quem presta serviços. A taxa da maquininha varia conforme sua operadora — confira no app dela.
              </Text>
            </View>
          </View>
        );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  fieldHint: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 4 },
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

  // Itens extras
  extraItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.gray100,
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  extraItemText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.gray700, fontWeight: '600' },
  extraItemValue: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '700' },
  addExtraRow: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' },
  extraLabelInput: { flex: 1.5 },
  extraValueInput: { flex: 1 },
  addExtraBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info box
  infoBox: {
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  infoText: { fontSize: FONT_SIZES.sm, color: COLORS.gray700, lineHeight: 20 },

  // Prévia de valores em tempo real
  previewBox: {
    backgroundColor: COLORS.primary + '0D',
    borderRadius: 14,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
  },
  previewLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    color: COLORS.primary,
  },
  previewUnit: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  previewSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 4,
  },

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
