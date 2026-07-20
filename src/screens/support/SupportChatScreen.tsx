import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  user_id: string;
  sender: 'user' | 'admin';
  content: string;
  read_at: string | null;
  created_at: string;
}

export default function SupportChatScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  async function loadMessages(uid: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
      // Marca como lidas as mensagens do admin que ainda não foram vistas
      const unread = data.filter((m) => m.sender === 'admin' && !m.read_at);
      if (unread.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unread.map((m) => m.id));
      }
    }
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      let channel: ReturnType<typeof supabase.channel> | null = null;

      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        await loadMessages(user.id);

        channel = supabase
          .channel(`messages:${user.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` },
            (payload) => {
              setMessages((prev) => [...prev, payload.new as Message]);
              if ((payload.new as Message).sender === 'admin') {
                supabase
                  .from('messages')
                  .update({ read_at: new Date().toISOString() })
                  .eq('id', (payload.new as Message).id)
                  .then(() => {});
              }
            }
          )
          .subscribe();
      })();

      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    }, [])
  );

  async function handleSend() {
    const content = draft.trim();
    if (!content || !userId || sending) return;
    setSending(true);
    setDraft('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: userId, sender: 'user', content })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data as Message];
      });
    }
    setSending(false);
  }

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fale com a gente</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={40} color={COLORS.gray300} />
              <Text style={styles.emptyText}>
                Mande sua dúvida, sugestão ou problema. Respondemos por aqui mesmo! 💬
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.sender === 'user' ? styles.bubbleUser : styles.bubbleAdmin,
              ]}
            >
              <Text style={item.sender === 'user' ? styles.bubbleTextUser : styles.bubbleTextAdmin}>
                {item.content}
              </Text>
              <Text style={item.sender === 'user' ? styles.bubbleTimeUser : styles.bubbleTimeAdmin}>
                {new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        />
      )}

      {/* Campo de envio */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escreva sua mensagem..."
          placeholderTextColor={COLORS.gray300}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
        >
          <Ionicons name="send" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  backBtn: { marginRight: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.primary },

  list: { padding: SPACING.lg, paddingBottom: SPACING.md, flexGrow: 1 },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: SPACING.sm },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, textAlign: 'center', paddingHorizontal: SPACING.xl },

  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  bubbleTextUser: { color: COLORS.white, fontSize: FONT_SIZES.sm },
  bubbleTextAdmin: { color: COLORS.gray700, fontSize: FONT_SIZES.sm },
  bubbleTimeUser: { color: COLORS.goldLight, fontSize: 10, marginTop: 4, textAlign: 'right' },
  bubbleTimeAdmin: { color: COLORS.gray300, fontSize: 10, marginTop: 4, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.black,
    backgroundColor: COLORS.offWhite,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.gray300 },
});
