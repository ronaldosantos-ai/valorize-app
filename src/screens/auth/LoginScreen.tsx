import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    if (mode === 'register' && !name) {
      Alert.alert('Atenção', 'Informe seu nome.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        Alert.alert('Cadastro realizado!', 'Verifique seu e-mail para confirmar a conta.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>💅</Text>
          </View>
          <Text style={styles.logoText}>Valorize</Text>
          <Text style={styles.tagline}>Saiba exatamente quanto cobrar{'\n'}para ter o lucro que você merece.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                Entrar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'register' && styles.toggleActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campos */}
          {mode === 'register' && (
            <View style={styles.field}>
              <Text style={styles.label}>Seu nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Ana Paula"
                placeholderTextColor={COLORS.gray300}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={COLORS.gray300}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.gray300}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Botão principal */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>
                {mode === 'login' ? 'Entrar' : 'Criar minha conta'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Esqueci a senha */}
          {mode === 'login' && (
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Rodapé */}
        <Text style={styles.footer}>
          Teste grátis por 3 dias. Sem cartão de crédito.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.primary },

  container: {
    flexGrow: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  // Header
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  logoIcon: { fontSize: 36 },
  logoText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleActive: { backgroundColor: COLORS.white, elevation: 2 },
  toggleText: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, fontWeight: '600' },
  toggleTextActive: { color: COLORS.primary },

  // Campos
  field: { marginBottom: SPACING.md },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.black,
    backgroundColor: COLORS.offWhite,
  },

  // Botão
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '700' },

  // Esqueci
  forgotBtn: { alignItems: 'center', marginTop: SPACING.md },
  forgotText: { fontSize: FONT_SIZES.sm, color: COLORS.gray500 },

  // Rodapé
  footer: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
