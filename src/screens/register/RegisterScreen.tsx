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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { calcNetProfit, formatCurrency } from '../../utils/pricing';
import { Service } from '../../types';

type PaymentMethod = 'pix' | 'card' | 'cash';

const PAYMENT_OPTIONS: { key: PaymentMethod; label: string; icon: string; color: string }[] = [
  { key: 'pix', label: 'Pix', icon: 'phone-portrait-outline', color: '#32BCAD' },
  { key: 'card', label: 'Cartão', icon: 'card-outline', color: COLORS.primary },
  { key: 'cash', label: 'Dinheiro', icon: 'cash-outline', color: COLORS.success },
];

export default function RegisterScreen() {
  const { costConfig, addAppointment, addService } = useAppStore();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customName, setCustomName] = useState('');
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);

  const filteredServiceSuggestions = services.filter((s) =>
    s.name.toLowerCase().includes(customName.toLowerCase())
  );
  const [clientName, setClientName] = useState('');
  const [chargedPrice, setChargedPrice] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState('');
  const [netProfit, setNetProfit] = useState<number | null>(null);

  const [knownClients, setKnownClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const filteredClients = knownClients.filter((c) =>
    c.name.toLowerCase().includes(clientName.toLowerCase())
  );

  // Recarrega serviços e clientes toda vez que a tela ganha foco —
  // essencial porque as abas ficam "vivas" em segundo plano e um novo
  // serviço cadastrado em Preços não apareceria aqui sem isso.
  useFocusEffect(
    React.useCallback(() => {
      loadServices();
      loadKnownClients();
    }, [])
  );

  async function loadKnownClients() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');
    if (data) setKnownClients(data);
  }

  async function loadServices() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Mostra TODOS os serviços aqui (mesmo os ocultos da Tabela Premium) —
      // "ocultar" deve afetar só o que a cliente vê na tabela de preços,
      // não a praticidade de registrar um atendimento.
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      setServices(data || []);
    } finally {
      setLoadingServices(false);
    }
  }

  function calcProfit() {
    if (!costConfig || !chargedPrice) return;
    const price = parseFloat(chargedPrice.replace(',', '.'));
    if (isNaN(price)) return;

    const duration = selectedService?.duration_minutes || 60;
    const supply = selectedService?.supply_cost || 0;
    const profit = calcNetProfit(price, supply, costConfig, duration, payment);
    setNetProfit(profit);
  }

  useEffect(() => { calcProfit(); }, [chargedPrice, payment, selectedService]);

  function handleSelectService(service: Service) {
    setSelectedService(service);
    setChargedPrice(service.shielded_price.toFixed(2).replace('.', ','));
    setCustomName('');
  }

  function handleClear() {
    setSelectedService(null);
    setCustomName('');
    setClientName('');
    setSelectedClientId(null);
    setShowClientSuggestions(false);
    setChargedPrice('');
    setNotes('');
    setNetProfit(null);
    setPayment('pix');
  }

  async function handleSave() {
    const name = selectedService?.name || customName.trim();
    const price = parseFloat(chargedPrice.replace(',', '.'));

    if (!name) { Alert.alert('Atenção', 'Selecione ou informe o serviço realizado.'); return; }
    if (!chargedPrice || isNaN(price)) { Alert.alert('Atenção', 'Informe o valor cobrado.'); return; }
    if (!costConfig) { Alert.alert('Atenção', 'Configure seus custos primeiro.'); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticada.');

      const duration = selectedService?.duration_minutes || 60;
      const supply = selectedService?.supply_cost || 0;
      const profit = calcNetProfit(price, supply, costConfig, duration, payment);

      // Se digitou um nome de cliente novo (sem selecionar da lista), cadastra automaticamente
      let clientId = selectedClientId;
      const trimmedClientName = clientName.trim();
      if (trimmedClientName && !clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({ user_id: user.id, name: trimmedClientName })
          .select('id')
          .single();
        if (!clientError && newClient) {
          clientId = newClient.id;
        }
      }

      const appointment = {
        user_id: user.id,
        service_id: selectedService?.id || null,
        client_id: clientId || null,
        service_name: name,
        client_name: trimmedClientName || null,
        charged_price: price,
        net_profit: profit,
        payment_method: payment,
        notes: notes.trim() || null,
        attended_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(appointment)
        .select()
        .single();

      if (error) throw error;

      addAppointment({ ...data, created_at: data.created_at || new Date().toISOString() });
      if (trimmedClientName && !selectedClientId) {
        loadKnownClients(); // atualiza a lista para incluir a cliente recém-criada
      }

      // Se o serviço foi digitado à mão e não corresponde a nenhum já cadastrado,
      // cria automaticamente um registro em "Preços" — sinalizado para revisão,
      // já que ainda faltam duração e custo de insumos para o cálculo correto.
      if (!selectedService) {
        const alreadyExists = services.some(
          (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (!alreadyExists) {
          const { data: newService, error: serviceError } = await supabase
            .from('services')
            .insert({
              user_id: user.id,
              name: name.trim(),
              duration_minutes: 0,
              supply_cost: 0,
              min_price: price,
              perceived_price: price,
              shielded_price: price,
              is_active: true,
              needs_review: true,
            })
            .select()
            .single();
          if (!serviceError && newService) {
            addService(newService);
          }
        }
      }

      setNetProfit(profit);
      setShowSuccess(true);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Algo deu errado.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>Registrar Atendimento</Text>
          <Text style={styles.subtitle}>Registre agora e veja seu lucro real!</Text>
        </View>

        {/* Seleção de serviço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qual serviço foi feito?</Text>

          {services.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
              {services.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.serviceChip, selectedService?.id === s.id && styles.serviceChipActive]}
                  onPress={() => handleSelectService(s)}
                >
                  <Text style={[styles.serviceChipText, selectedService?.id === s.id && styles.serviceChipTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noServices}>
              <Text style={styles.noServicesText}>
                Você ainda não cadastrou serviços. Use o campo abaixo para registrar manualmente.
              </Text>
            </View>
          )}

          {/* Serviço manual */}
          {!selectedService && (
            <View style={styles.field}>
              <Text style={styles.label}>Ou digite o serviço</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Esmaltação simples"
                placeholderTextColor={COLORS.gray300}
                value={customName}
                onChangeText={(text) => {
                  setCustomName(text);
                  setShowServiceSuggestions(text.length > 0);
                }}
                onFocus={() => setShowServiceSuggestions(customName.length > 0)}
                autoCapitalize="sentences"
              />
              {showServiceSuggestions && filteredServiceSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {filteredServiceSuggestions.slice(0, 4).map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.suggestionItem}
                      onPress={() => {
                        handleSelectService(s);
                        setShowServiceSuggestions(false);
                      }}
                    >
                      <Ionicons name="pricetag-outline" size={16} color={COLORS.gray500} />
                      <Text style={styles.suggestionText}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {selectedService && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Ionicons name="close-circle" size={16} color={COLORS.gray500} />
              <Text style={styles.clearBtnText}>Limpar seleção</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nome da cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nome da cliente (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Maria Silva"
            placeholderTextColor={COLORS.gray300}
            value={clientName}
            onChangeText={(text) => {
              setClientName(text);
              setSelectedClientId(null);
              setShowClientSuggestions(text.length > 0);
            }}
            autoCapitalize="words"
          />
          {showClientSuggestions && filteredClients.length > 0 && (
            <View style={styles.suggestionsBox}>
              {filteredClients.slice(0, 4).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setClientName(c.name);
                    setSelectedClientId(c.id);
                    setShowClientSuggestions(false);
                  }}
                >
                  <Ionicons name="person-outline" size={16} color={COLORS.gray500} />
                  <Text style={styles.suggestionText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {clientName.length > 0 && !selectedClientId && (
            <Text style={styles.newClientHint}>
              ✨ Nova cliente — será cadastrada automaticamente ao salvar
            </Text>
          )}
        </View>

        {/* Valor cobrado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quanto você cobrou?</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currencySymbol}>R$</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="0,00"
              placeholderTextColor={COLORS.gray300}
              value={chargedPrice}
              onChangeText={setChargedPrice}
              keyboardType="decimal-pad"
            />
          </View>
          {selectedService && (
            <View style={styles.priceSuggestions}>
              <Text style={styles.priceSuggestionsLabel}>Toque para preencher:</Text>
              <View style={styles.priceSuggestionsRow}>
                <TouchableOpacity
                  style={[styles.priceSuggestionChip, { borderColor: COLORS.danger }]}
                  onPress={() => setChargedPrice(selectedService.min_price.toFixed(2).replace('.', ','))}
                >
                  <Text style={[styles.priceSuggestionLabel, { color: COLORS.danger }]}>Mínimo</Text>
                  <Text style={[styles.priceSuggestionValue, { color: COLORS.danger }]}>
                    {formatCurrency(selectedService.min_price)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.priceSuggestionChip, { borderColor: COLORS.warning }]}
                  onPress={() => setChargedPrice(selectedService.perceived_price.toFixed(2).replace('.', ','))}
                >
                  <Text style={[styles.priceSuggestionLabel, { color: COLORS.warning }]}>Ideal</Text>
                  <Text style={[styles.priceSuggestionValue, { color: COLORS.warning }]}>
                    {formatCurrency(selectedService.perceived_price)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.priceSuggestionChip, { borderColor: COLORS.success }]}
                  onPress={() => setChargedPrice(selectedService.shielded_price.toFixed(2).replace('.', ','))}
                >
                  <Text style={[styles.priceSuggestionLabel, { color: COLORS.success }]}>Blindado</Text>
                  <Text style={[styles.priceSuggestionValue, { color: COLORS.success }]}>
                    {formatCurrency(selectedService.shielded_price)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Forma de pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como pagou?</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.paymentBtn, payment === opt.key && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
                onPress={() => setPayment(opt.key)}
              >
                <Ionicons name={opt.icon as any} size={22} color={payment === opt.key ? opt.color : COLORS.gray500} />
                <Text style={[styles.paymentLabel, payment === opt.key && { color: opt.color }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lucro calculado */}
        {netProfit !== null && chargedPrice && (
          <View style={[styles.profitBox, netProfit >= 0 ? styles.profitPositive : styles.profitNegative]}>
            <Text style={styles.profitLabel}>Seu lucro líquido neste atendimento</Text>
            <Text style={styles.profitValue}>{formatCurrency(netProfit)}</Text>
            <Text style={styles.profitSub}>
              {netProfit >= 0
                ? '✅ Ótimo! Você está cobrindo seus custos.'
                : '⚠️ Atenção! Esse valor não cobre seus custos.'}
            </Text>
          </View>
        )}

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações (opcional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Ex: cliente nova, pediu reforço..."
            placeholderTextColor={COLORS.gray300}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Botão salvar */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.white} />
            : <>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                <Text style={styles.saveBtnText}>Registrar atendimento</Text>
              </>
          }
        </TouchableOpacity>

      </ScrollView>

      {/* Modal de sucesso */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowSuccess(false)}
            >
              <Ionicons name="close" size={22} color={COLORS.gray500} />
            </TouchableOpacity>

            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>Atendimento registrado!</Text>
            <Text style={styles.modalProfit}>
              Você ganhou{'\n'}
              <Text style={styles.modalProfitValue}>{formatCurrency(netProfit || 0)}</Text>
              {'\n'}limpos agora!
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => { setShowSuccess(false); handleClear(); }}
            >
              <Text style={styles.modalBtnText}>Registrar outro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => { setShowSuccess(false); handleClear(); }}
            >
              <Text style={styles.modalSecondaryBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: { paddingTop: SPACING.lg, marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, marginTop: 4 },

  section: {
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
  sectionTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700, marginBottom: SPACING.sm },

  // Serviços
  servicesScroll: { marginBottom: SPACING.sm },
  serviceChip: {
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  serviceChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  serviceChipText: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, fontWeight: '600' },
  serviceChipTextActive: { color: COLORS.primary },
  noServices: { backgroundColor: COLORS.gray100, borderRadius: 10, padding: SPACING.sm, marginBottom: SPACING.sm },
  noServicesText: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, lineHeight: 18 },

  // Sugestões de clientes
  suggestionsBox: {
    marginTop: SPACING.xs,
    borderRadius: 10,
    backgroundColor: COLORS.offWhite,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  suggestionText: { fontSize: FONT_SIZES.sm, color: COLORS.gray700 },
  newClientHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs },
  clearBtnText: { fontSize: FONT_SIZES.xs, color: COLORS.gray500 },

  // Campo
  field: { marginTop: SPACING.sm },
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
  notesInput: { height: 80, textAlignVertical: 'top' },

  // Preço
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    backgroundColor: COLORS.offWhite,
    overflow: 'hidden',
  },
  currencySymbol: {
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
    paddingVertical: SPACING.md,
  },
  priceInput: {
    flex: 1,
    padding: SPACING.md,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  priceHint: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: SPACING.xs },

  // Chips de preço sugerido
  priceSuggestions: { marginTop: SPACING.sm },
  priceSuggestionsLabel: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginBottom: SPACING.xs },
  priceSuggestionsRow: { flexDirection: 'row', gap: SPACING.xs },
  priceSuggestionChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  priceSuggestionLabel: { fontSize: 10, fontWeight: '700' },
  priceSuggestionValue: { fontSize: FONT_SIZES.sm, fontWeight: '800', marginTop: 1 },

  // Pagamento
  paymentRow: { flexDirection: 'row', gap: SPACING.sm },
  paymentBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 4,
  },
  paymentLabel: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.gray500 },

  // Lucro
  profitBox: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  profitPositive: { backgroundColor: COLORS.success + '15', borderWidth: 1.5, borderColor: COLORS.success },
  profitNegative: { backgroundColor: COLORS.danger + '10', borderWidth: 1.5, borderColor: COLORS.danger },
  profitLabel: { fontSize: FONT_SIZES.sm, color: COLORS.gray700, fontWeight: '600' },
  profitValue: { fontSize: FONT_SIZES.hero, fontWeight: '900', color: COLORS.primary, marginVertical: SPACING.xs },
  profitSub: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, textAlign: 'center' },

  // Botão salvar
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

  // Modal sucesso
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalEmoji: { fontSize: 64, marginBottom: SPACING.sm },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md },
  modalProfit: { fontSize: FONT_SIZES.md, color: COLORS.gray700, textAlign: 'center', lineHeight: 28 },
  modalProfitValue: { fontSize: FONT_SIZES.hero, fontWeight: '900', color: COLORS.success },
  modalBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  modalBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },
  modalSecondaryBtn: { marginTop: SPACING.sm, paddingVertical: SPACING.xs },
  modalSecondaryBtnText: { color: COLORS.gray500, fontSize: FONT_SIZES.sm, fontWeight: '600' },
});
