import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { getDashboard } from '../api/client';
import { COLORS, formatCurrency, timeAgo } from '../utils/helpers';

const DashboardScreen = ({ navigation }) => {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getDashboard();
      setData(d);
    } catch (e) {
      console.log('Dashboard error:', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!data) {
    return (
      <View style={styles.container}>
        <Header title="Dashboard" subtitle="Loading..." />
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Dashboard" subtitle="Platform Overview" />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {/* Row 1 */}
        <View style={styles.statsRow}>
          <StatCard icon="👥" value={data.total_users} label="Users" color={COLORS.accentGlow} />
          <StatCard icon="🍛" value={data.total_meals} label="Meals" color={COLORS.successBg} />
        </View>
        <View style={styles.statsRow}>
          <StatCard icon="📋" value={data.total_bookings} label="Bookings" color={COLORS.infoBg} />
          <StatCard icon="💰" value={formatCurrency(data.total_revenue)} label="Revenue" color={COLORS.purpleBg} />
        </View>
        <View style={styles.statsRow}>
          <StatCard icon="📈" value={formatCurrency(data.monthly_revenue)} label="Monthly Rev" color={COLORS.warningBg} />
          <StatCard icon="💎" value={data.pro_users} label="Pro Users" color={COLORS.purpleBg} />
        </View>
        <View style={styles.statsRow}>
          <StatCard icon="✅" value={data.active_bookings} label="Active" color={COLORS.successBg} />
          <StatCard icon="❌" value={data.cancelled_bookings} label="Cancelled" color={COLORS.dangerBg} />
        </View>

        {/* Category Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Categories</Text>
          {data.categories.map((cat, i) => (
            <View key={i} style={styles.catRow}>
              <Text style={styles.catLabel}>{cat.category}</Text>
              <View style={styles.catBarBg}>
                <View style={[styles.catBarFill, { width: `${(cat.count / data.total_meals) * 100}%` }]} />
              </View>
              <Text style={styles.catCount}>{cat.count}</Text>
            </View>
          ))}
        </View>

        {/* Meals Pending Review */}
        {data.pending_meals && data.pending_meals.length > 0 && (
          <View style={[styles.card, { borderColor: COLORS.warning, borderWidth: 1.2 }]}>
            <Text style={[styles.cardTitle, { color: COLORS.warning }]}>🍛 Pending Review ({data.pending_meals.length})</Text>
            {data.pending_meals.map((m, i) => (
              <TouchableOpacity key={i} style={styles.activityItem} onPress={() => navigation.navigate('MealDetail', { mealId: m.id })} activeOpacity={0.7}>
                <View style={[styles.actIcon, { backgroundColor: COLORS.warningBg }]}>
                  <Text>⏳</Text>
                </View>
                <View style={styles.actText}>
                  <Text style={styles.actTitle} numberOfLines={1}>{m.title}</Text>
                  <Text style={styles.actSub}>by {m.seller_name || 'Seller'} · {formatCurrency(m.price_per_portion)}</Text>
                </View>
                <Badge text="Review" type="warning" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Bookings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Recent Bookings</Text>
          {(data.recent_bookings || []).slice(0, 5).map((b, i) => (
            <TouchableOpacity key={i} style={styles.activityItem} onPress={() => b.meal?.id && navigation.navigate('MealDetail', { mealId: b.meal.id })} activeOpacity={0.7}>
              <View style={[styles.actIcon, { backgroundColor: b.status === 'confirmed' ? COLORS.successBg : COLORS.dangerBg }]}>
                <Text>{b.status === 'confirmed' ? '✅' : '❌'}</Text>
              </View>
              <View style={styles.actText}>
                <Text style={styles.actTitle} numberOfLines={1}>{b.meal?.title || 'Meal'}</Text>
                <Text style={styles.actSub}>{b.portions} portions · {formatCurrency(b.total_cost)}</Text>
              </View>
              <Text style={styles.actTime}>{timeAgo(b.booked_at)}</Text>
            </TouchableOpacity>
          ))}
          {(!data.recent_bookings || data.recent_bookings.length === 0) && (
            <Text style={styles.emptyText}>No bookings yet</Text>
          )}
        </View>

        {/* Recent Users */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🆕 New Users</Text>
          {(data.recent_users || []).map((u, i) => (
            <TouchableOpacity key={i} style={styles.activityItem} onPress={() => navigation.navigate('UserDetail', { userId: u.id })}>
              <View style={[styles.actIcon, { backgroundColor: COLORS.infoBg }]}>
                <Text>👤</Text>
              </View>
              <View style={styles.actText}>
                <Text style={styles.actTitle} numberOfLines={1}>{u.email || u.name}</Text>
                <Text style={styles.actSub}>{u.university || 'No university'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1, padding: 16 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textMuted, fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
    shadowColor: '#1F2937', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  catLabel: { width: 90, fontSize: 13, color: COLORS.textSecondary },
  catBarBg: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 4 },
  catCount: { width: 30, textAlign: 'right', fontSize: 13, color: COLORS.textMuted },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  actIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actText: { flex: 1 },
  actTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actTime: { fontSize: 11, color: COLORS.textMuted },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', padding: 20 },
});

export default DashboardScreen;
