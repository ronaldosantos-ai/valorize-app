import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, MEI_ANNUAL_LIMIT } from '../../constants';
import { supabase } from '../../lib/supabase';
import { formatCurrency, calcMeiProgress, calcSalaryProgress } from '../../utils/pricing';
import { useAppStore } from '../../store';

export default function HomeScreen() {
  const { costConfig } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [todayProfit, setTodayProfit] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [monthProfit, setMonthProfit] = useState(0);
  const [yearRevenue, setYearRevenue] = useState(0);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      if (profile) setUserName(profile.name.split(' ')[0]);

      // Hoje
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from('appointments')
        .select('net_profit')
        .eq('user_id', user.id)
        .gte('attended_at', `${todayStr}T00:00:00`)
        .lte('attended_at', `${todayStr}T23:59:59`);

      if (todayData) {
        setTodayAppointments(todayData.length);
        setTodayProfit(todayData.reduce((sum, a) => sum + a.net_profit, 0));
      }

      // Mês atual
      const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const { data: monthData } = await supabase
        .from('appointments')
        .select('net_profit, charged_price')
        .eq('user_id', user.id)
        .gte('attended_at', `${monthStr}-01T00:00:00`);

      if (monthData) {
        setMonthProfit(monthData.reduce((sum, a) => sum + a.net_profit, 0));
      }

      // Ano atual (para monitor MEI)
      const yearStr = `${today.getFullYear()}-01-01T00:00:00`;
      const { data: yearData } = await supabase
        .from('appointments')
        .select('charged_price')
        .eq('user_id', user.id)
        .gte('attended_at', yearStr);

      if (yearData) {
        setYearRevenue(yearData.reduce((sum, a) => sum + a.charged_price, 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const desiredSalary = costConfig?.desired_salary || 3000;
  const salaryProgress = calcSalaryProgress(monthProfit, desiredSalary);
  const meiProgress = calcMeiProgress(yearRevenue);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {userName || 'profissional'}! 👋</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>💅</Text>
        </View>
      </View>

      {/* Cards do dia */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardBlue]}>
          <Text style={styles.cardLabel}>Lucro hoje</Text>
          <Text style={styles.cardValue}>{formatCurrency(todayProfit)}</Text>
          <Text style={styles.cardSub}>{todayAppointments} atendimento{todayAppointments !== 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.card, styles.cardGold]}>
          <Text style={styles.cardLabel}>Lucro no mês</Text>
          <Text style={styles.cardValueDark}>{formatCurrency(monthProfit)}</Text>
          <Text style={styles.cardSubDark}>acumulado</Text>
        </View>
      </View>

      {/* Progresso do salário */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💰 Meta de salário</Text>
          <Text style={styles.sectionValue}>
            {formatCurrency(monthProfit)} / {formatCurrency(desiredSalary)}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(salaryProgress.percent, 100)}%`, backgroundColor: COLORS.primary }]} />
        </View>
        <Text style={styles.progressLabel}>
          {salaryProgress.percent >= 100
            ? '🎉 Meta atingida! Parabéns!'
            : `Faltam ${formatCurrency(salaryProgress.remaining)} para sua meta`}
        </Text>
      </View>

      {/* Monitor MEI */}
      <View style={[styles.section, meiProgress.isAlert && styles.sectionAlert]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {meiProgress.isAlert ? '⚠️' : '📋'} Limite MEI 2026
          </Text>
          <Text style={styles.sectionValue}>
            {meiProgress.percent.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            {
              width: `${Math.min(meiProgress.percent, 100)}%`,
              backgroundColor: meiProgress.isAlert ? COLORS.warning : COLORS.success,
            }
          ]} />
        </View>
        <Text style={styles.progressLabel}>
          {formatCurrency(yearRevenue)} de {formatCurrency(MEI_ANNUAL_LIMIT)} faturados este ano
        </Text>
        {meiProgress.isAlert && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              Você está crescendo! Hora de conversar com um contador sobre a migração para ME. 🚀
            </Text>
          </View>
        )}
      </View>

      {/* Ações rápidas */}
      <Text style={styles.quickTitle}>Acesso rápido</Text>
      <View style={styles.quickRow}>
        {[
          { icon: 'add-circle', label: 'Registrar\natendimento', color: COLORS.primary },
          { icon: 'calculator', label: 'Calcular\npreço', color: COLORS.gold },
          { icon: 'grid', label: 'Gerar\ntabela', color: COLORS.primaryLight },
          { icon: 'trending-up', label: 'Simular\ncenário', color: COLORS.success },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.quickCard}>
            <View style={[styles.quickIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dica do dia */}
      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>💡 Dica do dia</Text>
        <Text style={styles.tipText}>
          Puxe a tela para baixo para atualizar seus dados. Registre cada atendimento logo após concluir para ver seu lucro em tempo real!
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  greeting: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary },
  date: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2, textTransform: 'capitalize' },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },

  // Cards do dia
  cardsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
  },
  cardBlue: { backgroundColor: COLORS.primary },
  cardGold: { backgroundColor: COLORS.goldLight },
  cardLabel: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  cardValue: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  cardSub: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cardValueDark: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  cardSubDark: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2 },

  // Seções
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
  sectionAlert: { borderWidth: 1.5, borderColor: COLORS.warning },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700 },
  sectionValue: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary },

  // Progress bar
  progressBar: {
    height: 8,
    backgroundColor: COLORS.gray100,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: FONT_SIZES.xs, color: COLORS.gray500 },

  // Alerta MEI
  alertBox: {
    backgroundColor: '#FFF8E7',
    borderRadius: 10,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  alertText: { fontSize: FONT_SIZES.xs, color: COLORS.gray700, lineHeight: 18 },

  // Ações rápidas
  quickTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.gray700,
    marginBottom: SPACING.sm,
  },
  quickRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.sm,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  quickLabel: { fontSize: 10, color: COLORS.gray700, textAlign: 'center', fontWeight: '600' },

  // Dica
  tipBox: {
    backgroundColor: COLORS.primaryLight + '10',
    borderRadius: 14,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tipTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  tipText: { fontSize: FONT_SIZES.xs, color: COLORS.gray700, lineHeight: 18 },
});
