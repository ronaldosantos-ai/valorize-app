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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import {
  calcMinPrice,
  calcPerceivedPrice,
  calcShieldedPrice,
  formatCurrency,
} from '../../utils/pricing';
import { Service } from '../../types';

export default function CalculatorScreen() {
  const { costConfig, services, setServices, addService } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Formulário
  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState('');
  const [supplyCost, setSupplyCost] = useState('');

  // Resultado calculado
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [perceivedPrice, setPerceivedPrice] = useState<number | null>(null);
  const [shieldedPrice, setShieldedPrice] = useState<number | null>(null);

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setServices(data || []);
    } finally {
      setLoadingServices(false);
    }
  }

  function calcPrices() {
    if (!costConfig) return;
    const dur = parseFloat(duration.replace(',', '.'));
    const supply = parseFloat(supplyCost.replace(',', '.')) || 0;
    if (!dur || isNaN(dur)) return;

    const min = calcMinPrice(costConfig, dur, supply);
    const perceived = calcPerceivedPrice(min);
    const shielded = calcShieldedPrice(costConfig, dur, supply);

    setMinPrice(min);
    setPerceivedPrice(perceived);
    setShieldedPrice(shielded);
  }

  useEffect(() => { calcPrices(); }, [duration, supplyCost, costConfig]);

  async function handleSave() {
    if (!serviceName.trim()) { Alert.alert('Atenção', 'Informe o nome do serviço.'); return; }
    if (!duration) { Alert.alert('Atenção', 'Informe a duração em minutos.'); return; }
    if (!minPrice || !perceivedPrice || !shieldedPrice) { Alert.alert('Atenção', 'Verifique os dados.'); return; }
    if (!costConfig) { Alert.alert('Atenção', 'Configure seus custos primeiro.'); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticada.');

      const service = {
        user_id: user.id,
        name: serviceName.trim(),
        duration_minutes: parseInt(duration),
        supply_cost: parseFloat(supplyCost.replace(',', '.')) || 0,
        min_price: minPrice,
        perceived_price: perceivedPrice,
        shielded_price: shieldedPrice,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('services')
        .insert(service)
        .select()
        .single();

      if (error) throw error;

      addService({ ...data, created_at: data.created_at || new Date().toISOString() });
      Alert.alert('✅ Salvo!', `"${serviceName}" foi adicionado à sua lista de serviços.`);
      handleClear();
      setShowForm(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Algo deu errado.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(service: Service) {
    try {
      await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);
      setServices(services.map(s =>
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      ));
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar o serviço.');
    }
  }

  function handleClear() {
    setServiceName('');
    setDuration('');
    setSupplyCost('');
    setMinPrice(null);
    setPerceivedPrice(null);
    setShieldedPrice(null);
  }

  function renderService({ item }: { item: Service }) {
    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <TouchableOpacity onPress={() => handleToggleActive(item)}>
            <Ionicons
              name={item.is_active ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={item.is_active ? COLORS.success : COLORS.gray300}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.serviceDuration}>⏱ {item.duration_minutes} minutos</Text>
        <View style={styles.pricesRow}>
          <View style={styles.priceItem}>
            <Text style={styles.priceItemLabel}>Mínimo</Text>
            <Text style={[styles.priceItemValue, { color: COLORS.danger }]}>
              {item.is_active ? formatCurrency(item.min_price) : 'R$ ••••'}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceItemLabel}>Ideal</Text>
            <Text style={[styles.priceItemValue, { color: COLORS.warning }]}>
              {item.is_active ? formatCurrency(item.perceived_price) : 'R$ ••••'}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceItemLabel}>Blindado</Text>
            <Text style={[styles.priceItemValue, { color: COLORS.success }]}>
              {item.is_active ? formatCurrency(item.shielded_price) : 'R$ ••••'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (loadingServices) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
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
          <View>
            <Text style={styles.title}>Calculadora de Preços</Text>
            <Text style={styles.subtitle}>Descubra quanto cobrar com autoridade</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Formulário */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Novo serviço</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Nome do serviço</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Esmaltação simples"
                placeholderTextColor={COLORS.gray300}
                value={serviceName}
                onChangeText={setServiceName}
                autoCapitalize="sentences"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Duração (min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="60"
                  placeholderTextColor={COLORS.gray300}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Custo insumos (R$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.gray300}
                  value={supplyCost}
                  onChangeText={setSupplyCost}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={styles.supplyHint}>
              💡 É só o quanto gasta desse serviço, não o preço do pote inteiro.{'\n'}
              Ex: se um esmalte de R$ 20 rende 40 usos, o custo aqui é R$ 0,50.
            </Text>

            {/* Resultado */}
            {minPrice !== null && (
              <View style={styles.resultBox}>
                <Text style={styles.resultTitle}>💡 Preços calculados</Text>
                <View style={styles.resultRow}>
                  <View style={[styles.resultCard, { borderColor: COLORS.danger }]}>
                    <Text style={styles.resultLabel}>🔴 Mínimo</Text>
                    <Text style={[styles.resultValue, { color: COLORS.danger }]}>
                      {formatCurrency(minPrice)}
                    </Text>
                    <Text style={styles.resultDesc}>Para não ter prejuízo</Text>
                  </View>
                  <View style={[styles.resultCard, { borderColor: COLORS.warning }]}>
                    <Text style={styles.resultLabel}>🟡 Ideal</Text>
                    <Text style={[styles.resultValue, { color: COLORS.warning }]}>
                      {formatCurrency(perceivedPrice!)}
                    </Text>
                    <Text style={styles.resultDesc}>Você lucra mais</Text>
                  </View>
                  <View style={[styles.resultCard, { borderColor: COLORS.success }]}>
                    <Text style={styles.resultLabel}>🟢 Blindado</Text>
                    <Text style={[styles.resultValue, { color: COLORS.success }]}>
                      {formatCurrency(shieldedPrice!)}
                    </Text>
                    <Text style={styles.resultDesc}>Com impostos 2026</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Botões */}
            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { handleClear(); setShowForm(false); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.saveBtnText}>Salvar serviço</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lista de serviços */}
        {services.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💅</Text>
            <Text style={styles.emptyTitle}>Nenhum serviço ainda</Text>
            <Text style={styles.emptyDesc}>
              Toque no "+" acima para cadastrar seu primeiro serviço e descobrir quanto cobrar!
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.listTitle}>Seus serviços ({services.length})</Text>
            {services.map((item) => (
              <View key={item.id}>{renderService({ item })}</View>
            ))}
          </>
        )}

        {!costConfig && (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
            <Text style={styles.warningText}>
              Seus custos ainda não foram carregados. Complete a configuração inicial na tela de Início para que os cálculos funcionem corretamente.
            </Text>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  flex1: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Formulário
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  formTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md },
  supplyHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    lineHeight: 16,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  field: { marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.sm },
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
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  resultTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700, marginBottom: SPACING.sm },
  resultRow: { flexDirection: 'row', gap: SPACING.xs },
  resultCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: SPACING.sm,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  resultLabel: { fontSize: 10, fontWeight: '700', color: COLORS.gray700, marginBottom: 4 },
  resultValue: { fontSize: FONT_SIZES.md, fontWeight: '800' },
  resultDesc: { fontSize: 9, color: COLORS.gray500, textAlign: 'center', marginTop: 2 },

  // Botões do formulário
  formBtns: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.gray500, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },

  // Lista
  listTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.gray700, marginBottom: SPACING.sm },
  serviceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  serviceCardInactive: { opacity: 0.5 },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  serviceName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.gray700 },
  serviceDuration: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginBottom: SPACING.sm },
  pricesRow: { flexDirection: 'row', gap: SPACING.xs },
  priceItem: { flex: 1, alignItems: 'center' },
  priceItemLabel: { fontSize: 10, color: COLORS.gray500, fontWeight: '600' },
  priceItemValue: { fontSize: FONT_SIZES.sm, fontWeight: '800' },

  // Vazio
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.sm },
  emptyDesc: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, textAlign: 'center', lineHeight: 22 },

  // Aviso
  warningBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
    alignItems: 'flex-start',
  },
  warningText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.gray700, lineHeight: 18 },
});
