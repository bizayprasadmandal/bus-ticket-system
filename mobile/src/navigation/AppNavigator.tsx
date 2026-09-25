import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { colors } from '../utils/theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TripResultsScreen from '../screens/TripResultsScreen';
import SeatSelectionScreen from '../screens/SeatSelectionScreen';
import BookingConfirmScreen from '../screens/BookingConfirmScreen';
import PaymentScreen from '../screens/PaymentScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import WalletScreen from '../screens/WalletScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="TripResults"
        component={TripResultsScreen}
        options={{ title: 'Available Trips', headerTintColor: colors.primary }}
      />
      <Stack.Screen
        name="SeatSelection"
        component={SeatSelectionScreen}
        options={{ title: 'Select Seats', headerTintColor: colors.primary }}
      />
      <Stack.Screen
        name="BookingConfirm"
        component={BookingConfirmScreen}
        options={{ title: 'Confirm Booking', headerTintColor: colors.primary }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: 'Payment', headerTintColor: colors.primary }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Bookings') iconName = focused ? 'ticket' : 'ticket-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Bookings" component={MyBookingsScreen} options={{ title: 'My Bookings' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// BookingDetail and Wallet live at the ROOT stack (above the tabs) so every
// screen — Home stack, Bookings tab, Profile tab — can navigate to them.
function RootStack({ authenticated }: { authenticated: boolean }) {
  if (!authenticated) return <AuthStack />;
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ title: 'Booking Details', headerTintColor: colors.primary }}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ title: 'Wallet', headerTintColor: colors.primary }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Single NavigationContainer lives in App.tsx — do not nest another here.
  return <RootStack authenticated={isAuthenticated} />;
}
