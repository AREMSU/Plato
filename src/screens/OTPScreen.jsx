import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    TouchableOpacity, Alert, ActivityIndicator, Platform, AppState
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiCall from '../api/client';
import { useApp } from '../context/AppContext';


export default function OTPScreen({ navigation, route }) {
    const { email, name } = route.params;
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const inputs = useRef([]);
    const { loginAfterVerification } = useApp();

    const tryFillFromClipboard = async () => {
        try {
            const text = await Clipboard.getStringAsync();
            const digits = text?.replace(/\D/g, '');
            if (digits?.length === 6) {
                setOtp(digits.split(''));
                inputs.current[5]?.focus();
                await Clipboard.setStringAsync('');
            }
        } catch (_) {}
    };

    useEffect(() => {
        tryFillFromClipboard();
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') tryFillFromClipboard();
        });
        return () => sub.remove();
    }, []);

    const handleChange = (text, index) => {
        // Handle paste of full OTP code
        if (text.length > 1) {
            const digits = text.replace(/\D/g, '').slice(0, 6).split('');
            const newOtp = [...otp];
            digits.forEach((d, i) => { newOtp[i] = d; });
            setOtp(newOtp);
            const lastFilled = Math.min(digits.length - 1, 5);
            inputs.current[lastFilled]?.focus();
            return;
        }
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && index > 0) {
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
        console.error('OTP verify error:', error.message);
        Alert.alert('Error', 'Verification failed. Please try again.');
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
            console.error('Resend OTP error:', error.message);
            Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Register')}
                >
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Verify Email</Text>
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
                            onChangeText={text => handleChange(text, index)}
                            onKeyPress={e => handleKeyPress(e, index)}
                            keyboardType="numeric"
                            maxLength={6}
                            textAlign="center"
                            textContentType="oneTimeCode"
                            autoComplete="one-time-code"
                        />
                    ))}
                </View>

                <Text style={styles.expiry}>
                    <Ionicons name="time-outline" size={14} color="#9E9E9E" /> Code expires in 5 minutes
                </Text>

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
    backButton: {
        position: 'absolute', top: 50, left: 20,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
    },
    backArrow: {
        fontSize: 22,
        color: '#fff',
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif',
    },
    email: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '700',
        marginTop: 4,
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    },
    content: { flex: 1, paddingHorizontal: 30, paddingTop: 40 },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#424242',
        marginBottom: 20,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
    },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    otpInput: {
        width: 48, height: 56, borderWidth: 2,
        borderColor: '#E0E0E0', borderRadius: 12,
        fontSize: 24, fontWeight: '800', color: '#1A1A1A',
        backgroundColor: '#FAFAFA',
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    },
    otpInputFilled: { borderColor: '#FF6B35', backgroundColor: '#FFF3EE' },
    expiry: {
        textAlign: 'center',
        color: '#9E9E9E',
        fontSize: 13,
        marginBottom: 30,
        fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
    },
    verifyButton: { borderRadius: 16, overflow: 'hidden', elevation: 4, marginBottom: 16 },
    verifyGradient: { paddingVertical: 16, alignItems: 'center' },
    verifyText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    },
    resendButton: { alignItems: 'center', paddingVertical: 12 },
    resendText: {
        fontSize: 14,
        color: '#FF6B35',
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    },
});