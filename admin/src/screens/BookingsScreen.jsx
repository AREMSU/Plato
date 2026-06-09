import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { getBookings, cancelBooking, markRefundComplete } from '../api/client';
import { COLORS, formatCurrency, timeAgo } from '../utils/helpers';

const BookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (statusFilter) params.set('status', statusFilter);
      const d = await getBookings(params.toString());
      setBookings(d.bookings);
      setTotal(d.total);
    } catch (e) { console.log(e); }
  }, [query, statusFilter]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCancel = (id) => {
    Alert.alert('Cancel Booking', 'Cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try { await cancelBooking(id); load(); } catch (e) { Alert.alert('Error', e.error || 'Failed'); }
      }},
    ]);
  };

  const handleRefundComplete = (item) => {
    const refundAmt = Math.round(item.total_cost * 0.7);
    Alert.alert(
      'Mark Refund Complete',
      `Confirm that Rs.${refundAmt} has been refunded to the user for booking #${item.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Mark Complete', onPress: async () => {
          try {
            await markRefundComplete(item.id);
            load();
            Alert.alert('Done', 'Refund marked as completed. User will see the update.');
          } catch (e) {
            Alert.alert('Error', e.error || 'Failed to update refund status.');
          }
        }},
      ]
    );
  };

  const renderBooking = ({ item }) => {
    const isCancelled = item.status === 'cancelled';
    const hasPendingRefund = isCancelled && item.refund_status === 'pending';
    const isRefundDone = isCancelled && item.refund_status === 'completed';

    return (
      <View style={styles.row}>
        <View style={styles.topRow}>
          <Text style={styles.id}>#{item.id}</Text>
          <Badge text={item.status} type={item.status === 'confirmed' ? 'success' : 'danger'} />
        </View>
        <Text style={styles.mealTitle} numberOfLines={1}>{item.meal?.title || 'Meal'}</Text>
        <Text style={styles.sub}>
          {item.portions} portions · {formatCurrency(item.total_cost)} · {item.payment_method || 'cash'}
        </Text>
        <Text style={styles.time}>{timeAgo(item.booked_at)}</Text>

        {hasPendingRefund && (
          <View style={styles.refundRow}>
            <View style={styles.refundPending}>
              <Text style={styles.refundPendingText}>
                ⏳ Refund pending · Rs.{Math.round(item.total_cost * 0.7)} to return
              </Text>
            </View>
            <TouchableOpacity style={styles.refundBtn} onPress={() => handleRefundComplete(item)}>
              <Text style={styles.refundBtnText}>✓ Mark Refunded</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRefundDone && (
          <View style={styles.refundDone}>
            <Text style={styles.refundDoneText}>✅ Refund completed</Text>
          </View>
        )}

        {item.status === 'confirmed' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
            <Text style={styles.cancelText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Bookings" subtitle={`${total} total`} />
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="🔍 Search bookings..."
          placeholderTextColor={COLORS.textMuted}
          onSubmitEditing={load}
        />
        <View style={styles.pills}>
          {['', 'confirmed', 'cancelled'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, statusFilter === s && styles.pillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.pillText, statusFilter === s && styles.pillTextActive]}>
                {s || 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBooking}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        ListEmptyComponent={<Text style={styles.empty}>No bookings found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  toolbar: { paddingHorizontal: 16, paddingTop: 12 },
  search: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 14, marginBottom: 10 },
  pills: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: COLORS.accentGlow, borderColor: 'rgba(255,107,53,0.3)' },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  pillTextActive: { color: COLORS.accent },
  row: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  id: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  mealTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  time: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  refundRow: { marginTop: 10, gap: 6 },
  refundPending: { backgroundColor: '#FFF8E1', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#FFE082' },
  refundPendingText: { fontSize: 12, color: '#F57F17', fontWeight: '600' },
  refundBtn: { backgroundColor: '#E8F5E9', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#A5D6A7' },
  refundBtnText: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  refundDone: { marginTop: 8, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 8, alignItems: 'center' },
  refundDoneText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  cancelBtn: { marginTop: 10, backgroundColor: COLORS.dangerBg, paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  cancelText: { fontSize: 12, fontWeight: '600', color: COLORS.danger },
  empty: { textAlign: 'center', color: COLORS.textMuted, padding: 40 },
});

export default BookingsScreen;
