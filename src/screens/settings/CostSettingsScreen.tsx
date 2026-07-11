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
  const [desiredSalary, setDesiredSalary] = useState('');
  const [workDays, setWorkDays] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [dasMei, setDasMei] = useState('');
  const [cardFee, setCardFee] = useState('');
  const [pixFee, setPixFee] = useState('');
  const [taxReform, setTaxReform] = useState('');

  useEffect(() => {
    if (costConfig) {
      setRent(String(costConfig.rent ?? ''));
      setElectricity(String(costConfig.electricity ?? ''));
      setInternet(String(costConfig.internet ?? ''));
      setOtherFixed(String(costConfig.other_fixed ?? ''));
      setEquipmentValue(String(costConfig.equipment_value ?? ''));
      setDesiredSalary(String(costConfig.desired_salary ?? ''));
      setWorkDays(String(costConfig.work_days_per_month ?? ''));
      setWorkHours(String(costConfig.work_hours_per_day ?? ''));
      setDasMei(String(costConfig.das_mei_monthly ?? ''));
      setCardFee(String(costConfig.card_fee_percent ?? ''));
      setPixFee(String(costConfig.pix_fee_percent ?? ''));
      setTaxReform(String(costConfig.tax_reform_adjustment ?? ''));
    }
  }, [costConfig]);

  function toNum(val: string) {
    return parseFloat(String(val).replace(',', '.')) || 0;
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
        equipment_value: toNum(equipmentValue),
        desired_salary: toNum(desiredSalary),
        work_days_per_month: toNum(workDays) || 22,
        work_hours_per_day: toNum(workHours) || 8,
        das_mei_monthly: toNum(dasMei),
        card_fee_percent: toNum(cardFee),
        pix_fee_percent: toNum(pixFee),
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

  const sections: { title: string; fields: { label: string; value: string; set: (v: string) => void }[] }[] = [
    {
      title: '🏠 Custos fixos mensais',
      fields: [
        { label: 'Aluguel (R$)', value: rent, set: setRent },
        { label: 'Luz (R$)', value: electricity, set: setElectricity },
        { label: 'Internet (R$)', value: internet, set: setInternet },
        { label: 'Outros fixos (R$)', value: otherFixed, set: setOtherFixed },
        { label: 'Valor dos equipamentos (R$)', value: equipmentValue, set: setEquipmentValue },
      ],
    },
    {
      title: '💰 Trabalho e salário',
      fields: [
        { label: 'Salário desejado (R$)', value: desiredSalary, set: setDesiredSalary },
        { label: 'Dias trabalhados por mês', value: workDays, set: setWorkDays },
        { label: 'Horas por dia', value: workHours, set: setWorkHours },
      ],
    },
    {
      title: '📋 Impostos e taxas (2026)',
      fields: [
        { label: 'DAS MEI mensal (R$)', value: dasMei, set: setDasMei },
        { label: 'Taxa maquininha (%)', value: cardFee, set: setCardFee },
        { label: 'Taxa Pix (%)', value: pixFee, set: setPixFee },
        { label: 'Extra para novos impostos (%)', value: taxReform, set: setTaxReform },
      ],
    },
  ];

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

        {sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            {section.fields.map((f) => (
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
        ))}

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
