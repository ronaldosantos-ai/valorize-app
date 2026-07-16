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
import { useFocusEffect } from '@react-navigation/native';
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
import InfoTip from '../../components/InfoTip';
import CurrencyInput from '../../components/CurrencyInput';

function toNum(val: string): number {
  return parseFloat(val.replace(',', '.')) || 0;
}

export default function CalculatorScreen() {
  const { costConfig, services, setServices, addService } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Formulário
  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState('');
  const [supplyCost, setSupplyCost] = useState('');

  // Preços — editáveis pela usuária, preenchidos automaticamente ao calcular
  const [minPriceStr, setMinPriceStr] = useState('');
  const [perceivedPriceStr, setPerceivedPriceStr] = useState('');
  const [shieldedPriceStr, setShieldedPriceStr] = useState('');
  const hasCalculated = minPriceStr !== '' || perceivedPriceStr !== '';

  useFocusEffect(
    React.useCallback(() => {
      loadServices();
    }, [])
  );

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

  // Recalcula os 3 preços sugeridos automaticamente quando duração/insumo mudam.
  // A usuária ainda pode editar manualmente o valor final em cada campo depois.
  function calcPrices() {
    if (!costConfig) return;
    const dur = toNum(duration);
    const supply = toNum(supplyCost);
    if (!dur) return;

    const min = calcMinPrice(costConfig, dur, supply);
    const perceived = calcPerceivedPrice(min);
    const shielded = calcShieldedPrice(costConfig, dur, supply);

    setMinPriceStr(min.toFixed(2).replace('.', ','));
    setPerceivedPriceStr(perceived.toFixed(2).replace('.', ','));
    setShieldedPriceStr(shielded.toFixed(2).replace('.', ','));
  }

  useEffect(() => { calcPrices(); }, [duration, supplyCost, costConfig]);

  function openNewServiceForm() {
    setEditingServiceId(null);
    handleClear();
    setShowForm(true);
  }

  function openEditServiceForm(service: Service) {
    setEditingServiceId(service.id);
    setServiceName(service.name);
    setDuration(service.duration_minutes ? String(service.duration_minutes) : '');
    setSupplyCost(service.supply_cost ? service.supply_cost.toFixed(2).replace('.', ',') : '');
    setMinPriceStr(service.min_price ? service.min_price.toFixed(2).replace('.', ',') : '');
    setPerceivedPriceStr(service.perceived_price ? service.perceived_price.toFixed(2).replace('.', ',') : '');
    setShieldedPriceStr(service.shielded_price ? service.shielded_price.toFixed(2).replace('.', ',') : '');
    setShowForm(true);
  }

  async function handleSave() {
    if (!serviceName.trim()) { Alert.alert('Atenção', 'Informe o nome do serviço.'); return; }
    if (!duration) { Alert.alert('Atenção', 'Informe a duração em minutos.'); return; }
    if (!minPriceStr || !perceivedPriceStr || !shieldedPriceStr) { Alert.alert('Atenção', 'Verifique os preços.'); return; }
    if (!costConfig) { Alert.alert('Atenção', 'Configure seus custos primeiro.'); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticada.');

      const serviceData = {
        name: serviceName.trim(),
        duration_minutes: parseInt(duration),
        supply_cost: toNum(supplyCost),
        min_price: toNum(minPriceStr),
        perceived_price: toNum(perceivedPriceStr),
        shielded_price: toNum(shieldedPriceStr),
        needs_review: false, // qualquer salvamento pelo formulário completo os dados
      };

      if (editingServiceId) {
        // Editar NUNCA altera atendimentos já registrados — cada atendimento
        // já guarda seu próprio valor no momento em que foi salvo, então isso
        // só afeta os próximos registros e a Tabela Premium a partir de agora.
        const { data, error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingServiceId)
          .select()
          .single();
        if (error) throw error;
        setServices(services.map(s => s.id === editingServiceId ? data : s));
        Alert.alert('✅ Atualizado!', `"${serviceName}" foi atualizado com sucesso.`);
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert({ user_id: user.id, ...serviceData, is_active: true })
          .select()
          .single();
        if (error) throw error;
        addService({ ...data, created_at: data.created_at || new Date().toISOString() });
        Alert.alert('✅ Salvo!', `"${serviceName}" foi adicionado à sua lista de serviços.`);
      }

      handleClear();
      setEditingServiceId(null);
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

  function handleDeleteService(service: Service) {
    Alert.alert(
      'Excluir serviço',
      `Tem certeza que deseja excluir "${service.name}"? O histórico de atendimentos já registrados não será afetado — só esse serviço deixará de aparecer na Calculadora e na Tabela.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('services').delete().eq('id', service.id);
              if (error) throw error;
              setServices(services.filter(s => s.id !== service.id));
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Não foi possível excluir o serviço.');
            }
          },
        },
      ]
    );
  }

  function handleClear() {
    setServiceName('');
    setDuration('');
    setSupplyCost('');
    setMinPriceStr('');
    setPerceivedPriceStr('');
    setShieldedPriceStr('');
  }

  function renderService(item: Service) {
    return (
      <View key={item.id} style={[styles.serviceCard, item.needs_review && styles.serviceCardWarning]}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <View style={styles.serviceHeaderBtns}>
            <TouchableOpacity onPress={() => openEditServiceForm(item)} style={styles.iconBtn}>
              <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleToggleActive(item)} style={styles.iconBtn}>
              <Ionicons
                name={item.is_active ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={item.is_active ? COLORS.success : COLORS.gray300}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteService(item)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
        {item.needs_review && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={14} color="#B8860B" />
            <Text style={styles.warningBannerText}>
              Criado automaticamente pelo Registro — falta duração e custo de insumos para calcular certo. Toque no lápis para completar.
            </Text>
          </View>
        )}
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
        {!item.is_active && (
          <Text style={styles.hiddenNote}>👁️ Oculto só da Tabela Premium — continua disponível para registrar atendimentos</Text>
        )}
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
            onPress={() => showForm ? setShowForm(false) : openNewServiceForm()}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Formulário */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingServiceId ? 'Editar serviço' : 'Novo serviço'}</Text>

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
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Custo insumos (R$)</Text>
                  <InfoTip
                    title="Custo de insumos"
                    description="É só o quanto gasta desse serviço específico, não o preço do pote inteiro. Ex: se um esmalte de R$ 20 rende 40 usos, o custo aqui é R$ 0,50."
                  />
                </View>
                <CurrencyInput
                  style={styles.input}
                  value={supplyCost}
                  onChangeValue={setSupplyCost}
                />
              </View>
            </View>

            {/* Preços — editáveis */}
            {hasCalculated && (
              <View style={styles.resultBox}>
                <Text style={styles.resultTitle}>💡 Preços sugeridos — edite se quiser</Text>
                <View style={styles.resultRow}>
                  <View style={[styles.resultCard, { borderColor: COLORS.danger }]}>
                    <Text style={styles.resultLabel}>🔴 Mínimo</Text>
                    <CurrencyInput
                      style={[styles.resultInput, { color: COLORS.danger }]}
                      value={minPriceStr}
                      onChangeValue={setMinPriceStr}
                    />
                    <Text style={styles.resultDesc}>Para não ter prejuízo</Text>
                  </View>
                  <View style={[styles.resultCard, { borderColor: COLORS.warning }]}>
                    <Text style={styles.resultLabel}>🟡 Ideal</Text>
                    <CurrencyInput
                      style={[styles.resultInput, { color: COLORS.warning }]}
                      value={perceivedPriceStr}
                      onChangeValue={setPerceivedPriceStr}
                    />
                    <Text style={styles.resultDesc}>Você lucra mais</Text>
                  </View>
                  <View style={[styles.resultCard, { borderColor: COLORS.success }]}>
                    <Text style={styles.resultLabel}>🟢 Blindado</Text>
                    <CurrencyInput
                      style={[styles.resultInput, { color: COLORS.success }]}
                      value={shieldedPriceStr}
                      onChangeValue={setShieldedPriceStr}
                    />
                    <Text style={styles.resultDesc}>Com impostos 2026</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Botões */}
            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { handleClear(); setEditingServiceId(null); setShowForm(false); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.saveBtnText}>{editingServiceId ? 'Salvar alterações' : 'Salvar serviço'}</Text>
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
            {services.map((item) => renderService(item))}
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
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

  // Resultado — agora editável
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
  resultInput: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
    minWidth: 60,
  },
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
  serviceCardWarning: {
    borderWidth: 1.5,
    borderColor: '#F0C420',
    backgroundColor: '#FFFDF0',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFF3C4',
    borderRadius: 8,
    padding: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  warningBannerText: { flex: 1, fontSize: 11, color: '#7A5C00', lineHeight: 15 },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  serviceHeaderBtns: { flexDirection: 'row', gap: SPACING.sm },
  iconBtn: { padding: 2 },
  serviceName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.gray700, flex: 1 },
  serviceDuration: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginBottom: SPACING.sm },
  pricesRow: { flexDirection: 'row', gap: SPACING.xs },
  priceItem: { flex: 1, alignItems: 'center' },
  priceItemLabel: { fontSize: 10, color: COLORS.gray500, fontWeight: '600' },
  priceItemValue: { fontSize: FONT_SIZES.sm, fontWeight: '800' },
  hiddenNote: { fontSize: 10, color: COLORS.gray300, marginTop: SPACING.xs, fontStyle: 'italic' },

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
