import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarLabel: 'Dashboard',
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Users"
      component={UsersScreen}
      options={{
        tabBarLabel: 'Users',
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Meals"
      component={MealsScreen}
      options={{
        tabBarLabel: 'Meals',
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={22} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Bookings"
      component={BookingsScreen}
      options={{
        tabBarLabel: 'Bookings',
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Subs"
      component={SubscriptionsScreen}
      options={{
        tabBarLabel: 'Subs',
        tabBarIcon: ({ focused, color }) => (
          <Ionicons name={focused ? 'ribbon' : 'ribbon-outline'} size={22} color={color} />
        ),
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
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
});

export default AppNavigator;
