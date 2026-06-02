import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { getSubscriptions, subscriptionAction } from '../api/client';
import { COLORS, formatCurrency, formatDate } from '../utils/helpers';

const FILTERS = ['all', 'pending', 'pro', 'free', 'expired'];

const SubscriptionsScreen = () => {
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // ID of subscription being processed

  const load = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `filter=${filter}` : '';
      const d = await getSubscriptions(params);
      setSubs(d.subscriptions);
      setTotal(d.total);
    } catch (e) { console.log(e); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      const res = await subscriptionAction(id, action);
      Alert.alert('Success', `Subscription successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      await load();
    } catch (e) {
      console.log(e);
      Alert.alert('Error', e.error || e.message || `Failed to ${action} subscription.`);
    } finally {
      setActionLoading(null);
    }
  };

  const renderSub = ({ item }) => {
    // Determine badge type based on status field
    let statusType = 'muted';
    let statusText = item.status || 'free';
    if (item.status === 'approved') {
      statusType = 'success';
      statusText = 'Approved';
    } else if (item.status === 'pending') {
      statusType = 'warning';
      statusText = 'Pending Approval';
    } else if (item.status === 'rejected') {
      statusType = 'danger';
      statusText = 'Rejected';
    } else if (item.plan === 'pro' && item.is_active) {
      statusType = 'success';
      statusText = 'Active Pro';
    }

    return (
      <View style={styles.row}>
        <View style={styles.topRow}>
          <Text style={styles.email} numberOfLines={1}>{item.user_email}</Text>
          <Badge text={item.plan.toUpperCase()} type={item.plan === 'pro' ? 'purple' : 'muted'} />
        </View>
        <View style={styles.metaRow}>
          <Badge text={statusText} type={statusType} />
          {item.is_pro && <Text style={styles.days}>{item.days_remaining} days left</Text>}
        </View>
        <Text style={styles.detail}>Paid: {formatCurrency(item.amount_paid)} · Ref: {item.payment_reference || '—'}</Text>
        {item.started_at && (
          <Text style={styles.dates}>Started: {formatDate(item.started_at)} · Expires: {formatDate(item.expires_at)}</Text>
        )}

        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, actionLoading === item.id && styles.btnDisabled]}
              onPress={() => handleAction(item.id, 'reject')}
              disabled={actionLoading !== null}
            >
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn, actionLoading === item.id && styles.btnDisabled]}
              onPress={() => handleAction(item.id, 'approve')}
              disabled={actionLoading !== null}
            >
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Subscriptions" subtitle={`${total} total`} />
      <View style={styles.toolbar}>
        <View style={styles.pills}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.pill, filter === f && styles.pillActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList data={subs} keyExtractor={(item) => String(item.id)} renderItem={renderSub} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />} ListEmptyComponent={<Text style={styles.empty}>No subscriptions</Text>} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  toolbar: { paddingHorizontal: 16, paddingTop: 12 },
  pills: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: COLORS.accentGlow, borderColor: 'rgba(255,107,53,0.3)' },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.accent },
  row: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  email: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  days: { fontSize: 12, fontWeight: '600', color: COLORS.info },
  detail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  dates: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textMuted, padding: 40 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center'
  },
  approveBtn: {
    backgroundColor: COLORS.accent
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.danger
  },
  rejectBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700'
  },
  btnDisabled: {
    opacity: 0.5
  }
});

export default SubscriptionsScreen;
