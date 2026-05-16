import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiCall from '../api/client';
import { useApp } from '../context/AppContext';


export default function OTPScreen({ navigation, route }) {
    const { email, name } = route.params;
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const inputs = useRef([]);
    const { loginAfterVerification } = useApp();

    const handleChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
        Alert.alert('Error', 'Please enter the complete 6 digit OTP');
        return;
    }
    setLoading(true);
    try {
        const data = await apiCall('/auth/verify-otp/', 'POST', {
            email,
            code,
        });
        // Login user after verification
        // Navigator will automatically switch to Main since isLoggedIn becomes true
        await loginAfterVerification(data.user, data.tokens);
    } catch (error) {
        Alert.alert('Error', error.message || 'Invalid OTP');
    } finally {
        setLoading(false);
    }
};

    const handleResend = async () => {
        setResending(true);
        try {
            await apiCall('/auth/resend-otp/', 'POST', { email });
            Alert.alert('✅ Sent!', 'New OTP sent to your email');
            setOtp(['', '', '', '', '', '']);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to resend OTP');
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.header}>
                <Text style={styles.headerTitle}>Verify Email 📧</Text>
                <Text style={styles.headerSubtitle}>
                    We sent a 6 digit code to
                </Text>
                <Text style={styles.email}>{email}</Text>
            </LinearGradient>

            <View style={styles.content}>
                <Text style={styles.label}>Enter OTP Code</Text>
                <View style={styles.otpRow}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={ref => inputs.current[index] = ref}
                            style={[styles.otpInput, digit && styles.otpInputFilled]}
                            value={digit}
                            onChangeText={text => handleChange(text.slice(-1), index)}
                            onKeyPress={e => handleKeyPress(e, index)}
                            keyboardType="numeric"
                            maxLength={1}
                            textAlign="center"
                        />
                    ))}
                </View>

                <Text style={styles.expiry}>⏱️ Code expires in 5 minutes</Text>

                <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.verifyGradient}>
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.verifyText}>Verify Email</Text>
                        }
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResend}
                    disabled={resending}
                >
                    {resending
                        ? <ActivityIndicator color="#FF6B35" />
                        : <Text style={styles.resendText}>Didn't receive? Resend OTP</Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        paddingTop: 70, paddingBottom: 40,
        paddingHorizontal: 30, alignItems: 'center',
        borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
    headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },
    email: { fontSize: 16, color: '#fff', fontWeight: '700', marginTop: 4 },
    content: { flex: 1, paddingHorizontal: 30, paddingTop: 40 },
    label: { fontSize: 16, fontWeight: '600', color: '#424242', marginBottom: 20, textAlign: 'center' },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    otpInput: {
        width: 48, height: 56, borderWidth: 2,
        borderColor: '#E0E0E0', borderRadius: 12,
        fontSize: 24, fontWeight: '800', color: '#1A1A1A',
        backgroundColor: '#FAFAFA',
    },
    otpInputFilled: { borderColor: '#FF6B35', backgroundColor: '#FFF3EE' },
    expiry: { textAlign: 'center', color: '#9E9E9E', fontSize: 13, marginBottom: 30 },
    verifyButton: { borderRadius: 16, overflow: 'hidden', elevation: 4, marginBottom: 16 },
    verifyGradient: { paddingVertical: 16, alignItems: 'center' },
    verifyText: { fontSize: 17, fontWeight: '700', color: '#fff' },
    resendButton: { alignItems: 'center', paddingVertical: 12 },
    resendText: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
});