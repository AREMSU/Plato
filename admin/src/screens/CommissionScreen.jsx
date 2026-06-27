import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { getCommission, recordWithdrawal } from '../api/client';
import { COLORS, formatCurrency, formatDate, timeAgo } from '../utils/helpers';

const REASON_LABELS = {
  booking_commission: '📦 Booking',
  cancellation_commission: '❌ Cancellation',
  withdrawal: '🏦 Withdrawal',
};

const CommissionScreen = () => {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [note, setNote] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getCommission();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleWithdraw = async () => {
    if (!data || data.balance <= 0) {
      Alert.alert('No Balance', 'There is no commission balance to withdraw.');
      return;
    }
    setWithdrawing(true);
    try {
      const res = await recordWithdrawal(note || 'Manual withdrawal to bank account');
      Alert.alert('✅ Withdrawal Recorded', res.message);
      setWithdrawModal(false);
      setNote('');
      await load();
    } catch (e) {
      Alert.alert('Error', e.error || e.message || 'Failed to record withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  const renderTransaction = ({ item }) => {
    const isWithdrawal = item.reason === 'withdrawal';
    return (
      <View style={styles.txnRow}>
        <View style={styles.txnLeft}>
          <Text style={styles.txnIcon}>{REASON_LABELS[item.reason] || '💰'}</Text>
          <View style={styles.txnInfo}>
            <Text style={styles.txnDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.txnTime}>{timeAgo(item.created_at)} · {formatDate(item.created_at)}</Text>
            {item.booking_id ? (
              <Text style={styles.txnRef}>Booking #{item.booking_id.slice(0, 8)}</Text>
            ) : null}
          </View>
        </View>
        <Text style={[styles.txnAmount, isWithdrawal && styles.txnAmountOut]}>
          {isWithdrawal ? '−' : '+'}Rs.{Number(item.amount).toFixed(2)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Commission Wallet" subtitle="Platform earnings tracker" />

      {/* Balance Cards */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardAccent]}>
          <Ionicons name="wallet" size={22} color="#fff" style={{ marginBottom: 6 }} />
          <Text style={styles.cardLabel}>Available Balance</Text>
          <Text style={styles.cardValue}>{formatCurrency(data?.balance ?? 0)}</Text>
        </View>
        <View style={[styles.card, styles.cardGreen]}>
          <Ionicons name="trending-up" size={22} color="#fff" style={{ marginBottom: 6 }} />
          <Text style={styles.cardLabel}>All-Time Earned</Text>
          <Text style={styles.cardValue}>{formatCurrency(data?.total_earned ?? 0)}</Text>
        </View>
      </View>

      {/* Withdraw Button */}
      <TouchableOpacity
        style={[styles.withdrawBtn, (!data?.balance || data.balance <= 0) && styles.withdrawBtnDisabled]}
        onPress={() => setWithdrawModal(true)}
        disabled={!data?.balance || data.balance <= 0}
      >
        <Ionicons name="arrow-up-circle" size={18} color="#fff" />
        <Text style={styles.withdrawBtnText}>Record Withdrawal</Text>
      </TouchableOpacity>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>Transaction History ({data?.transaction_count ?? 0})</Text>
      <FlatList
        data={data?.transactions ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTransaction}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Commission will appear here once bookings are completed</Text>
          </View>
        }
      />

      {/* Withdrawal Modal */}
      <Modal visible={withdrawModal} transparent animationType="slide" onRequestClose={() => setWithdrawModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Record Withdrawal</Text>
            <Text style={styles.modalSubtitle}>
              This will mark Rs.{Number(data?.balance ?? 0).toFixed(2)} as withdrawn and reset the balance to Rs.0.
            </Text>
            <Text style={styles.inputLabel}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Transferred to Himalayan Bank account"
              placeholderTextColor={COLORS.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setWithdrawModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, withdrawing && styles.btnDisabled]}
                onPress={handleWithdraw}
                disabled={withdrawing}
              >
                {withdrawing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmBtnText}>Confirm Withdrawal</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },

  cardsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 16 },
  card: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  cardAccent: { backgroundColor: COLORS.accent },
  cardGreen: { backgroundColor: COLORS.success },
  cardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: 4 },
  cardValue: { fontSize: 20, color: '#fff', fontWeight: '800' },

  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.accent, marginHorizontal: 16,
    marginTop: 14, borderRadius: 12, paddingVertical: 13,
  },
  withdrawBtnDisabled: { backgroundColor: COLORS.textMuted },
  withdrawBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    paddingHorizontal: 16, marginTop: 20, marginBottom: 10, letterSpacing: 0.5,
  },

  txnRow: {
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  txnLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  txnIcon: { fontSize: 20, marginTop: 2 },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 13, color: COLORS.text, fontWeight: '600', marginBottom: 3 },
  txnTime: { fontSize: 11, color: COLORS.textMuted },
  txnRef: { fontSize: 11, color: COLORS.info, marginTop: 2, fontWeight: '600' },
  txnAmount: { fontSize: 15, fontWeight: '800', color: COLORS.success, marginLeft: 8 },
  txnAmountOut: { color: COLORS.danger },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20, lineHeight: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 12, fontSize: 14, color: COLORS.text, minHeight: 70,
    textAlignVertical: 'top', backgroundColor: '#FAFAFA', marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 2, backgroundColor: COLORS.accent, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
});

export default CommissionScreen;
