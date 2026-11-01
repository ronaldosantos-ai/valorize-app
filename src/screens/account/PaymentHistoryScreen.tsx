import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';

type SubProfile = {
  subscription_status: string | null;
  subscription_plan: string | null;
  cancel_at_period_end: boolean | null;
  access_until: string | null;
};

type StatusInfo = { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string };

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR');
}

// Mostra o status REAL da assinatura (vem do webhook da Whop), e não um texto fixo.
function describeStatus(p: SubProfile | null): StatusInfo {
  const status = p?.subscription_status ?? null;
  const planName =
    p?.subscription_plan === 'annual' ? 'Plano Anual' : p?.subscription_plan === 'monthly' ? 'Plano Mensal' : 'Seu plano';

  switch (status) {
    case 'active': {
      if (p?.cancel_at_period_end) {
        const until = formatDate(p.access_until);
        return {
          icon: 'time-outline',
          title: 'Cancelamento agendado',
          desc: until
            ? `Você continua com acesso até ${until}. Depois disso a assinatura não será renovada.`
            : 'Você continua com acesso até o fim do período já pago. Depois disso a assinatura não será renovada.',
        };
      }
      return {
        icon: 'checkmark-circle-outline',
        title: 'Assinatura ativa',
        desc: `${planName}. Seu acesso ao Valorize está liberado.`,
      };
    }
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
  const [cancelling, setCancelling] = useState(false);
  const [profile, setProfile] = useState<SubProfile | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan, cancel_at_period_end, access_until')
        .eq('id', user.id)
        .single();
      setProfile((data as SubProfile) ?? null);
    } catch (err) {
      console.log('Erro ao carregar assinatura:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function doCancel() {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      if (error || (data as any)?.error) throw error || new Error((data as any).error);
      await loadProfile();
      Alert.alert(
        'Cancelamento agendado',
        'Pronto! Você continua com acesso até o fim do período já pago e não será cobrada de novo.'
      );
    } catch (err) {
      console.log('Erro ao cancelar assinatura:', err);
      Alert.alert(
        'Não foi possível cancelar agora',
        'Tente de novo em alguns instantes. Se continuar, fale com o suporte pelo app.'
      );
    } finally {
      setCancelling(false);
    }
  }

  function confirmCancel() {
    Alert.alert(
      'Cancelar assinatura?',
      'Você continua com acesso até o fim do período já pago e não será cobrada de novo.',
      [
        { text: 'Manter assinatura', style: 'cancel' },
        { text: 'Cancelar assinatura', style: 'destructive', onPress: doCancel },
      ]
    );
  }

  const info = describeStatus(profile);
  const canCancel = profile?.subscription_status === 'active' && !profile?.cancel_at_period_end;

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

      {/* Cobranças e recibos ficam na Whop */}
      <View style={styles.emptyBox}>
        <Ionicons name="receipt-outline" size={48} color={COLORS.gray300} />
        <Text style={styles.emptyTitle}>Cobranças e recibos</Text>
        <Text style={styles.emptyDesc}>
          Para ver cobranças ou trocar o cartão, entre na sua conta da Whop com o e-mail da compra.
        </Text>
      </View>

      {/* Cancelar: discreto, mas sempre ao alcance */}
      {canCancel && (
        <TouchableOpacity style={styles.cancelLink} onPress={confirmCancel} disabled={cancelling}>
          {cancelling ? (
            <ActivityIndicator color={COLORS.gray500} size="small" />
          ) : (
            <Text style={styles.cancelLinkText}>Cancelar assinatura</Text>
          )}
        </TouchableOpacity>
      )}

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

  cancelLink: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.lg },
  cancelLinkText: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, textDecorationLine: 'underline' },
});
