import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';

const AVATAR_KEY = '@valorize/avatar';

export default function AccountMenuScreen() {
  const navigation = useNavigation<any>();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const stored = await AsyncStorage.getItem(AVATAR_KEY);
    if (stored) setAvatarUri(stored);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      if (profile?.name) setName(profile.name);

      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('sender', 'admin')
        .is('read_at', null);
      setUnreadCount(count || 0);
    }
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher sua imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await AsyncStorage.setItem(AVATAR_KEY, uri);
    }
  }

  async function handleSaveName() {
    if (!newName.trim()) return;
    const emailChanged = newEmail.trim() && newEmail.trim() !== email;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticada.');

      const { error } = await supabase
        .from('profiles')
        .update({ name: newName.trim() })
        .eq('id', user.id);
      if (error) throw error;
      setName(newName.trim());

      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({ email: newEmail.trim() });
        if (emailError) throw emailError;
        Alert.alert(
          '📧 Confirme seu novo e-mail',
          `Enviamos um link de confirmação para ${newEmail.trim()}. Seu e-mail de login só muda depois que você clicar nesse link.`
        );
      }

      setEditingName(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  const menuItems = [
    {
      icon: 'person-outline' as const,
      title: 'Dados pessoais',
      desc: 'Nome e e-mail de login',
      onPress: () => {
        setNewName(name);
        setNewEmail(email);
        setEditingName(true);
      },
    },
    {
      icon: 'people-outline' as const,
      title: 'Minhas clientes',
      desc: 'Contatos, aniversários e fidelidade',
      onPress: () => navigation.navigate('Clients'),
    },
    {
      icon: 'settings-outline' as const,
      title: 'Configurações de custos',
      desc: 'Aluguel, salário, impostos e taxas',
      onPress: () => navigation.navigate('CostSettings'),
    },
    {
      icon: 'time-outline' as const,
      title: 'Histórico de uso',
      desc: 'Todos os atendimentos registrados',
      onPress: () => navigation.navigate('UsageHistory'),
    },
    {
      icon: 'card-outline' as const,
      title: 'Histórico de pagamentos',
      desc: 'Assinatura e cobranças do app',
      onPress: () => navigation.navigate('PaymentHistory'),
    },
    {
      icon: 'chatbubbles-outline' as const,
      title: 'Fale com a gente',
      desc: unreadCount > 0 ? `Você tem ${unreadCount} resposta${unreadCount > 1 ? 's' : ''} nova${unreadCount > 1 ? 's' : ''}` : 'Dúvidas, sugestões ou problemas',
      badge: unreadCount > 0 ? unreadCount : undefined,
      onPress: () => navigation.navigate('SupportChat'),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header com voltar */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Conta</Text>
      </View>

      {/* Avatar + dados */}
      <View style={styles.profileCard}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={COLORS.gold} />
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={14} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{name || 'Profissional'}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
        <Text style={styles.avatarHint}>Toque na foto para alterar</Text>
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.menuItem, i > 0 && styles.menuItemBorder]}
            onPress={item.onPress}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={22} color={COLORS.gold} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            {item.badge ? (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{item.badge}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sair */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      {/* Modal edição de dados pessoais */}
      <Modal visible={editingName} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Dados pessoais</Text>

            <Text style={styles.modalFieldLabel}>Nome</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Seu nome"
              placeholderTextColor={COLORS.gray300}
              autoFocus
            />

            <Text style={styles.modalFieldLabel}>E-mail</Text>
            <TextInput
              style={styles.modalInput}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="seu@email.com"
              placeholderTextColor={COLORS.gray300}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.modalHint}>
              💡 Ao mudar o e-mail, você recebe um link de confirmação — o login só muda depois de confirmar.
            </Text>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingName(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveName}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <Text style={styles.modalSaveText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary },

  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  avatarWrapper: { position: 'relative', marginBottom: SPACING.sm },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  profileName: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary },
  profileEmail: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, marginTop: 2 },
  emailNote: { fontSize: 11, color: COLORS.gray300, marginTop: 2, fontStyle: 'italic' },
  avatarHint: { fontSize: FONT_SIZES.xs, color: COLORS.gray300, marginTop: SPACING.xs },

  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  menuItemBorder: { borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.gray700 },
  menuDesc: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, marginTop: 2 },
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: SPACING.xs,
  },
  menuBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.danger + '40',
  },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: FONT_SIZES.sm },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    width: '100%',
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md },
  modalFieldLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.gray700, marginBottom: SPACING.xs },
  modalHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.black,
    backgroundColor: COLORS.offWhite,
    marginBottom: SPACING.md,
  },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm },
  modalCancelBtn: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  modalCancelText: { color: COLORS.gray500, fontWeight: '600' },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  modalSaveText: { color: COLORS.white, fontWeight: '700' },
});
