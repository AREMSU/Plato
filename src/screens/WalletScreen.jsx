import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, Linking, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';

const TOPUP_AMOUNTS = [100, 200, 500, 1000, 2000];

const reasonLabel = (reason) => {
  if (reason === 'topup') return 'Top Up';
  if (reason === 'booking_payment') return 'Booking Payment';
  if (reason === 'refund') return 'Refund';
  if (reason === 'subscription') return 'Subscription';
  return reason;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso) => {
  if (!iso) return '—';
  const cleaned = String(iso).replace(/(\.\d{3})\d+/, '$1');
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return '—';
  const month = MONTHS[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${month} ${day}, ${year} · ${h}:${min} ${ampm}`;
};

export default function WalletScreen({ navigation }) {
  const { wallet, loadWallet, topupWallet } = useApp();
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Refresh on focus and poll every 5s while on this screen
  useEffect(() => {
    loadWallet();
    const interval = setInterval(loadWallet, 5000);
    const unsub = navigation.addListener('focus', loadWallet);
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [navigation]);

  // Refresh when app comes back to foreground after eSewa browser
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        loadWallet();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  const handleTopup = async (amount) => {
    if (!amount || amount < 50) {
      Alert.alert('Invalid Amount', 'Minimum top-up is Rs.50');
      return;
    }
    setLoading(true);
    try {
      const data = await topupWallet(amount);
      if (data?.error) { Alert.alert('Error', data.error); return; }
      if (data?.checkoutUrl) {
        Alert.alert(
          '🟢 eSewa Test Payment',
          `You'll be redirected to eSewa to add Rs.${amount} to your wallet.\n\nTest credentials:\nPhone: 9806074000\nPassword: Nepal@123\nMPIN: 1122`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Proceed to eSewa',
              onPress: () => Linking.openURL(data.checkoutUrl),
            },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to initiate top-up.');
    } finally {
      setLoading(false);
    }
  };

  const transactions = wallet?.transactions || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plato Wallet</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadWallet}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(wallet?.balance ?? 0)}</Text>
          <Text style={styles.balanceSub}>Use this to pay for bookings instantly</Text>
        </View>

        {/* Top-up Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Money</Text>
          <View style={styles.amountGrid}>
            {TOPUP_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={styles.amountChip}
                onPress={() => handleTopup(amt)}
                disabled={loading}
              >
                <Text style={styles.amountChipText}>Rs.{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Custom amount (min Rs.50)"
              placeholderTextColor="#BDBDBD"
              keyboardType="numeric"
              value={customAmount}
              onChangeText={setCustomAmount}
            />
            <TouchableOpacity
              style={styles.customBtn}
              onPress={() => handleTopup(parseInt(customAmount, 10))}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.customBtnText}>Add</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#4CAF50" />
            <Text style={styles.infoText}>
              Top-up via eSewa once · Pay all bookings from wallet instantly
            </Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyTxn}>
              <Ionicons name="receipt-outline" size={36} color="#BDBDBD" />
              <Text style={styles.emptyTxnText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((txn) => (
              <View key={txn.id} style={styles.txnRow}>
                <View style={[styles.txnIcon, { backgroundColor: txn.type === 'credit' ? '#E8F5E9' : '#FFF3EE' }]}>
                  <Ionicons
                    name={txn.type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={20}
                    color={txn.type === 'credit' ? '#4CAF50' : '#FF6B35'}
                  />
                </View>
                <View style={styles.txnInfo}>
                  <Text style={styles.txnDesc}>{txn.description}</Text>
                  <Text style={styles.txnReason}>{reasonLabel(txn.reason)} · {formatDate(txn.createdAt ?? txn.created_at)}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: txn.type === 'credit' ? '#4CAF50' : '#FF5252' }]}>
                  {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  balanceCard: {
    margin: 16,
    padding: 28,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  balanceLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600', marginBottom: 6 },
  balanceAmount: { fontSize: 42, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  balanceSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 14 },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  amountChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF3EE',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  amountChipText: { fontSize: 14, fontWeight: '700', color: '#FF6B35' },
  customRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  customInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  customBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FFF4',
    borderRadius: 10,
    padding: 10,
  },
  infoText: { fontSize: 12, color: '#2E7D32', flex: 1 },
  emptyTxn: { alignItems: 'center', paddingVertical: 24 },
  emptyTxnText: { fontSize: 14, color: '#BDBDBD', marginTop: 8 },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  txnIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  txnReason: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '800' },
});
