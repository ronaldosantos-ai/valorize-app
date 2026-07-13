import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import InfoTip from '../../components/InfoTip';
import { ExtraCostItem } from '../../types';

export default function CostSettingsScreen() {
  const navigation = useNavigation<any>();
  const { costConfig, setCostConfig } = useAppStore();
  const [loading, setLoading] = useState(false);

  // Campos
  const [rent, setRent] = useState('');
  const [electricity, setElectricity] = useState('');
  const [internet, setInternet] = useState('');
  const [otherFixed, setOtherFixed] = useState('');
  const [equipmentValue, setEquipmentValue] = useState('');
  const [extraCosts, setExtraCosts] = useState<ExtraCostItem[]>([]);
  const [newExtraLabel, setNewExtraLabel] = useState('');
  const [newExtraValue, setNewExtraValue] = useState('');
  const [desiredSalary, setDesiredSalary] = useState('');
  const [workDays, setWorkDays] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [dasMei, setDasMei] = useState('');
  const [cardFee, setCardFee] = useState('');
  const [pixFeeExisting, setPixFeeExisting] = useState(0); // preservado silenciosamente
  const [taxReform, setTaxReform] = useState('');

  useEffect(() => {
    if (costConfig) {
      setRent(String(costConfig.rent ?? ''));
      setElectricity(String(costConfig.electricity ?? ''));
      setInternet(String(costConfig.internet ?? ''));
      setOtherFixed(String(costConfig.other_fixed ?? ''));
      setEquipmentValue(String(costConfig.equipment_value ?? ''));
      setExtraCosts(costConfig.extra_costs || []);
      setDesiredSalary(String(costConfig.desired_salary ?? ''));
      setWorkDays(String(costConfig.work_days_per_month ?? ''));
      setWorkHours(String(costConfig.work_hours_per_day ?? ''));
      setDasMei(String(costConfig.das_mei_monthly ?? ''));
      setCardFee(String(costConfig.card_fee_percent ?? ''));
      setPixFeeExisting(costConfig.pix_fee_percent ?? 0);
      setTaxReform(String(costConfig.tax_reform_adjustment ?? ''));
    }
  }, [costConfig]);

  function toNum(val: string) {
    return parseFloat(String(val).replace(',', '.')) || 0;
  }

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

  async function handleSave() {
    if (!toNum(desiredSalary)) {
      Alert.alert('Atenção', 'Informe o salário desejado.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticada.');

      const values = {
        rent: toNum(rent),
        electricity: toNum(electricity),
        internet: toNum(internet),
        other_fixed: toNum(otherFixed),
        extra_costs: extraCosts,
        equipment_value: toNum(equipmentValue),
        desired_salary: toNum(desiredSalary),
        work_days_per_month: toNum(workDays) || 22,
        work_hours_per_day: toNum(workHours) || 8,
        das_mei_monthly: toNum(dasMei),
        card_fee_percent: toNum(cardFee),
        pix_fee_percent: pixFeeExisting,
        tax_reform_adjustment: toNum(taxReform),
        updated_at: new Date().toISOString(),
      };

      // Busca se já existe um registro de custos para essa usuária,
      // independente do que estiver carregado localmente (evita duplicatas)
      const { data: existingList } = await supabase
        .from('cost_configs')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);
      const existing = existingList?.[0];

      let saved;
      if (existing?.id) {
        const { data, error } = await supabase
          .from('cost_configs')
          .update(values)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase
          .from('cost_configs')
          .insert({ user_id: user.id, ...values })
          .select()
          .single();
        if (error) throw error;
        saved = data;
      }

      setCostConfig(saved);
      Alert.alert('✅ Salvo!', 'Seus custos foram atualizados. Os cálculos de preço já usam os novos valores.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Algo deu errado.');
    } finally {
      setLoading(false);
    }
  }

  const extraCostsTotal = extraCosts.reduce((sum, item) => sum + item.value, 0);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header com voltar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Configurações de Custos</Text>
            <Text style={styles.subtitle}>Edite quando quiser — os cálculos atualizam na hora</Text>
          </View>
        </View>

        {/* Custos fixos mensais */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏠 Custos fixos mensais</Text>

          {[
            { label: 'Aluguel (R$)', value: rent, set: setRent },
            { label: 'Luz (R$)', value: electricity, set: setElectricity },
            { label: 'Internet (R$)', value: internet, set: setInternet },
            { label: 'Outros fixos (R$)', value: otherFixed, set: setOtherFixed },
          ].map((f) => (
            <View style={styles.field} key={f.label}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
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
              placeholder="0,00"
              placeholderTextColor={COLORS.gray300}
              value={equipmentValue}
              onChangeText={setEquipmentValue}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Itens extras */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Itens extras (opcional)</Text>
              <InfoTip
                title="Itens extras"
                description='Use para custos fixos que não se encaixam nas categorias acima — por exemplo "Contador", "Transporte", "Assinatura de app". Adicione, edite ou remova quando quiser.'
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
            {extraCostsTotal > 0 && (
              <Text style={styles.fieldHint}>Total em itens extras: {extraCostsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês</Text>
            )}
          </View>
        </View>

        {/* Trabalho e salário */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Trabalho e salário</Text>
          {[
            { label: 'Salário desejado (R$)', value: desiredSalary, set: setDesiredSalary },
            { label: 'Dias trabalhados por mês', value: workDays, set: setWorkDays },
            { label: 'Horas por dia', value: workHours, set: setWorkHours },
          ].map((f) => (
            <View style={styles.field} key={f.label}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={COLORS.gray300}
                value={f.value}
                onChangeText={f.set}
                keyboardType="decimal-pad"
              />
            </View>
          ))}
        </View>

        {/* Impostos e taxas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Impostos e taxas</Text>

          <View style={styles.field}>
            <Text style={styles.label}>DAS MEI mensal (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.gray300}
              value={dasMei}
              onChangeText={setDasMei}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Taxa maquininha (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.gray300}
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
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.gray300}
              value={taxReform}
              onChangeText={setTaxReform}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldHint}>Deixe 0 se não quiser usar essa margem extra.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.white} />
            : <>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                <Text style={styles.saveBtnText}>Salvar alterações</Text>
              </>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2, maxWidth: 260 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700, marginBottom: SPACING.sm },

  field: { marginBottom: SPACING.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.gray700 },
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

  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '800' },
});
