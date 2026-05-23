import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import { useAdmin } from '../context/AdminContext';
import { COLORS } from '../utils/helpers';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import UsersScreen from '../screens/UsersScreen';
import UserDetailScreen from '../screens/UserDetailScreen';
import MealsScreen from '../screens/MealsScreen';
import MealDetailScreen from '../screens/MealDetailScreen';
import BookingsScreen from '../screens/BookingsScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ icon, label, focused }) => (
  <View style={styles.tabItem}>
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
  </View>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📊" label="Dashboard" focused={focused} /> }}
    />
    <Tab.Screen
      name="Users"
      component={UsersScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👥" label="Users" focused={focused} /> }}
    />
    <Tab.Screen
      name="Meals"
      component={MealsScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🍛" label="Meals" focused={focused} /> }}
    />
    <Tab.Screen
      name="Bookings"
      component={BookingsScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Bookings" focused={focused} /> }}
    />
    <Tab.Screen
      name="Subs"
      component={SubscriptionsScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💎" label="Subs" focused={focused} /> }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { isLoggedIn } = useAdmin();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="UserDetail" component={UserDetailScreen} />
          <Stack.Screen name="MealDetail" component={MealDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0e0e16',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 20, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginTop: 3 },
  tabLabelActive: { color: COLORS.accent },
});

export default AppNavigator;
