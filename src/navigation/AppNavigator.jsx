import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import AddMealScreen from '../screens/AddMealScreen';
import MyMealsScreen from '../screens/MyMealsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MealDetailScreen from '../screens/MealDetailScreen';
import BookingScreen from '../screens/BookingScreen';
import OTPScreen from '../screens/OTPScreen';
import CookProfileScreen from '../screens/CookProfileScreen';
import WalletScreen from '../screens/WalletScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ORANGE = '#FF6B35';
const GRAY = '#BDBDBD';

function AddTabIcon() {
  return (
    <View style={styles.addButton}>
      <Ionicons name="add" size={26} color="#fff" />
    </View>
  );
}

function TabIcon({ name, focused, label }) {
  const icons = {
    Home:    { active: 'home',           inactive: 'home-outline' },
    Explore: { active: 'compass',        inactive: 'compass-outline' },
    MyMeals: { active: 'receipt',        inactive: 'receipt-outline' },
    Profile: { active: 'person-circle',  inactive: 'person-circle-outline' },
  };

  if (name === 'Add') return <AddTabIcon />;

  const iconName = focused ? icons[name]?.active : icons[name]?.inactive;

  return (
    <View style={styles.tabIconWrap}>
      <Ionicons name={iconName || 'ellipse-outline'} size={24} color={focused ? ORANGE : GRAY} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = (Platform.OS === 'ios' ? 85 : 68) + insets.bottom;
  const tabBarPaddingBottom = (Platform.OS === 'ios' ? 24 : 10) + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ORANGE,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: [styles.tabBar, { height: tabBarHeight, paddingBottom: tabBarPaddingBottom }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarShowLabel: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ tabBarLabel: 'Explore' }}
      />
      <Tab.Screen
        name="Add"
        component={AddMealScreen}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="MyMeals"
        component={MyMealsScreen}
        options={{ tabBarLabel: 'Orders', unmountOnBlur: true }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile', unmountOnBlur: true }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn } = useApp();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="MealDetail" component={MealDetailScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
          <Stack.Screen name="CookProfile" component={CookProfileScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ORANGE,
    marginTop: 3,
  },
  addButton: {
    backgroundColor: ORANGE,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 14 : 18,
    elevation: 8,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
});
