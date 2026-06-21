import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiCall from '../api/client';
import { validatePassword, getPasswordStrength } from '../utils/helpers';

const STEPS = {
  EMAIL: 1,   // Enter email → send OTP
  OTP: 2,     // Enter OTP → verify
  PASSWORD: 3, // Enter new password → done
};

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const pwValidation = useMemo(() => validatePassword(newPassword), [newPassword]);
  const pwStrength   = useMemo(() => getPasswordStrength(pwValidation.passed), [pwValidation.passed]);

  const handleOtpChange = (text, index) => {
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otp];
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      inputs.current[Math.min(digits.length - 1, 5)]?.focus();
      return;
    }
    const next = [...otp];
    next[index] = text;
    setOtp(next);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0)
      inputs.current[index - 1]?.focus();
  };

  // Step 1 — send OTP to email
  const handleSendOtp = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await apiCall('/auth/forgot-password/', 'POST', { email: email.trim().toLowerCase() });
      setStep(STEPS.OTP);
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify OTP
  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert('Incomplete OTP', 'Please enter the full 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await apiCall('/auth/verify-reset-otp/', 'POST', {
        email: email.trim().toLowerCase(),
        code,
      });
      setStep(STEPS.PASSWORD);
    } catch (e) {
      Alert.alert('Invalid OTP', e.message || 'Incorrect or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — set new password
  const handleResetPassword = async () => {
    const { isValid } = validatePassword(newPassword);
    if (!isValid) {
      Alert.alert('Weak Password', 'Please meet all the password requirements below.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiCall('/auth/reset-password/', 'POST', {
        email: email.trim().toLowerCase(),
        code: otp.join(''),
        new_password: newPassword,
      });
      Alert.alert('Done!', 'Your password has been reset. Please log in.', [
        { text: 'Log In', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = {
    [STEPS.EMAIL]: { title: 'Forgot Password', sub: 'Enter your registered email address' },
    [STEPS.OTP]: { title: 'Check Your Email', sub: `We sent a 6-digit code to ${email}` },
    [STEPS.PASSWORD]: { title: 'Set New Password', sub: 'OTP verified — choose a strong password' },
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Step indicator */}
          <View style={styles.stepsRow}>
            {[STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].map((s) => (
              <View key={s} style={styles.stepDotWrap}>
                <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                  {step > s
                    ? <Ionicons name="checkmark" size={12} color="#FF6B35" />
                    : <Text style={[styles.stepDotText, step === s && styles.stepDotTextActive]}>{s}</Text>
                  }
                </View>
                {s < STEPS.PASSWORD && (
                  <View style={[styles.stepLine, step > s && styles.stepLineActive]} />
                )}
              </View>
            ))}
          </View>

          <Text style={styles.headerTitle}>{stepTitles[step].title}</Text>
          <Text style={styles.headerSub}>{stepTitles[step].sub}</Text>
        </LinearGradient>

        <View style={styles.form}>

          {/* ── Step 1: Email ── */}
          {step === STEPS.EMAIL && (
            <>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={20} color="#757575" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#BDBDBD"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.btnGradient}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Send OTP →</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === STEPS.OTP && (
            <>
              <Text style={styles.label}>Enter 6-digit OTP</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => inputs.current[index] = ref}
                    style={[styles.otpBox, digit && styles.otpBoxFilled]}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, index)}
                    onKeyPress={e => handleOtpKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={6}
                    textAlign="center"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                  />
                ))}
              </View>

              <TouchableOpacity style={[styles.btn, { marginTop: 28 }]} onPress={handleVerifyOtp} disabled={loading}>
                <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.btnGradient}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Verify OTP →</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.resendText}>Didn't receive it? Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3: New Password ── */}
          {step === STEPS.PASSWORD && (
            <>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color="#757575" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="8–16 characters"
                  placeholderTextColor="#BDBDBD"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  maxLength={16}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9E9E9E" />
                </TouchableOpacity>
              </View>

              {/* Strength bar */}
              {newPassword.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <View style={styles.strengthBarBg}>
                    <View style={[styles.strengthBarFill, { width: pwStrength.width, backgroundColor: pwStrength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                  {pwValidation.results.map(r => (
                    <View key={r.id} style={styles.ruleRow}>
                      <Ionicons name={r.passed ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={r.passed ? '#4CAF50' : '#BDBDBD'} />
                      <Text style={[styles.ruleText, r.passed && styles.ruleTextPassed]}>{r.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { marginTop: 8 }]}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color="#757575" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Repeat new password"
                  placeholderTextColor="#BDBDBD"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  maxLength={16}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9E9E9E" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.btn, { marginTop: 24 }]} onPress={handleResetPassword} disabled={loading}>
                <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.btnGradient}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Reset Password ✓</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: 60, paddingBottom: 32, paddingHorizontal: 30,
    alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  backBtn: {
    position: 'absolute', top: 50, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepsRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8,
  },
  stepDotWrap: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#fff' },
  stepDotText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  stepDotTextActive: { color: '#FF6B35' },
  stepLine: { width: 32, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#fff' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6, textAlign: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: 20 },
  form: { paddingHorizontal: 28, paddingTop: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#424242', marginBottom: 10 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 13, backgroundColor: '#FAFAFA', marginBottom: 4,
  },
  input: { flex: 1, fontSize: 15, color: '#212121' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: {
    width: 46, height: 56, borderWidth: 2, borderColor: '#E0E0E0',
    borderRadius: 12, fontSize: 22, fontWeight: '800', color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  otpBoxFilled: { borderColor: '#FF6B35', backgroundColor: '#FFF3EE' },
  btn: { borderRadius: 16, overflow: 'hidden', elevation: 4 },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  resendBtn: { alignItems: 'center', marginTop: 18 },
  resendText: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  strengthBarBg: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginTop: 8, marginBottom: 4 },
  strengthBarFill: { height: 6, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ruleText: { fontSize: 12, color: '#BDBDBD' },
  ruleTextPassed: { color: '#4CAF50' },
});
