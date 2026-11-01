import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';

type StatusInfo = { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string };

// Mostra o status REAL da assinatura (vem do webhook da Whop), e não um texto fixo.
function describeStatus(status: string | null, plan: string | null): StatusInfo {
  const planName = plan === 'annual' ? 'Plano Anual' : plan === 'monthly' ? 'Plano Mensal' : 'Seu plano';
  switch (status) {
    case 'active':
      return {
        icon: 'checkmark-circle-outline',
        title: 'Assinatura ativa',
        desc: `${planName}. Seu acesso ao Valorize está liberado.`,
      };
    case 'past_due':
      return {
        icon: 'alert-circle-outline',
        title: 'Pagamento pendente',
        desc: 'Não conseguimos confirmar a última cobrança. Atualize seus dados de pagamento na sua conta da Whop.',
      };
    case 'canceled':
      return {
        icon: 'close-circle-outline',
        title: 'Assinatura cancelada',
        desc: 'Seu acesso foi encerrado. Você pode assinar de novo quando quiser, seus dados continuam salvos.',
      };
    case 'refunded':
    case 'chargeback':
      return {
        icon: 'close-circle-outline',
        title: 'Assinatura encerrada',
        desc: 'O pagamento foi reembolsado ou contestado e o acesso foi encerrado.',
      };
    default:
      return {
        icon: 'information-circle-outline',
        title: 'Sem assinatura ativa',
        desc: 'Escolha um plano para liberar o acesso ao Valorize.',
      };
  }
}

export default function PaymentHistoryScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<StatusInfo>(describeStatus(null, null));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_plan')
          .eq('id', user.id)
          .single();
        if (!cancelled) {
          setInfo(describeStatus(profile?.subscription_status ?? null, profile?.subscription_plan ?? null));
        }
      } catch (err) {
        console.log('Erro ao carregar assinatura:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de Pagamentos</Text>
      </View>

      {/* Status atual */}
      <View style={styles.statusCard}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <>
            <View style={styles.statusIcon}>
              <Ionicons name={info.icon} size={28} color={COLORS.gold} />
            </View>
            <Text style={styles.statusTitle}>{info.title}</Text>
            <Text style={styles.statusDesc}>{info.desc}</Text>
          </>
        )}
      </View>

      {/* Lista vazia */}
      <View style={styles.emptyBox}>
        <Ionicons name="receipt-outline" size={48} color={COLORS.gray300} />
        <Text style={styles.emptyTitle}>Cobranças e recibos</Text>
        <Text style={styles.emptyDesc}>
          Para ver cobranças, trocar o cartão ou cancelar, entre na sua conta da Whop com o e-mail da compra.
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  headerRow: {
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
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, flex: 1 },

  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '50',
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statusTitle: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.primary },
  statusDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.gray500,
    marginTop: SPACING.sm,
  },
  emptyDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray300,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 260,
    lineHeight: 20,
  },
});
