import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ORANGE = '#FF6B35';
const GRAY = '#9E9E9E';

function TabIcon({ name, focused }) {
  const icons = {
    Home: focused ? '🏠' : '🏡',
    Explore: focused ? '🔍' : '🔎',
    Add: '➕',
    MyMeals: focused ? '📋' : '📄',
    Profile: focused ? '👤' : '👥',
  };
  if (name === 'Add') {
    return (
      <View style={styles.addButton}>
        <Text style={styles.addButtonText}>＋</Text>
      </View>
    );
  }
  return <Text style={{ fontSize: 22 }}>{icons[name]}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ORANGE,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ tabBarLabel: 'Explore' }} />
      <Tab.Screen name="Add" component={AddMealScreen} options={{ tabBarLabel: '' }} />
      <Tab.Screen name="MyMeals" component={MyMealsScreen} options={{ tabBarLabel: 'My Meals' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
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
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="MealDetail" component={MealDetailScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingBottom: 8,
    paddingTop: 8,
    height: 65,
    elevation: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: ORANGE,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
  },
});
