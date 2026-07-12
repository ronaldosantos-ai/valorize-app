import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/pricing';

interface HistoryItem {
  id: string;
  service_name: string;
  client_name: string | null;
  charged_price: number;
  net_profit: number;
  payment_method: 'pix' | 'card' | 'cash';
  notes: string | null;
  attended_at: string;
}

interface Section {
  title: string;
  totalProfit: number;
  data: HistoryItem[];
}

const PAYMENT_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  pix: { icon: 'phone-portrait-outline', color: '#32BCAD', label: 'Pix' },
  card: { icon: 'card-outline', color: COLORS.primary, label: 'Cartão' },
  cash: { icon: 'cash-outline', color: COLORS.success, label: 'Dinheiro' },
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function UsageHistoryScreen() {
  const navigation = useNavigation<any>();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select('id, service_name, client_name, charged_price, net_profit, payment_method, notes, attended_at')
        .eq('user_id', user.id)
        .order('attended_at', { ascending: false });

      if (error) throw error;

      const grouped = new Map<string, HistoryItem[]>();
      (data || []).forEach((item) => {
        const d = new Date(item.attended_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
      });

      const sectionsList: Section[] = Array.from(grouped.entries()).map(([key, items]) => {
        const [year, month] = key.split('-').map(Number);
        const total = items.reduce((sum, i) => sum + i.net_profit, 0);
        return {
          title: `${MONTH_NAMES[month]} ${year}`,
          totalProfit: total,
          data: items,
        };
      });

      setSections(sectionsList);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadHistory();
  }

  function handleDelete(id: string) {
    Alert.alert(
      'Excluir registro',
      'Tem certeza que deseja apagar este atendimento do histórico? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('appointments').delete().eq('id', id);
              if (error) throw error;
              loadHistory();
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Histórico de Uso</Text>
          <Text style={styles.subtitle}>Todos os seus atendimentos registrados</Text>
        </View>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Nenhum atendimento ainda</Text>
          <Text style={styles.emptyDesc}>
            Assim que você registrar atendimentos, eles aparecerão aqui organizados por mês.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionTotal}>{formatCurrency(section.totalProfit)}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const payment = PAYMENT_ICONS[item.payment_method];
            return (
              <View style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={[styles.itemIcon, { backgroundColor: payment.color + '15' }]}>
                    <Ionicons name={payment.icon as any} size={18} color={payment.color} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemService}>{item.service_name}</Text>
                    {item.client_name && (
                      <Text style={styles.itemClient}>👤 {item.client_name}</Text>
                    )}
                    <Text style={styles.itemDate}>{formatDate(item.attended_at)}</Text>
                  </View>
                  <View style={styles.itemValues}>
                    <Text style={styles.itemPrice}>{formatCurrency(item.charged_price)}</Text>
                    <Text style={[styles.itemProfit, { color: item.net_profit >= 0 ? COLORS.success : COLORS.danger }]}>
                      {item.net_profit >= 0 ? '+' : ''}{formatCurrency(item.net_profit)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.gray300} />
                  </TouchableOpacity>
                </View>
                {item.notes && (
                  <Text style={styles.itemNotes}>💬 {item.notes}</Text>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
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
  subtitle: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2 },

  list: { padding: SPACING.lg, paddingTop: SPACING.xs },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.white, textTransform: 'capitalize' },
  sectionTotal: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.gold },

  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemService: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700 },
  itemClient: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 1 },
  itemDate: { fontSize: 11, color: COLORS.gray300, marginTop: 1 },
  itemValues: { alignItems: 'flex-end' },
  itemPrice: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700 },
  itemProfit: { fontSize: FONT_SIZES.xs, fontWeight: '700', marginTop: 1 },
  deleteBtn: { padding: SPACING.xs },
  itemNotes: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    fontStyle: 'italic',
  },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.sm },
  emptyDesc: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, textAlign: 'center', lineHeight: 22 },
});
