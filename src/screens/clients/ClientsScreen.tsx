import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/pricing';
import { Client } from '../../types';

interface ClientSummary extends Client {
  visitCount: number;
  totalSpent: number;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
}

export default function ClientsScreen() {
  const navigation = useNavigation<any>();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modal de edição / cadastro
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthday, setFormBirthday] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  async function loadClients() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: clientsData }, { data: appointmentsData }] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
        supabase
          .from('appointments')
          .select('client_id, client_name, charged_price, attended_at')
          .eq('user_id', user.id)
          .not('client_name', 'is', null),
      ]);

      const now = new Date();
      const statsByName = new Map<string, { count: number; total: number; last: string }>();

      (appointmentsData || []).forEach((apt) => {
        const key = apt.client_name as string;
        if (!key) return;
        const existing = statsByName.get(key);
        if (existing) {
          existing.count += 1;
          existing.total += apt.charged_price;
          if (new Date(apt.attended_at) > new Date(existing.last)) existing.last = apt.attended_at;
        } else {
          statsByName.set(key, { count: 1, total: apt.charged_price, last: apt.attended_at });
        }
      });

      const list: ClientSummary[] = (clientsData || []).map((c) => {
        const stats = statsByName.get(c.name);
        const daysSince = stats
          ? Math.floor((now.getTime() - new Date(stats.last).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          ...c,
          visitCount: stats?.count || 0,
          totalSpent: stats?.total || 0,
          lastVisit: stats?.last || null,
          daysSinceLastVisit: daysSince,
        };
      });

      list.sort((a, b) => b.visitCount - a.visitCount);
      setClients(list);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadClients();
  }

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Converte AAAA-MM-DD (banco) <-> DD/MM/AAAA (exibição)
  function isoToBr(iso?: string | null): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  }
  function brToIso(br: string): string | null {
    const clean = br.replace(/\D/g, '');
    if (clean.length !== 8) return null;
    const d = clean.slice(0, 2);
    const m = clean.slice(2, 4);
    const y = clean.slice(4, 8);
    return `${y}-${m}-${d}`;
  }
  function maskBirthdayInput(text: string): string {
    const clean = text.replace(/\D/g, '').slice(0, 8);
    let masked = clean;
    if (clean.length > 4) masked = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
    else if (clean.length > 2) masked = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return masked;
  }
  function handleDatePicked(event: any, date?: Date) {
    setShowDatePicker(Platform.OS === 'ios'); // no Android o picker já fecha sozinho
    if (date) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      setFormBirthday(`${d}/${m}/${y}`);
    }
  }

  function openNewClient() {
    setEditingClient(null);
    setFormName('');
    setFormPhone('');
    setFormBirthday('');
    setFormNotes('');
    setShowModal(true);
  }

  function openEditClient(client: Client) {
    setEditingClient(client);
    setFormName(client.name);
    setFormPhone(client.phone || '');
    setFormBirthday(isoToBr(client.birthday));
    setFormNotes(client.notes || '');
    setShowModal(true);
  }

  async function handleSaveClient() {
    if (!formName.trim()) {
      Alert.alert('Atenção', 'Informe o nome da cliente.');
      return;
    }
    if (formBirthday.trim() && !brToIso(formBirthday)) {
      Alert.alert('Atenção', 'Data de aniversário incompleta. Use o formato DD/MM/AAAA.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticada.');

      const values = {
        name: formName.trim(),
        phone: formPhone.trim() || null,
        birthday: brToIso(formBirthday),
        notes: formNotes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(values)
          .eq('id', editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({ user_id: user.id, ...values });
        if (error) throw error;
      }

      setShowModal(false);
      loadClients();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function handleWhatsApp(phone?: string) {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
    Linking.openURL(`https://wa.me/${withCountry}`);
  }

  function getLoyaltyBadge(count: number): { label: string; color: string } | null {
    if (count >= 10) return { label: '⭐ Super Fiel', color: COLORS.gold };
    if (count >= 5) return { label: '💛 Fiel', color: COLORS.warning };
    if (count >= 2) return { label: '🔄 Retornou', color: COLORS.success };
    return null;
  }

  function getReturnAlert(days: number | null): { label: string; color: string } | null {
    if (days === null) return null;
    if (days >= 60) return { label: `Sumiu há ${days} dias`, color: COLORS.danger };
    if (days >= 30) return { label: `${days} dias sem vir`, color: COLORS.warning };
    return null;
  }

  function formatBirthday(date?: string | null): string {
    if (!date) return '';
    const [y, m, d] = date.split('-');
    if (!m || !d) return date;
    return `${d}/${m}`;
  }

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Minhas Clientes</Text>
            <Text style={styles.subtitle}>
              {clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrada{clients.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openNewClient}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {clients.length > 0 && (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray300} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor={COLORS.gray300}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {clients.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>Nenhuma cliente ainda</Text>
          <Text style={styles.emptyDesc}>
            Toque no "+" para cadastrar sua primeira cliente, ou registre um atendimento informando o nome dela.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          renderItem={({ item }) => {
            const badge = getLoyaltyBadge(item.visitCount);
            const alert = getReturnAlert(item.daysSinceLastVisit);
            return (
              <TouchableOpacity style={styles.clientCard} onPress={() => openEditClient(item)}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <Text style={styles.clientMeta}>
                      {item.visitCount > 0
                        ? `${item.visitCount} visita${item.visitCount !== 1 ? 's' : ''} · ${formatCurrency(item.totalSpent)} total`
                        : 'Ainda não atendida'}
                    </Text>
                  </View>
                  {item.phone && (
                    <TouchableOpacity style={styles.whatsBtn} onPress={() => handleWhatsApp(item.phone)}>
                      <Ionicons name="logo-whatsapp" size={20} color={COLORS.success} />
                    </TouchableOpacity>
                  )}
                </View>

                {(badge || alert || item.birthday) && (
                  <View style={styles.badgeRow}>
                    {badge && (
                      <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    )}
                    {alert && (
                      <View style={[styles.badge, { backgroundColor: alert.color + '20' }]}>
                        <Text style={[styles.badgeText, { color: alert.color }]}>{alert.label}</Text>
                      </View>
                    )}
                    {item.birthday && (
                      <View style={[styles.badge, { backgroundColor: COLORS.primary + '15' }]}>
                        <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                          🎂 {formatBirthday(item.birthday)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal de cadastro/edição */}
      <Modal visible={showModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editingClient ? 'Editar cliente' : 'Nova cliente'}
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Nome *</Text>
                <TextInput
                  style={styles.input}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Ex: Maria Silva"
                  placeholderTextColor={COLORS.gray300}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Celular / WhatsApp</Text>
                <TextInput
                  style={styles.input}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor={COLORS.gray300}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Aniversário</Text>
                <View style={styles.birthdayRow}>
                  <TextInput
                    style={[styles.input, styles.birthdayInput]}
                    value={formBirthday}
                    onChangeText={(text) => setFormBirthday(maskBirthdayInput(text))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={COLORS.gray300}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={styles.calendarBtn}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={brToIso(formBirthday) ? new Date(brToIso(formBirthday) + 'T12:00:00') : new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={handleDatePicked}
                  />
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Ex: alérgica a acetona, prefere unha comprida..."
                  placeholderTextColor={COLORS.gray300}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveClient}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color={COLORS.white} size="small" />
                    : <Text style={styles.saveBtnText}>Salvar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
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

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.black },

  list: { padding: SPACING.lg, paddingTop: SPACING.xs },

  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  clientHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.gray700 },
  clientMeta: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2 },
  whatsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm, flexWrap: 'wrap' },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.sm },
  emptyDesc: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, textAlign: 'center', lineHeight: 22 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    width: '100%',
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md },

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
  notesInput: { height: 80, textAlignVertical: 'top' },
  birthdayRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  birthdayInput: { flex: 1 },
  calendarBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
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
  saveBtnText: { color: COLORS.white, fontWeight: '700' },
});
