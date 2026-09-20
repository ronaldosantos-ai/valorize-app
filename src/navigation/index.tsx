import { Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../constants';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications, scheduleDasMeiReminder } from '../lib/notifications';
import { checkAccess, AccessResult } from '../lib/access';
import AccessBlockedScreen from '../screens/access/AccessBlockedScreen';
import * as Notifications from 'expo-notifications';

export const navigationRef = createNavigationContainerRef();
import { useLoadUserData } from '../hooks/useLoadUserData';

import HomeScreen from '../screens/home/HomeScreen';
import CalculatorScreen from '../screens/calculator/CalculatorScreen';
import RegisterScreen from '../screens/register/RegisterScreen';
import TableScreen from '../screens/table/TableScreen';
import SimulatorScreen from '../screens/simulator/SimulatorScreen';
import ClientsScreen from '../screens/clients/ClientsScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import CostSettingsScreen from '../screens/settings/CostSettingsScreen';
import AccountMenuScreen from '../screens/account/AccountMenuScreen';
import PaymentHistoryScreen from '../screens/account/PaymentHistoryScreen';
import UsageHistoryScreen from '../screens/account/UsageHistoryScreen';
import SupportChatScreen from '../screens/support/SupportChatScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  CostSettings: undefined;
  AccountMenu: undefined;
  PaymentHistory: undefined;
  UsageHistory: { filter?: 'today' | 'month' } | undefined;
  Clients: undefined;
  SupportChat: undefined;
};

export type TabParamList = {
  Home: undefined;
  Calculator: undefined;
  Register: undefined;
  Table: undefined;
  Simulator: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.gray100,
          paddingBottom: 8,
          height: 64,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home-outline',
            Calculator: 'calculator-outline',
            Register: 'add-circle-outline',
            Table: 'grid-outline',
            Simulator: 'trending-up-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Calculator" component={CalculatorScreen} options={{ title: 'Preços' }} />
      <Tab.Screen name="Register" component={RegisterScreen} options={{ title: 'Registrar' }} />
      <Tab.Screen name="Table" component={TableScreen} options={{ title: 'Tabela' }} />
      <Tab.Screen name="Simulator" component={SimulatorScreen} options={{ title: 'Simular' }} />
    </Tab.Navigator>
  );
}

// A entrada no app depende SOMENTE do login. A configuração de custos
// (antes um "onboarding" obrigatório que travava a entrada) agora é só
// um lembrete forte na tela de Início — a usuária sempre acessa o app
// normalmente, mesmo sem ter configurado nada ainda.
export default function Navigation() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [access, setAccess] = useState<AccessResult | null>(null);
  useLoadUserData();

  useEffect(() => {
    // Timeout de segurança: nunca deixa o app preso no carregamento
    const safetyTimer = setTimeout(() => setLoading(false), 8000);

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(Boolean(session?.user));
        if (session?.user) {
          registerForPushNotifications(session.user.id);
          scheduleDasMeiReminder();
          checkAccess().then(setAccess);
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    }
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
      if (session?.user) {
        registerForPushNotifications(session.user.id);
        scheduleDasMeiReminder();
        checkAccess().then(setAccess);
      } else {
        setAccess(null);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'support_reply' && navigationRef.isReady()) {
        navigationRef.navigate('SupportChat' as never);
      }
    });
    return () => responseListener.remove();
  }, []);

  if (loading || (isAuthenticated && access === null)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator color={COLORS.white} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : access && !access.allowed ? (
          <Stack.Screen name="Main">
            {() => <AccessBlockedScreen reason={access.reason} onAccessGranted={() => setAccess({ allowed: true, reason: 'active' })} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CostSettings" component={CostSettingsScreen} />
            <Stack.Screen name="AccountMenu" component={AccountMenuScreen} />
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
            <Stack.Screen name="UsageHistory" component={UsageHistoryScreen} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            <Stack.Screen name="SupportChat" component={SupportChatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
