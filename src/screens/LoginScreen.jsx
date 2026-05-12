import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

export default function LoginScreen({ navigation }) {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Min 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      const result = login(email.trim(), password);
      setLoading(false);
      if (!result.success) {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    }, 1000);
  };

  const fillDemo = () => {
    setEmail('aarnav@student.edu');
    setPassword('123456');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🍽️</Text>
            <Text style={styles.logoText}>Plato</Text>
          </View>
          <Text style={styles.headerSubtitle}>Welcome back, student!</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSubtitle}>Log in to continue sharing meals</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="your@student.edu"
                placeholderTextColor="#BDBDBD"
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: null }); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#BDBDBD"
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: null }); }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity onPress={handleLogin} style={styles.loginButton} disabled={loading}>
            <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.loginGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Sign In</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={fillDemo} style={styles.demoButton}>
            <Text style={styles.demoText}>🧪 Use Demo Account</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: 70, paddingBottom: 50, paddingHorizontal: 30,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logoEmoji: { fontSize: 36, marginRight: 10 },
  logoText: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  formContainer: { flex: 1, paddingHorizontal: 28, paddingTop: 36, paddingBottom: 30 },
  formTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  formSubtitle: { fontSize: 14, color: '#9E9E9E', marginBottom: 28 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#424242', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#FF5252' },
  inputIcon: { fontSize: 18, marginRight: 10 },
  eyeIcon: { fontSize: 18 },
  input: { flex: 1, fontSize: 15, color: '#212121', fontWeight: '500' },
  errorText: { fontSize: 12, color: '#FF5252', marginTop: 5, marginLeft: 4 },
  loginButton: { borderRadius: 16, overflow: 'hidden', marginTop: 8, elevation: 4 },
  loginGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  loginText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  demoButton: {
    marginTop: 14, alignItems: 'center', paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#FF6B35', borderStyle: 'dashed',
  },
  demoText: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 14, color: '#9E9E9E', fontSize: 13, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { fontSize: 15, color: '#757575' },
  registerLink: { fontSize: 15, color: '#FF6B35', fontWeight: '700' },
});
