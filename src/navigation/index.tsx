import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

// Screens (placeholders — serão implementadas individualmente)
import HomeScreen from '../screens/home/HomeScreen';
import CalculatorScreen from '../screens/calculator/CalculatorScreen';
import RegisterScreen from '../screens/register/RegisterScreen';
import TableScreen from '../screens/table/TableScreen';
import SimulatorScreen from '../screens/simulator/SimulatorScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
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

export default function Navigation() {
  // TODO: checar sessão Supabase para decidir rota inicial
  const isAuthenticated = false;
  const hasCompletedOnboarding = false;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
