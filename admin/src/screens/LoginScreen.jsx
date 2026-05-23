import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdmin } from '../context/AdminContext';
import { COLORS } from '../utils/helpers';

const LoginScreen = () => {
  const { login, loading } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    console.log('Attempting login for:', email.trim());
    const result = await login(email.trim(), password);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <LinearGradient colors={['#FFF8F5', '#FFEFE8', '#FFF3EB']} style={styles.container}>
      {/* Decorative glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.logo}>🍽️</Text>
          <Text style={styles.title}>Plato</Text>
          <Text style={styles.subtitle}>Admin Dashboard</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@plato.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: 'transparent', height: '100%' }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[COLORS.accent, '#e55a28']} style={styles.btnGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  glowTop: {
    position: 'absolute', top: -80, right: -80, width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(255,107,53,0.15)',
  },
  glowBottom: {
    position: 'absolute', bottom: -60, left: -60, width: 250, height: 250,
    borderRadius: 125, backgroundColor: 'rgba(255,140,66,0.1)',
  },
  card: {
    width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 36, borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: {
    fontSize: 28, fontWeight: '800', textAlign: 'center', color: COLORS.accent,
  },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 28 },
  errorBox: {
    backgroundColor: COLORS.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '500', textAlign: 'center' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, color: COLORS.text, fontSize: 15,
    height: 50,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    height: 50,
    overflow: 'hidden',
  },
  eyeBtn: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 16,
  },
  btn: { marginTop: 8, borderRadius: 10, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { padding: 16, alignItems: 'center', borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default LoginScreen;
