import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AdminProvider } from './src/context/AdminContext';
import AppNavigator from './src/navigation/AppNavigator';

const SplashView = () => (
  <LinearGradient colors={['#0a0a0f', '#1a1028', '#0f0a1a']} style={splashStyles.container}>
    <Text style={splashStyles.icon}>🍽️</Text>
    <Text style={splashStyles.title}>Plato</Text>
    <Text style={splashStyles.subtitle}>Admin Panel</Text>
  </LinearGradient>
);

const splashStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: '800', color: '#FF6B35' },
  subtitle: { fontSize: 16, color: '#8b8b9e', marginTop: 4 },
});

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <SplashView />;

  return (
    <AdminProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#0a0a0f" />
        <AppNavigator />
      </NavigationContainer>
    </AdminProvider>
  );
}
