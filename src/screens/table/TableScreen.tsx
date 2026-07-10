import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { useAppStore } from '../../store';
import { formatCurrency } from '../../utils/pricing';

const SETTINGS_KEY = '@valorize/table_settings';

// ─── Temas completos (estilo, não só cor) ──────────────────
const THEMES = [
  { key: 'navy_gold', label: 'Premium Dourado', bg: '#101E36', accent: '#C9A84C', emoji: '💅' },
  { key: 'noir', label: 'Noite Elegante', bg: '#1A1A2E', accent: '#E8D49E', emoji: '✨' },
  { key: 'rose', label: 'Rosa Delicado', bg: '#FFF0F5', accent: '#D4628A', emoji: '🌸' },
  { key: 'burgundy', label: 'Vinho Luxo', bg: '#3D0C11', accent: '#E8B4B8', emoji: '🍷' },
  { key: 'emerald', label: 'Esmeralda', bg: '#0B2B26', accent: '#C9A84C', emoji: '💎' },
  { key: 'cream', label: 'Clean Minimalista', bg: '#F8F6F0', accent: '#8B7355', emoji: '🤍' },
];

// ─── Paleta de cores livres ────────────────────────────────
const BG_COLORS = [
  '#101E36', '#1A1A2E', '#0B2B26', '#3D0C11', '#2C1810', '#1F2937',
  '#FFF0F5', '#F8F6F0', '#FDF2F8', '#EFF6FF', '#F0FDF4', '#FFFBEB',
  '#4C1D95', '#831843', '#7C2D12', '#14532D', '#1E3A8A', '#000000',
];

const ACCENT_COLORS = [
  '#C9A84C', '#E8D49E', '#D4628A', '#E8B4B8', '#8B7355', '#B76E79',
  '#FFD700', '#C0C0C0', '#E5989B', '#9D4EDD', '#2A9D8F', '#E76F51',
  '#FFFFFF', '#F72585', '#4CC9F0', '#80ED99', '#FB8500', '#EF233C',
];

type PriceType = 'min_price' | 'perceived_price' | 'shielded_price';

const PRICE_OPTIONS: { key: PriceType; label: string; desc: string }[] = [
  { key: 'min_price', label: 'Preço Mínimo', desc: 'Sem prejuízo' },
  { key: 'perceived_price', label: 'Preço Percebido', desc: 'Com margem' },
  { key: 'shielded_price', label: 'Preço Blindado 2026', desc: 'Com impostos' },
];

// Texto escuro ou claro conforme o fundo
function textColorFor(bg: string): string {
  const hex = bg.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#2A2A35' : '#FFFFFF';
}

export default function TableScreen() {
  const { services, costConfig } = useAppStore();

  // Personalização
  const [salonName, setSalonName] = useState('Meu Salão');
  const [subtitle, setSubtitle] = useState('✨ Tabela de Preços ✨');
  const [footerText, setFooterText] = useState('📲 Agende pelo WhatsApp!');
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#101E36');
  const [accentColor, setAccentColor] = useState('#C9A84C');
  const [headerEmoji, setHeaderEmoji] = useState('💅');

  const [priceType, setPriceType] = useState<PriceType>('shielded_price');
  const [showCardFee, setShowCardFee] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const textColor = textColorFor(bgColor);
  const activeServices = services.filter(s => s.is_active);
  const displayServices = activeServices.filter(s => selectedServices.includes(s.id));

  // Carrega personalização salva
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((stored) => {
      if (stored) {
        try {
          const s = JSON.parse(stored);
          if (s.salonName) setSalonName(s.salonName);
          if (s.subtitle) setSubtitle(s.subtitle);
          if (s.footerText) setFooterText(s.footerText);
          if (s.headerImage) setHeaderImage(s.headerImage);
          if (s.bgColor) setBgColor(s.bgColor);
          if (s.accentColor) setAccentColor(s.accentColor);
          if (s.headerEmoji) setHeaderEmoji(s.headerEmoji);
        } catch {}
      }
      setSettingsLoaded(true);
    });
  }, []);

  // Seleciona todos os serviços ativos por padrão
  useEffect(() => {
    setSelectedServices(activeServices.map(s => s.id));
  }, [services]);

  // Salva personalização a cada mudança
  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      salonName, subtitle, footerText, headerImage, bgColor, accentColor, headerEmoji,
    }));
  }, [salonName, subtitle, footerText, headerImage, bgColor, accentColor, headerEmoji, settingsLoaded]);

  // Preço exibido: com taxa embutida quando o toggle está ligado
  function displayPrice(service: any): number {
    const base = service[priceType] as number;
    if (showCardFee && costConfig?.card_fee_percent) {
      return Math.ceil((base / (1 - costConfig.card_fee_percent / 100)) * 2) / 2;
    }
    return base;
  }

  function applyTheme(theme: typeof THEMES[0]) {
    setBgColor(theme.bg);
    setAccentColor(theme.accent);
    setHeaderEmoji(theme.emoji);
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setHeaderImage(result.assets[0].uri);
    }
  }

  function toggleService(id: string) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  async function handleShare() {
    try {
      const lines = [
        `${headerEmoji} ${salonName.toUpperCase()}`,
        subtitle,
        ``,
        ...displayServices.map(s =>
          `• ${s.name} .............. ${formatCurrency(displayPrice(s))}`
        ),
        ``,
        showCardFee ? `💳 Taxa de maquininha já inclusa nos preços` : '',
        footerText,
      ].filter(Boolean);
      await Share.share({ message: lines.join('\n'), title: `Tabela — ${salonName}` });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
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

      <View style={styles.header}>
        <Text style={styles.title}>Tabela Premium</Text>
        <Text style={styles.subtitle}>Personalize e compartilhe com suas clientes</Text>
      </View>

      {/* ═══ PREVIEW DO CARTÃO ═══ */}
      <View style={[styles.tablePreview, { backgroundColor: bgColor }]}>
        <View style={[styles.tableAccentBar, { backgroundColor: accentColor }]} />

        <View style={styles.tableHeader}>
          <TouchableOpacity onPress={handlePickImage} style={styles.tableImageWrapper}>
            {headerImage ? (
              <Image source={{ uri: headerImage }} style={styles.tableHeaderImage} />
            ) : (
              <View style={[styles.tableImagePlaceholder, { borderColor: accentColor }]}>
                <Text style={{ fontSize: 32 }}>{headerEmoji}</Text>
                <View style={[styles.tableImageEditBadge, { backgroundColor: accentColor }]}>
                  <Ionicons name="camera" size={12} color={bgColor} />
                </View>
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            style={[styles.tableSalonNameInput, { color: accentColor }]}
            value={salonName}
            onChangeText={setSalonName}
            placeholder="Nome do salão"
            placeholderTextColor={accentColor + '80'}
            textAlign="center"
          />
          <TextInput
            style={[styles.tableSubtitleInput, { color: textColor + 'CC' }]}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="Subtítulo"
            placeholderTextColor={textColor + '60'}
            textAlign="center"
          />
        </View>

        <View style={[styles.tableDivider, { backgroundColor: accentColor }]} />

        {displayServices.length === 0 ? (
          <Text style={[styles.tableEmpty, { color: textColor + '80' }]}>
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
                  borderBottomColor: accentColor + '40',
                }
              ]}
            >
              <Text style={[styles.tableServiceName, { color: textColor }]}>
                {service.name}
              </Text>
              <Text style={[styles.tableServicePrice, { color: accentColor }]}>
                {formatCurrency(displayPrice(service))}
              </Text>
            </View>
          ))
        )}

        <View style={[styles.tableDivider, { backgroundColor: accentColor }]} />

        <View style={styles.tableFooter}>
          {showCardFee && (
            <Text style={[styles.tableFooterText, { color: textColor + 'AA' }]}>
              💳 Taxa de maquininha inclusa
            </Text>
          )}
          <TextInput
            style={[styles.tableFooterInput, { color: textColor + 'AA' }]}
            value={footerText}
            onChangeText={setFooterText}
            placeholder="Texto do rodapé"
            placeholderTextColor={textColor + '50'}
            textAlign="center"
          />
        </View>

        <View style={[styles.tableAccentBar, { backgroundColor: accentColor }]} />
      </View>

      <Text style={styles.editHint}>
        ✏️ Toque nos textos e na imagem do cartão acima para editar
      </Text>

      {/* ═══ TEMAS ═══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Temas prontos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.key}
              style={[
                styles.themeCard,
                { backgroundColor: theme.bg },
                bgColor === theme.bg && accentColor === theme.accent && styles.themeCardActive,
              ]}
              onPress={() => applyTheme(theme)}
            >
              <Text style={{ fontSize: 20 }}>{theme.emoji}</Text>
              <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>
                {theme.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ═══ CORES LIVRES ═══ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Cor de fundo</Text>
        <View style={styles.colorGrid}>
          {BG_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, bgColor === c && styles.colorSwatchActive]}
              onPress={() => setBgColor(c)}
            >
              {bgColor === c && (
                <Ionicons name="checkmark" size={16} color={textColorFor(c)} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>✨ Cor de destaque</Text>
        <View style={styles.colorGrid}>
          {ACCENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, accentColor === c && styles.colorSwatchActive]}
              onPress={() => setAccentColor(c)}
            >
              {accentColor === c && (
                <Ionicons name="checkmark" size={16} color={textColorFor(c)} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ═══ TIPO DE PREÇO ═══ */}
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

      {/* ═══ TAXA INCLUSA ═══ */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>💳 Embutir taxa de maquininha</Text>
            <Text style={styles.switchDesc}>
              {costConfig?.card_fee_percent
                ? `Recalcula os preços com a taxa de ${costConfig.card_fee_percent}% inclusa`
                : 'Configure a taxa em Configurações de Custos'}
            </Text>
          </View>
          <Switch
            value={showCardFee}
            onValueChange={setShowCardFee}
            trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
      </View>

      {/* ═══ SERVIÇOS ═══ */}
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
              {formatCurrency(displayPrice(service))}
            </Text>
            <Ionicons
              name={selectedServices.includes(service.id) ? 'checkbox' : 'square-outline'}
              size={22}
              color={selectedServices.includes(service.id) ? COLORS.primary : COLORS.gray300}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══ COMPARTILHAR ═══ */}
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

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
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
    marginBottom: SPACING.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  tableAccentBar: { height: 6 },
  tableHeader: { alignItems: 'center', paddingVertical: SPACING.lg, paddingHorizontal: SPACING.lg },

  tableImageWrapper: { marginBottom: SPACING.sm },
  tableHeaderImage: { width: 72, height: 72, borderRadius: 36 },
  tableImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tableImageEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tableSalonNameInput: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    letterSpacing: 2,
    minWidth: 200,
    padding: 0,
  },
  tableSubtitleInput: {
    fontSize: FONT_SIZES.sm,
    marginTop: 4,
    letterSpacing: 1,
    minWidth: 200,
    padding: 0,
  },

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
  tableFooterInput: { fontSize: FONT_SIZES.xs, letterSpacing: 0.5, minWidth: 200, padding: 0 },

  editHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },

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
  themeCard: {
    width: 90,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
    gap: 4,
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardActive: { borderColor: COLORS.gold },

  // Cores
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  colorSwatchActive: { borderWidth: 3, borderColor: COLORS.gold },

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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm },
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
