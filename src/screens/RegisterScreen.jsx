import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useApp();
  const [form, setForm] = useState({ name: '', email: '', university: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateForm = (key, value) => {
    setForm({ ...form, [key]: value });
    if (errors[key]) setErrors({ ...errors, [key]: null });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email';
    if (!form.university.trim()) newErrors.university = 'University is required';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      register({ name: form.name.trim(), email: form.email.trim(), university: form.university.trim(), password: form.password });
      setLoading(false);
    }, 1000);
  };

  const fields = [
    { key: 'name', label: 'Full Name', icon: '👤', placeholder: 'Your full name' },
    { key: 'email', label: 'Email Address', icon: '✉️', placeholder: 'your@student.edu', keyboardType: 'email-address' },
    { key: 'university', label: 'University / College', icon: '🎓', placeholder: 'e.g. Kathmandu University' },
    { key: 'password', label: 'Password', icon: '🔒', placeholder: 'Create a password', secure: true },
    { key: 'confirmPassword', label: 'Confirm Password', icon: '🔒', placeholder: 'Repeat your password', secure: true },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join the Plato community</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          {fields.map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <View style={[styles.inputWrapper, errors[field.key] && styles.inputError]}>
                <Text style={styles.inputIcon}>{field.icon}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor="#BDBDBD"
                  value={form[field.key]}
                  onChangeText={(t) => updateForm(field.key, t)}
                  keyboardType={field.keyboardType || 'default'}
                  secureTextEntry={field.secure && !showPassword}
                  autoCapitalize={field.keyboardType === 'email-address' ? 'none' : 'words'}
                  autoCorrect={false}
                />
                {field.secure && (
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {errors[field.key] && <Text style={styles.errorText}>{errors[field.key]}</Text>}
            </View>
          ))}

          <TouchableOpacity onPress={handleRegister} style={styles.registerButton} disabled={loading}>
            <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.registerGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerText}>Create Account</Text>}
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
  header: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 28, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  formContainer: { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 40 },
  inputGroup: { marginBottom: 16 },
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
  registerButton: { borderRadius: 16, overflow: 'hidden', elevation: 4, marginTop: 8 },
  registerGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  registerText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  loginText: { fontSize: 15, color: '#757575' },
  loginLink: { fontSize: 15, color: '#FF6B35', fontWeight: '700' },
});
