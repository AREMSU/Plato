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
  <View style={[styles.tabItem, focused && styles.tabItemActive]}>
    <Text style={styles.tabIcon}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
      {label}
    </Text>
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 72,
    paddingBottom: 10,
    paddingTop: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,107,53,0.1)',
  },
  tabIcon: {
    fontSize: 16,
    textAlignVertical: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginLeft: 4,
    textAlignVertical: 'center',
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
});

export default AppNavigator;
