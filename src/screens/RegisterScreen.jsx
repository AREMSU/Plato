import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import apiCall from '../api/client';


export default function RegisterScreen({ navigation }) {
  const {} = useApp();
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

 const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
        const data = await apiCall('/auth/register/', 'POST', {
            first_name: form.name.trim(),
            email: form.email.trim(),
            university: form.university.trim(),
            password: form.password,
            confirm_password: form.confirmPassword,
        });
        // Navigate to OTP screen
        navigation.navigate('OTP', {
            email: form.email.trim(),
            name: form.name.trim(),
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        Alert.alert('Registration Failed', 'Something went wrong. Please try again.');
    } finally {
        setLoading(false);
    }
};

  const fields = [
    { key: 'name', label: 'Full Name', icon: 'person-outline', placeholder: 'Your full name' },
    { key: 'email', label: 'Email Address', icon: 'mail-outline', placeholder: 'your@student.edu', keyboardType: 'email-address' },
    { key: 'university', label: 'University / College', icon: 'school-outline', placeholder: 'e.g. Kathmandu University' },
    { key: 'password', label: 'Password', icon: 'lock-closed-outline', placeholder: 'Create a password', secure: true },
    { key: 'confirmPassword', label: 'Confirm Password', icon: 'lock-closed-outline', placeholder: 'Repeat your password', secure: true },
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
                <Ionicons name={field.icon} size={20} color="#757575" style={{ marginRight: 10 }} />
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
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#757575" />
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
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, backgroundColor: '#FAFAFA',
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
