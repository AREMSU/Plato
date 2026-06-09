import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';

// Suppress all yellow/red warning boxes in the app UI — errors only appear in terminal
LogBox.ignoreAllLogs(true);

// Deep link configuration — maps plato:// URLs to navigator routes
const linking = {
  prefixes: ['plato://'],
  config: {
    screens: {
      Main: {
        screens: {
          MyMeals: 'mymeals',
          Profile: 'profile',
          Home: 'home',
        },
      },
      Wallet: 'wallet',
    },
  },
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" backgroundColor="#FF6B35" />
          <AppNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}