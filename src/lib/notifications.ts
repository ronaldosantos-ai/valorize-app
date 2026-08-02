import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DAS_MEI_NOTIFICATION_ID = 'das-mei-reminder';

// Pede permissão e registra o token de push da usuária no Supabase.
// Chamar isso uma vez, logo após o login.
export async function registerForPushNotifications(userId: string) {
  try {
    if (!Device.isDevice) return; // emuladores não recebem push

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A84C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = 'f65ff930-f63b-4dfa-9aee-eade7e424f06';
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenResponse.data;

    await supabase.from('profiles').update({ push_token: pushToken }).eq('id', userId);
  } catch (err) {
    console.log('Erro ao registrar push notification:', err);
  }
}

// Agenda (ou reagenda) o lembrete mensal do DAS MEI, todo dia 18 às 9h
// (vencimento é dia 20 — dá 2 dias de margem).
export async function scheduleDasMeiReminder() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const alreadyScheduled = scheduled.some((n) => n.identifier === DAS_MEI_NOTIFICATION_ID);
    if (alreadyScheduled) return;

    await Notifications.scheduleNotificationAsync({
      identifier: DAS_MEI_NOTIFICATION_ID,
      content: {
        title: '💰 Seu DAS MEI vence em 2 dias',
        body: 'O vencimento é dia 20. Já separou o valor? Evite juros e mantenha seu CNPJ em dia.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: 18,
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });
  } catch (err) {
    console.log('Erro ao agendar lembrete do DAS MEI:', err);
  }
}
