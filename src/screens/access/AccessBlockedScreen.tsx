import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';
import { checkAccess, AccessReason } from '../../lib/access';

const CHECKOUT_MENSAL = 'https://checkout.ticto.app/O8D1F8A03';
const CHECKOUT_ANUAL = 'https://checkout.ticto.app/O63185AF2';

const MESSAGES: Record<AccessReason, { title: string; body: string }> = {
  no_subscription: {
    title: 'Seu teste grátis terminou',
    body: 'Você aproveitou os 7 dias gratuitos do Valorize. Para continuar calculando seus preços e acompanhando seu lucro, escolha um plano abaixo.',
  },
  canceled: {
    title: 'Sua assinatura foi cancelada',
    body: 'O acesso ao Valorize foi suspenso. Se foi engano ou você quer voltar, é só assinar de novo — nada foi perdido.',
  },
  past_due: {
    title: 'Não conseguimos confirmar seu pagamento',
    body: 'Parece que a última cobrança não passou. Verifique seus dados de pagamento ou renove sua assinatura abaixo.',
  },
  active: { title: '', body: '' },
  trial: { title: '', body: '' },
  grace: { title: '', body: '' },
  admin: { title: '', body: '' },
};

interface Props {
  reason: AccessReason;
  onAccessGranted: () => void;
}

export default function AccessBlockedScreen({ reason, onAccessGranted }: Props) {
  const [checking, setChecking] = useState(false);
  const msg = MESSAGES[reason] || MESSAGES.no_subscription;

  async function handleRecheck() {
    setChecking(true);
    const result = await checkAccess();
    setChecking(false);
    if (result.allowed) {
      onAccessGranted();
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />

      <Text style={styles.title}>{msg.title}</Text>
      <Text style={styles.body}>{msg.body}</Text>

      <View style={styles.safetyBox}>
        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.success} />
        <Text style={styles.safetyText}>
          Fica tranquila: seus clientes, serviços e histórico continuam salvos. Nada foi perdido — é só reativar.
        </Text>
      </View>

      <TouchableOpacity style={styles.planBtn} onPress={() => Linking.openURL(CHECKOUT_ANUAL)}>
        <View>
          <Text style={styles.planBtnTitle}>Plano Anual — R$197/ano</Text>
          <Text style={styles.planBtnSub}>Equivale a ~R$16/mês · mais vantajoso</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.planBtnOutline} onPress={() => Linking.openURL(CHECKOUT_MENSAL)}>
        <Text style={styles.planBtnOutlineText}>Plano Mensal — R$29,90/mês</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.recheckBtn} onPress={handleRecheck} disabled={checking}>
        {checking ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <Text style={styles.recheckText}>Já assinei, verificar novamente</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    paddingTop: 80,
    alignItems: 'center',
  },
  logo: { width: 64, height: 64, marginBottom: SPACING.lg, borderRadius: 14 },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.sm },
  body: { fontSize: FONT_SIZES.sm, color: COLORS.gray700, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },

  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  safetyText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.gray700, lineHeight: 18 },

  planBtn: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  planBtnTitle: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.white },
  planBtnSub: { fontSize: FONT_SIZES.xs, color: COLORS.goldLight, marginTop: 2 },

  planBtnOutline: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: SPACING.xl,
  },
  planBtnOutlineText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary },

  recheckBtn: { paddingVertical: SPACING.sm, marginBottom: SPACING.md },
  recheckText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '700' },

  logoutBtn: { paddingVertical: SPACING.sm },
  logoutText: { fontSize: FONT_SIZES.xs, color: COLORS.gray500 },
});
