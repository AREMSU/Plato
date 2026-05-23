import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { getSubscriptions } from '../api/client';
import { COLORS, formatCurrency, formatDate } from '../utils/helpers';

const FILTERS = ['all', 'pro', 'free', 'expired'];

const SubscriptionsScreen = () => {
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderSub = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.topRow}>
        <Text style={styles.email} numberOfLines={1}>{item.user_email}</Text>
        <Badge text={item.plan.toUpperCase()} type={item.plan === 'pro' ? 'purple' : 'muted'} />
      </View>
      <View style={styles.metaRow}>
        <Badge text={item.is_active ? 'Active' : 'Inactive'} type={item.is_active ? 'success' : 'danger'} />
        {item.is_pro && <Text style={styles.days}>{item.days_remaining} days left</Text>}
      </View>
      <Text style={styles.detail}>Paid: {formatCurrency(item.amount_paid)} · Ref: {item.payment_reference || '—'}</Text>
      <Text style={styles.dates}>Started: {formatDate(item.started_at)} · Expires: {formatDate(item.expires_at)}</Text>
    </View>
  );

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
});

export default SubscriptionsScreen;
