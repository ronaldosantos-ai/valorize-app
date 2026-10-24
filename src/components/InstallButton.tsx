import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../constants';

// Botão "Instalar app" — só existe na versão web.
// Android (Chrome): instala com um toque, usando o evento beforeinstallprompt.
// iPhone (Safari): a Apple não permite instalar por botão, então mostramos o passo a passo.

type Mode = 'hidden' | 'android' | 'ios' | 'inapp';

function detectMode(): Mode {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'hidden';

  const nav: any = window.navigator;
  const ua: string = nav.userAgent || '';

  // Já instalado e aberto como app: não mostra nada.
  const standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    nav.standalone === true;
  if (standalone) return 'hidden';

  // Navegador interno do Instagram/Facebook/WhatsApp: instalação não funciona ali.
  if (/FBAN|FBAV|Instagram|WhatsApp/i.test(ua)) return 'inapp';

  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isIOS) return 'ios';

  return 'android'; // o botão só aparece quando o Chrome liberar a instalação
}

export default function InstallButton() {
  const [mode, setMode] = useState<Mode>('hidden');
  const [canInstall, setCanInstall] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const w: any = window;

    setMode(detectMode());
    setCanInstall(!!w.__pwaPrompt);

    // O evento pode disparar antes do app carregar (o script do index.html guarda em __pwaPrompt)
    // ou depois (escutamos aqui também).
    const onPrompt = (e: any) => {
      e.preventDefault();
      w.__pwaPrompt = e;
      setCanInstall(true);
    };
    const onInstalled = () => {
      w.__pwaPrompt = null;
      setCanInstall(false);
      setMode('hidden');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function installAndroid() {
    const w: any = window;
    const prompt = w.__pwaPrompt;
    if (!prompt) return;
    prompt.prompt();
    try {
      await prompt.userChoice;
    } catch {}
    w.__pwaPrompt = null;
    setCanInstall(false);
  }

  if (mode === 'hidden') return null;

  if (mode === 'inapp') {
    return (
      <View style={styles.note}>
        <Text style={styles.noteText}>
          Para instalar o app, abra este endereço no Chrome (Android) ou no Safari (iPhone).
        </Text>
      </View>
    );
  }

  if (mode === 'android') {
    if (!canInstall) return null;
    return (
      <TouchableOpacity style={styles.btn} onPress={installAndroid} activeOpacity={0.85}>
        <Text style={styles.btnText}>📲  Instalar app no celular</Text>
      </TouchableOpacity>
    );
  }

  // iOS
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => setShowSteps(!showSteps)}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>📲  Instalar app no iPhone</Text>
      </TouchableOpacity>
      {showSteps && (
        <View style={styles.steps}>
          <Text style={styles.stepsTitle}>É rapidinho, 3 passos no Safari:</Text>
          <Text style={styles.step}>1. Toque no botão Compartilhar (o quadrado com a seta para cima).</Text>
          <Text style={styles.step}>2. Role a lista e toque em "Adicionar à Tela de Início".</Text>
          <Text style={styles.step}>3. Toque em "Adicionar". O ícone aparece na sua tela.</Text>
          <Text style={styles.stepsHint}>Se não achar essa opção, abra este endereço no Safari.</Text>
        </View>
      )}
    </View>
  );
}

const GOLD = '#C9A84C';

const styles = StyleSheet.create({
  wrap: { width: '100%', marginTop: SPACING.lg },
  btn: {
    width: '100%',
    marginTop: SPACING.lg,
    backgroundColor: GOLD,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
  },
  btnText: { color: '#101E36', fontSize: FONT_SIZES.md, fontWeight: '800' },
  steps: {
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: SPACING.md,
  },
  stepsTitle: { color: COLORS.white, fontWeight: '700', marginBottom: SPACING.xs, fontSize: FONT_SIZES.sm },
  step: { color: 'rgba(255,255,255,0.9)', fontSize: FONT_SIZES.sm, lineHeight: 20, marginBottom: 4 },
  stepsHint: { color: 'rgba(255,255,255,0.65)', fontSize: FONT_SIZES.xs, marginTop: SPACING.xs },
  note: {
    width: '100%',
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: SPACING.md,
  },
  noteText: { color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZES.sm, textAlign: 'center', lineHeight: 20 },
});
