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

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: COLORS.accent,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIconStyle: styles.tabIconWrap,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarLabel: 'Dashboard',
        tabBarIcon: ({ focused }) => <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📊</Text>,
      }}
    />
    <Tab.Screen
      name="Users"
      component={UsersScreen}
      options={{
        tabBarLabel: 'Users',
        tabBarIcon: ({ focused }) => <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>👥</Text>,
      }}
    />
    <Tab.Screen
      name="Meals"
      component={MealsScreen}
      options={{
        tabBarLabel: 'Meals',
        tabBarIcon: ({ focused }) => <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>🍛</Text>,
      }}
    />
    <Tab.Screen
      name="Bookings"
      component={BookingsScreen}
      options={{
        tabBarLabel: 'Bookings',
        tabBarIcon: ({ focused }) => <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📋</Text>,
      }}
    />
    <Tab.Screen
      name="Subs"
      component={SubscriptionsScreen}
      options={{
        tabBarLabel: 'Subs',
        tabBarIcon: ({ focused }) => <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>💎</Text>,
      }}
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 8,
  },
  tabIconWrap: {
    marginTop: 4,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
});

export default AppNavigator;
