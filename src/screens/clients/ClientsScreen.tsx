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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/pricing';

interface ClientSummary {
  name: string;
  visitCount: number;
  totalSpent: number;
  lastVisit: string;
  daysSinceLastVisit: number;
}

export default function ClientsScreen() {
  const navigation = useNavigation<any>();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  async function loadClients() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select('client_name, charged_price, attended_at')
        .eq('user_id', user.id)
        .not('client_name', 'is', null)
        .order('attended_at', { ascending: false });

      if (error) throw error;

      const map = new Map<string, ClientSummary>();
      const now = new Date();

      (data || []).forEach((apt) => {
        const name = apt.client_name as string;
        if (!name) return;

        const existing = map.get(name);
        if (existing) {
          existing.visitCount += 1;
          existing.totalSpent += apt.charged_price;
        } else {
          const lastVisitDate = new Date(apt.attended_at);
          const daysSince = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
          map.set(name, {
            name,
            visitCount: 1,
            totalSpent: apt.charged_price,
            lastVisit: apt.attended_at,
            daysSinceLastVisit: daysSince,
          });
        }
      });

      const list = Array.from(map.values()).sort((a, b) => b.visitCount - a.visitCount);
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

  function getLoyaltyBadge(count: number): { label: string; color: string } | null {
    if (count >= 10) return { label: '⭐ Super Fiel', color: COLORS.gold };
    if (count >= 5) return { label: '💛 Fiel', color: COLORS.warning };
    if (count >= 2) return { label: '🔄 Retornou', color: COLORS.success };
    return null;
  }

  function getReturnAlert(days: number): { label: string; color: string } | null {
    if (days >= 60) return { label: `Sumiu há ${days} dias`, color: COLORS.danger };
    if (days >= 30) return { label: `${days} dias sem vir`, color: COLORS.warning };
    return null;
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
        <Text style={styles.title}>Minhas Clientes</Text>
        <Text style={styles.subtitle}>
          {clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrada{clients.length !== 1 ? 's' : ''}
        </Text>
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
            Quando você registrar atendimentos informando o nome da cliente, elas aparecerão aqui com o histórico de visitas.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          renderItem={({ item }) => {
            const badge = getLoyaltyBadge(item.visitCount);
            const alert = getReturnAlert(item.daysSinceLastVisit);
            return (
              <View style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <Text style={styles.clientMeta}>
                      {item.visitCount} visita{item.visitCount !== 1 ? 's' : ''} · {formatCurrency(item.totalSpent)} total
                    </Text>
                  </View>
                </View>

                {(badge || alert) && (
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
                  </View>
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

  header: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, marginTop: 2 },

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

  badgeRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm, flexWrap: 'wrap' },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.sm },
  emptyDesc: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, textAlign: 'center', lineHeight: 22 },
});
