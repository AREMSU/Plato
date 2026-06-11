import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import apiCall from '../api/client';
import { validatePassword, getPasswordStrength } from '../utils/helpers';

export default function RegisterScreen({ navigation }) {
  const {} = useApp();
  const [form, setForm] = useState({
    name: '', email: '', university: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordFocused, setPasswordFocused] = useState(false);

  const pwValidation = useMemo(() => validatePassword(form.password), [form.password]);
  const strength = useMemo(() => getPasswordStrength(pwValidation.passed), [pwValidation.passed]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';

    if (!form.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address (e.g. you@university.edu)';
    }

    if (!form.university.trim()) e.university = 'University / college is required';

    if (!form.password) {
      e.password = 'Password is required';
    } else {
      const { results } = validatePassword(form.password);
      const firstFail = results.find(r => !r.passed);
      if (firstFail) e.password = firstFail.label + ' required';
    }

    if (!form.confirmPassword) {
      e.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiCall('/auth/register/', 'POST', {
        first_name: form.name.trim(),
        email: form.email.trim(),
        university: form.university.trim(),
        password: form.password,
        confirm_password: form.confirmPassword,
      });
      navigation.navigate('OTP', {
        email: form.email.trim(),
        name: form.name.trim(),
      });
    } catch (error) {
      const msg = error?.message || '';
      // Route backend error to the right field
      if (
        msg.toLowerCase().includes('email') ||
        msg.toLowerCase().includes('disposable') ||
        msg.toLowerCase().includes('domain') ||
        msg.toLowerCase().includes('temporary')
      ) {
        setErrors((prev) => ({ ...prev, email: msg }));
      } else if (msg.toLowerCase().includes('password')) {
        setErrors((prev) => ({ ...prev, password: msg }));
      } else {
        Alert.alert('Registration Failed', msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join the Plato community</Text>
        </LinearGradient>

        <View style={styles.formContainer}>

          {/* ── Full Name ── */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color="#757575" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor="#BDBDBD"
                value={form.name}
                onChangeText={(t) => updateForm('name', t)}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            {errors.name ? <Text style={styles.errorText}>⚠ {errors.name}</Text> : null}
          </View>

          {/* ── Email ── */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color="#757575" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="your@student.edu"
                placeholderTextColor="#BDBDBD"
                value={form.email}
                onChangeText={(t) => updateForm('email', t)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>⚠ {errors.email}</Text> : null}
          </View>

          {/* ── University ── */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>University / College</Text>
            <View style={[styles.inputWrapper, errors.university && styles.inputError]}>
              <Ionicons name="school-outline" size={20} color="#757575" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Kathmandu University"
                placeholderTextColor="#BDBDBD"
                value={form.university}
                onChangeText={(t) => updateForm('university', t)}
                autoCorrect={false}
              />
            </View>
            {errors.university ? <Text style={styles.errorText}>⚠ {errors.university}</Text> : null}
          </View>

          {/* ── Password ── */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#757575" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Create a strong password"
                placeholderTextColor="#BDBDBD"
                value={form.password}
                onChangeText={(t) => updateForm('password', t)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={16}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#757575"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>⚠ {errors.password}</Text> : null}

            {/* Strength bar + rules */}
            {form.password.length > 0 && (
              <View style={styles.strengthContainer}>
                {/* Segmented bar */}
                <View style={styles.strengthBarRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        { backgroundColor: i <= pwValidation.passed ? strength.color : '#E0E0E0' },
                      ]}
                    />
                  ))}
                  {strength.label ? (
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                  ) : null}
                </View>

                {/* Rule checklist */}
                {(passwordFocused || form.password.length > 0) && (
                  <View style={styles.rulesContainer}>
                    {pwValidation.results.map((rule) => (
                      <View key={rule.id} style={styles.ruleRow}>
                        <Ionicons
                          name={rule.passed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={rule.passed ? '#4CAF50' : '#BDBDBD'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.ruleText, rule.passed && styles.ruleTextPassed]}>
                          {rule.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Confirm Password ── */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#757575" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Repeat your password"
                placeholderTextColor="#BDBDBD"
                value={form.confirmPassword}
                onChangeText={(t) => updateForm('confirmPassword', t)}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={16}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#757575"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>⚠ {errors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            style={styles.registerButton}
            disabled={loading}
          >
            <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.registerGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButton: { marginBottom: 16 },
  backButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif',
  },
  formContainer: { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#FF5252' },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
    marginTop: 5,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  // ── Strength meter ──
  strengthContainer: { marginTop: 10, paddingHorizontal: 2 },
  strengthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    width: 44,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  rulesContainer: { gap: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  ruleText: {
    fontSize: 12,
    color: '#BDBDBD',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  ruleTextPassed: { color: '#4CAF50' },
  // ── Bottom ──
  registerButton: { borderRadius: 16, overflow: 'hidden', elevation: 4, marginTop: 8 },
  registerGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  registerText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  loginText: {
    fontSize: 15,
    color: '#757575',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  loginLink: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
});
