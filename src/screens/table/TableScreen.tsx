import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { useAppStore } from '../../store';
import { formatCurrency } from '../../utils/pricing';
import { Service } from '../../types';

const THEMES = [
  { key: 'blue', label: 'Azul Premium', bg: '#1A4F8A', accent: '#C9A84C', text: '#FFFFFF' },
  { key: 'dark', label: 'Noite Elegante', bg: '#1A1A2E', accent: '#C9A84C', text: '#FFFFFF' },
  { key: 'rose', label: 'Rosa Delicado', bg: '#FFF0F5', accent: '#D4628A', text: '#3A1A2E' },
  { key: 'gold', label: 'Dourado Luxo', bg: '#2C1810', accent: '#C9A84C', text: '#F5E6C8' },
];

type PriceType = 'min_price' | 'perceived_price' | 'shielded_price';

const PRICE_OPTIONS: { key: PriceType; label: string; desc: string }[] = [
  { key: 'min_price', label: 'Preço Mínimo', desc: 'Sem prejuízo' },
  { key: 'perceived_price', label: 'Preço Percebido', desc: 'Com margem' },
  { key: 'shielded_price', label: 'Preço Blindado 2026', desc: 'Com impostos' },
];

export default function TableScreen() {
  const { services } = useAppStore();
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [priceType, setPriceType] = useState<PriceType>('shielded_price');
  const [salonName, setSalonNameState] = useState('Meu Salão');
  const [showCardFee, setShowCardFee] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    services.filter(s => s.is_active).map(s => s.id)
  );

  const activeServices = services.filter(s => s.is_active);
  const displayServices = activeServices.filter(s => selectedServices.includes(s.id));

  function toggleService(id: string) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  async function handleShare() {
    try {
      await Share.share({
        message: generateTextTable(),
        title: 'Tabela de Preços — ' + salonName,
      });
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  }

  function generateTextTable(): string {
    const lines = [
      `💅 ${salonName.toUpperCase()}`,
      `✨ TABELA DE PREÇOS ✨`,
      ``,
      ...displayServices.map(s =>
        `• ${s.name} .............. ${formatCurrency(s[priceType])}`
      ),
      ``,
      showCardFee ? `💳 Taxa de cartão já inclusa nos preços` : '',
      `📲 Agende pelo WhatsApp!`,
    ].filter(Boolean);
    return lines.join('\n');
  }

  if (activeServices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💅</Text>
        <Text style={styles.emptyTitle}>Nenhum serviço cadastrado</Text>
        <Text style={styles.emptyDesc}>
          Cadastre seus serviços na aba "Preços" para gerar sua tabela premium.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tabela Premium</Text>
        <Text style={styles.subtitle}>Gere seu card para Instagram e WhatsApp</Text>
      </View>

      {/* Preview da tabela */}
      <View style={[styles.tablePreview, { backgroundColor: selectedTheme.bg }]}>
        {/* Decoração topo */}
        <View style={[styles.tableAccentBar, { backgroundColor: selectedTheme.accent }]} />

        {/* Emoji e nome */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableEmoji}>💅</Text>
          <Text style={[styles.tableSalonName, { color: selectedTheme.accent }]}>
            {salonName}
          </Text>
          <Text style={[styles.tableSubtitle, { color: selectedTheme.text + 'CC' }]}>
            ✨ Tabela de Preços ✨
          </Text>
        </View>

        {/* Divisor */}
        <View style={[styles.tableDivider, { backgroundColor: selectedTheme.accent }]} />

        {/* Serviços */}
        {displayServices.length === 0 ? (
          <Text style={[styles.tableEmpty, { color: selectedTheme.text + '80' }]}>
            Selecione os serviços abaixo
          </Text>
        ) : (
          displayServices.map((service, index) => (
            <View
              key={service.id}
              style={[
                styles.tableRow,
                index < displayServices.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: selectedTheme.accent + '40',
                }
              ]}
            >
              <Text style={[styles.tableServiceName, { color: selectedTheme.text }]}>
                {service.name}
              </Text>
              <Text style={[styles.tableServicePrice, { color: selectedTheme.accent }]}>
                {formatCurrency(service[priceType])}
              </Text>
            </View>
          ))
        )}

        {/* Divisor */}
        <View style={[styles.tableDivider, { backgroundColor: selectedTheme.accent }]} />

        {/* Rodapé */}
        <View style={styles.tableFooter}>
          {showCardFee && (
            <Text style={[styles.tableFooterText, { color: selectedTheme.text + 'AA' }]}>
              💳 Taxa de cartão inclusa
            </Text>
          )}
          <Text style={[styles.tableFooterText, { color: selectedTheme.text + 'AA' }]}>
            📲 Agende pelo WhatsApp
          </Text>
        </View>

        {/* Decoração baixo */}
        <View style={[styles.tableAccentBar, { backgroundColor: selectedTheme.accent }]} />
      </View>

      {/* Configurações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Tema</Text>
        <View style={styles.themesRow}>
          {THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.key}
              style={[
                styles.themeChip,
                { backgroundColor: theme.bg },
                selectedTheme.key === theme.key && styles.themeChipActive,
              ]}
              onPress={() => setSelectedTheme(theme)}
            >
              <Text style={{ color: theme.text, fontSize: 10, fontWeight: '700' }}>
                {theme.label}
              </Text>
              {selectedTheme.key === theme.key && (
                <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Tipo de preço</Text>
        {PRICE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.priceOption, priceType === opt.key && styles.priceOptionActive]}
            onPress={() => setPriceType(opt.key)}
          >
            <View style={styles.priceOptionLeft}>
              <Text style={[styles.priceOptionLabel, priceType === opt.key && styles.priceOptionLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.priceOptionDesc}>{opt.desc}</Text>
            </View>
            {priceType === opt.key && (
              <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.sectionTitle}>💳 Mostrar "taxa inclusa"</Text>
            <Text style={styles.switchDesc}>Evita surpresas no pagamento</Text>
          </View>
          <Switch
            value={showCardFee}
            onValueChange={setShowCardFee}
            trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💅 Serviços na tabela</Text>
        {activeServices.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[styles.serviceToggle, selectedServices.includes(service.id) && styles.serviceToggleActive]}
            onPress={() => toggleService(service.id)}
          >
            <Text style={[styles.serviceToggleName, selectedServices.includes(service.id) && styles.serviceToggleNameActive]}>
              {service.name}
            </Text>
            <Text style={styles.serviceTogglePrice}>
              {formatCurrency(service[priceType])}
            </Text>
            <Ionicons
              name={selectedServices.includes(service.id) ? 'checkbox' : 'square-outline'}
              size={22}
              color={selectedServices.includes(service.id) ? COLORS.primary : COLORS.gray300}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Botão compartilhar */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Ionicons name="share-social-outline" size={22} color={COLORS.white} />
        <Text style={styles.shareBtnText}>Compartilhar tabela</Text>
      </TouchableOpacity>

      <Text style={styles.shareHint}>
        💡 Compartilhe direto no WhatsApp, Instagram ou salve como texto
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.sm },
  emptyDesc: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, textAlign: 'center', lineHeight: 22 },

  header: { paddingTop: SPACING.lg, marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, marginTop: 2 },

  // Preview
  tablePreview: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  tableAccentBar: { height: 6 },
  tableHeader: { alignItems: 'center', paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg },
  tableEmoji: { fontSize: 40, marginBottom: SPACING.xs },
  tableSalonName: { fontSize: FONT_SIZES.xl, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  tableSubtitle: { fontSize: FONT_SIZES.sm, marginTop: 4, letterSpacing: 1 },
  tableDivider: { height: 1, marginHorizontal: SPACING.lg, opacity: 0.6 },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  tableServiceName: { fontSize: FONT_SIZES.sm, fontWeight: '500', flex: 1 },
  tableServicePrice: { fontSize: FONT_SIZES.md, fontWeight: '800' },
  tableEmpty: { textAlign: 'center', padding: SPACING.lg, fontSize: FONT_SIZES.sm },
  tableFooter: { alignItems: 'center', paddingVertical: SPACING.md, gap: 4 },
  tableFooterText: { fontSize: FONT_SIZES.xs, letterSpacing: 0.5 },

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
  sectionTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700, marginBottom: SPACING.sm },

  // Temas
  themesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeChipActive: { borderColor: COLORS.gold },

  // Tipo de preço
  priceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.gray100,
    marginBottom: SPACING.xs,
  },
  priceOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  priceOptionLeft: { flex: 1 },
  priceOptionLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.gray700 },
  priceOptionLabelActive: { color: COLORS.primary },
  priceOptionDesc: { fontSize: FONT_SIZES.xs, color: COLORS.gray500 },

  // Switch
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchDesc: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2 },

  // Serviços
  serviceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.gray100,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  serviceToggleActive: { borderColor: COLORS.primary + '50', backgroundColor: COLORS.primary + '05' },
  serviceToggleName: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.gray500, fontWeight: '600' },
  serviceToggleNameActive: { color: COLORS.gray700 },
  serviceTogglePrice: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary },

  // Compartilhar
  shareBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  shareBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '800' },
  shareHint: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, textAlign: 'center' },
});
