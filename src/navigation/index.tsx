import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../constants';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { useLoadUserData } from '../hooks/useLoadUserData';

import HomeScreen from '../screens/home/HomeScreen';
import CalculatorScreen from '../screens/calculator/CalculatorScreen';
import RegisterScreen from '../screens/register/RegisterScreen';
import TableScreen from '../screens/table/TableScreen';
import SimulatorScreen from '../screens/simulator/SimulatorScreen';
import ClientsScreen from '../screens/clients/ClientsScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import CostSettingsScreen from '../screens/settings/CostSettingsScreen';
import AccountMenuScreen from '../screens/account/AccountMenuScreen';
import PaymentHistoryScreen from '../screens/account/PaymentHistoryScreen';
import UsageHistoryScreen from '../screens/account/UsageHistoryScreen';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  CostSettings: undefined;
  AccountMenu: undefined;
  PaymentHistory: undefined;
  UsageHistory: { filter?: 'today' | 'month' } | undefined;
  Clients: undefined;
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

// Verificação única e completa: considera "onboarding completo" se o perfil
// diz que sim OU se já existe um registro de custos salvo — usada em TODOS
// os pontos de entrada (carregamento inicial e mudanças de login), para
// nunca haver contradição entre eles.
async function checkOnboardingComplete(userId: string): Promise<boolean> {
  const [profileResult, configResult] = await Promise.allSettled([
    supabase
      .from('profiles')
      .select('has_completed_onboarding')
      .eq('id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('cost_configs')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1),
  ]);

  const profileData =
    profileResult.status === 'fulfilled' ? profileResult.value.data?.[0] : null;
  const configData =
    configResult.status === 'fulfilled' ? configResult.value.data?.[0] : null;

  return Boolean(profileData?.has_completed_onboarding || configData);
}

export default function Navigation() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasOnboarding, setHasOnboarding] = useState(false);
  const { costConfig } = useAppStore();
  useLoadUserData();

  useEffect(() => {
    // Timeout de segurança: nunca deixa o app preso no carregamento
    const safetyTimer = setTimeout(() => setLoading(false), 8000);

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          const complete = await checkOnboardingComplete(session.user.id);
          setHasOnboarding(complete);
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    }
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        try {
          const complete = await checkOnboardingComplete(session.user.id);
          // Só atualiza para true, ou define conforme o resultado real —
          // nunca força false por erro transitório (feito dentro de checkOnboardingComplete
          // via Promise.allSettled, que não lança exceção).
          setHasOnboarding(complete);
        } catch {
          // Não força onboarding em caso de erro transitório
        }
      } else {
        setIsAuthenticated(false);
        setHasOnboarding(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Quando costConfig é salvo nesta sessão, onboarding está completo
  useEffect(() => {
    if (costConfig) setHasOnboarding(true);
  }, [costConfig]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator color={COLORS.white} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : !hasOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CostSettings" component={CostSettingsScreen} />
            <Stack.Screen name="AccountMenu" component={AccountMenuScreen} />
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
            <Stack.Screen name="UsageHistory" component={UsageHistoryScreen} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
