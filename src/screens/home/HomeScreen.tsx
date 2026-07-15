import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT_SIZES, MEI_ANNUAL_LIMIT } from '../../constants';
import { getTodayTip } from '../../constants/tips';
import { supabase } from '../../lib/supabase';
import { formatCurrency, calcMeiProgress, calcSalaryProgress } from '../../utils/pricing';
import { useAppStore } from '../../store';
import type { TabParamList } from '../../navigation';

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { costConfig, services } = useAppStore();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Recarrega o avatar sempre que a Home ganha foco (ex: após trocar a foto)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('@valorize/avatar').then(setAvatarUri);
    }, [])
  );
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [todayProfit, setTodayProfit] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [monthProfit, setMonthProfit] = useState(0);
  const [yearRevenue, setYearRevenue] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [isPersonalBest, setIsPersonalBest] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

      // Sequência de dias e recorde pessoal (últimos 60 dias)
      const sinceStr = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentData } = await supabase
        .from('appointments')
        .select('net_profit, attended_at')
        .eq('user_id', user.id)
        .gte('attended_at', sinceStr);

      if (recentData) {
        // Agrupa lucro por dia (YYYY-MM-DD)
        const profitByDay = new Map<string, number>();
        recentData.forEach((a) => {
          const day = a.attended_at.split('T')[0];
          profitByDay.set(day, (profitByDay.get(day) || 0) + a.net_profit);
        });

        // Sequência: conta dias consecutivos com atendimento, terminando hoje ou ontem
        let streak = 0;
        for (let i = 0; i < 60; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          if (profitByDay.has(key)) {
            streak++;
          } else if (i === 0) {
            continue; // hoje ainda pode não ter atendimento registrado
          } else {
            break;
          }
        }
        setStreakDays(streak);

        // Recorde pessoal: compara hoje com o melhor dia anterior
        const todayKey = todayStr;
        let bestPrevious = 0;
        profitByDay.forEach((value, key) => {
          if (key !== todayKey && value > bestPrevious) bestPrevious = value;
        });
        const todayTotal = profitByDay.get(todayKey) || 0;
        setIsPersonalBest(todayTotal > 0 && todayTotal > bestPrevious);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Pulso de destaque sempre que o lucro de hoje aumenta
  useEffect(() => {
    if (todayProfit > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 180, useNativeDriver: true }),
        Animated.spring(pulseAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }
  }, [todayProfit]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const desiredSalary = costConfig?.desired_salary || 3000;
  const workDays = costConfig?.work_days_per_month || 22;
  const dailyGoal = desiredSalary / workDays;
  const salaryProgress = calcSalaryProgress(monthProfit, desiredSalary);
  const meiProgress = calcMeiProgress(yearRevenue);
  const todayTip = getTodayTip();

  function getDailyMessage(): { text: string; emoji: string } {
    if (todayAppointments === 0) {
      return { text: 'Registre seu primeiro atendimento e veja a mágica acontecer!', emoji: '☀️' };
    }
    const percent = dailyGoal > 0 ? (todayProfit / dailyGoal) * 100 : 0;
    if (isPersonalBest) {
      return { text: 'Melhor dia até agora! Você está arrasando!', emoji: '🏆' };
    }
    if (percent >= 100) {
      return { text: 'Meta de hoje batida! Tudo que vier agora é lucro extra!', emoji: '🔥' };
    }
    if (percent >= 70) {
      return { text: 'Quase lá! Falta pouquinho para a meta de hoje.', emoji: '💪' };
    }
    if (percent >= 30) {
      return { text: 'Bom progresso! Continue registrando seus atendimentos.', emoji: '✨' };
    }
    return { text: 'Todo atendimento registrado é um passo mais perto da meta.', emoji: '🌱' };
  }
  const dailyMessage = getDailyMessage();

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
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => navigation.getParent()?.navigate('AccountMenu' as never)}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarPhoto} />
          ) : (
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.avatarLogo}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Checklist de configuração inicial — destaque forte, logo no topo */}
      {(!costConfig || services.length === 0) && (
        <View style={styles.setupBox}>
          <Text style={styles.setupTitle}>🚀 Falta pouco para começar!</Text>
          <Text style={styles.setupSubtitle}>Complete agora para usar o app com todo o potencial:</Text>
          {!costConfig && (
            <TouchableOpacity
              style={styles.setupItem}
              onPress={() => navigation.getParent()?.navigate('CostSettings' as never)}
            >
              <View style={styles.setupItemIcon}>
                <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.setupItemText}>
                <Text style={styles.setupItemTitle}>Configure seus custos</Text>
                <Text style={styles.setupItemDesc}>Aluguel, luz, salário desejado e impostos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primaryDark} />
            </TouchableOpacity>
          )}
          {services.length === 0 && (
            <TouchableOpacity
              style={styles.setupItem}
              onPress={() => navigation.navigate('Calculator')}
            >
              <View style={styles.setupItemIcon}>
                <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.setupItemText}>
                <Text style={styles.setupItemTitle}>Cadastre seu primeiro serviço</Text>
                <Text style={styles.setupItemDesc}>Descubra quanto cobrar com segurança</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primaryDark} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sequência de dias ativa */}
      {streakDays >= 2 && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>
            <Text style={styles.streakNumber}>{streakDays} dias</Text> seguidos registrando atendimentos!
          </Text>
        </View>
      )}

      {/* Cards do dia */}
      <View style={styles.cardsRow}>
        <TouchableOpacity
          style={[styles.card, styles.cardBlue]}
          onPress={() => navigation.getParent()?.navigate('UsageHistory' as never, { filter: 'today' } as never)}
          activeOpacity={0.85}
        >
          {isPersonalBest && (
            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>🏆 RECORDE</Text>
            </View>
          )}
          <Text style={styles.cardLabel}>Lucro hoje</Text>
          <Animated.Text style={[styles.cardValue, { transform: [{ scale: pulseAnim }] }]}>
            {formatCurrency(todayProfit)}
          </Animated.Text>
          <Text style={styles.cardSub}>{todayAppointments} atendimento{todayAppointments !== 1 ? 's' : ''} · toque para ver</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.card, styles.cardGold]}
          onPress={() => navigation.getParent()?.navigate('UsageHistory' as never, { filter: 'month' } as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.cardLabel}>Lucro no mês</Text>
          <Text style={styles.cardValueDark}>{formatCurrency(monthProfit)}</Text>
          <Text style={styles.cardSubDark}>acumulado · toque para ver</Text>
        </TouchableOpacity>
      </View>

      {/* Mensagem motivacional do dia */}
      <View style={styles.motivationBox}>
        <Text style={styles.motivationEmoji}>{dailyMessage.emoji}</Text>
        <Text style={styles.motivationText}>{dailyMessage.text}</Text>
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
          { icon: 'add-circle', label: 'Registrar\natendimento', color: COLORS.primary, screen: 'Register' as const },
          { icon: 'calculator', label: 'Calcular\npreço', color: COLORS.gold, screen: 'Calculator' as const },
          { icon: 'grid', label: 'Gerar\ntabela', color: COLORS.primaryLight, screen: 'Table' as const },
          { icon: 'trending-up', label: 'Simular\ncenário', color: COLORS.success, screen: 'Simulator' as const },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.quickCard}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.quickIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dica estratégica do dia — só aparece quando a configuração está completa */}
      {costConfig && services.length > 0 && (
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>{todayTip.emoji} {todayTip.title}</Text>
          <Text style={styles.tipText}>{todayTip.text}</Text>
        </View>
      )}

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
    borderRadius: 14,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLogo: { width: '80%', height: '80%', borderRadius: 8 },
  avatarPhoto: { width: '100%', height: '100%' },

  // Checklist de configuração
  setupBox: {
    backgroundColor: COLORS.gold,
    borderRadius: 18,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  setupTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  setupSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primaryDark,
    opacity: 0.85,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  setupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  setupItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupItemText: { flex: 1 },
  setupItemTitle: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.primaryDark },
  setupItemDesc: { fontSize: FONT_SIZES.xs, color: COLORS.primaryDark, opacity: 0.8, marginTop: 2 },

  // Cards do dia
  cardsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  cardBlue: { backgroundColor: COLORS.primary },
  cardGold: { backgroundColor: COLORS.goldLight },
  cardLabel: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  cardValue: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  cardSub: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cardValueDark: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  cardSubDark: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2 },

  // Sequência de dias (streak)
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FFB74D50',
  },
  streakEmoji: { fontSize: 18 },
  streakText: { fontSize: FONT_SIZES.xs, color: COLORS.gray700, flex: 1 },
  streakNumber: { fontWeight: '800', color: '#E65100' },

  // Badge de recorde pessoal
  bestBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bestBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.primaryDark },

  // Mensagem motivacional
  motivationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  motivationEmoji: { fontSize: 24 },
  motivationText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.gray700, fontWeight: '600', lineHeight: 20 },

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
