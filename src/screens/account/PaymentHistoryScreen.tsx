import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';

export default function PaymentHistoryScreen() {
  const navigation = useNavigation<any>();

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
        <View style={styles.statusIcon}>
          <Ionicons name="gift-outline" size={28} color={COLORS.gold} />
        </View>
        <Text style={styles.statusTitle}>Período de teste gratuito</Text>
        <Text style={styles.statusDesc}>
          Você está aproveitando o teste grátis de 7 dias. Nenhuma cobrança foi realizada.
        </Text>
      </View>

      {/* Lista vazia */}
      <View style={styles.emptyBox}>
        <Ionicons name="receipt-outline" size={48} color={COLORS.gray300} />
        <Text style={styles.emptyTitle}>Nenhum pagamento ainda</Text>
        <Text style={styles.emptyDesc}>
          Quando você assinar um plano, todas as cobranças aparecerão aqui.
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
