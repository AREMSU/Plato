import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { getUserDetail, userAction } from '../api/client';
import { COLORS, formatCurrency, formatDate } from '../utils/helpers';

const UserDetailScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      const d = await getUserDetail(userId);
      setData(d);
    } catch (e) { console.log(e); }
  };

  useEffect(() => { load(); }, [userId]);

  const doAction = (action, msg) => {
    Alert.alert('Confirm', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try {
          await userAction(userId, action);
          if (action === 'delete') navigation.goBack();
          else load();
        } catch (e) { Alert.alert('Error', e.error || 'Failed'); }
      }},
    ]);
  };

  if (!data) return (
    <View style={styles.container}>
      <Header title="User" onBack={() => navigation.goBack()} />
      <Text style={styles.loading}>Loading...</Text>
    </View>
  );

  const u = data.user;
  const sub = data.subscription;

  return (
    <View style={styles.container}>
      <Header title={u.first_name || u.email} subtitle={u.email} onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + Status */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(u.email || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{u.first_name} {u.last_name}</Text>
            <Text style={styles.uni}>{u.university || 'No university'}</Text>
            <View style={styles.badgeRow}>
              <Badge text={u.is_active ? 'Active' : 'Inactive'} type={u.is_active ? 'success' : 'danger'} />
              {u.is_superuser ? <Badge text="Superuser" type="purple" /> : u.is_staff ? <Badge text="Staff" type="info" /> : <Badge text="User" type="muted" />}
              {sub && sub.is_pro && <Badge text="PRO" type="purple" />}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, u.is_active ? styles.dangerBtn : styles.successBtn]} onPress={() => doAction('toggle_active', `${u.is_active ? 'Deactivate' : 'Activate'} this user?`)}>
            <Text style={[styles.actionText, u.is_active ? styles.dangerText : styles.successText]}>{u.is_active ? 'Deactivate' : 'Activate'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => doAction('toggle_staff', `${u.is_staff ? 'Remove staff' : 'Make staff'}?`)}>
            <Text style={styles.secondaryText}>{u.is_staff ? 'Remove Staff' : 'Make Staff'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => doAction('delete', 'Delete this user permanently?')}>
            <Text style={styles.dangerText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          {[
            { label: 'Rating', value: `⭐ ${u.rating}` },
            { label: 'Meals Shared', value: u.meals_shared },
            { label: 'Earnings', value: formatCurrency(data.earnings) },
            { label: 'Joined', value: formatDate(u.date_joined) },
            { label: 'Last Login', value: formatDate(u.last_login) },
            { label: 'Subscription', value: sub?.is_pro ? `PRO (${sub.days_remaining}d)` : 'Free' },
          ].map((item, i) => (
            <View key={i} style={styles.infoItem}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* User Meals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍛 Meals ({data.meals.length})</Text>
          {data.meals.map((m, i) => (
            <TouchableOpacity key={i} style={styles.listItem} onPress={() => navigation.navigate('MealDetail', { mealId: m.id })}>
              <Text style={styles.listTitle} numberOfLines={1}>{m.title}</Text>
              <Text style={styles.listSub}>Rs. {m.price_per_portion} · {m.available_portions}/{m.total_portions} portions</Text>
            </TouchableOpacity>
          ))}
          {data.meals.length === 0 && <Text style={styles.empty}>No meals</Text>}
        </View>

        {/* User Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Bookings ({data.bookings.length})</Text>
          {data.bookings.map((b, i) => (
            <View key={i} style={styles.listItem}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.listTitle} numberOfLines={1}>{b.meal?.title || 'Meal'}</Text>
                <Badge text={b.status} type={b.status === 'confirmed' ? 'success' : 'danger'} />
              </View>
              <Text style={styles.listSub}>{b.portions} portions · Rs. {b.total_cost}</Text>
            </View>
          ))}
          {data.bookings.length === 0 && <Text style={styles.empty}>No bookings</Text>}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1, padding: 16 },
  loading: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accentGlow, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 2, borderColor: 'rgba(255,107,53,0.3)' },
  avatarText: { fontSize: 22, fontWeight: '700', color: COLORS.accent },
  profileInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  uni: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  dangerBtn: { backgroundColor: COLORS.dangerBg, borderColor: 'rgba(239,68,68,0.2)' },
  successBtn: { backgroundColor: COLORS.successBg, borderColor: 'rgba(34,197,94,0.2)' },
  secondaryBtn: { backgroundColor: COLORS.bgCard, borderColor: COLORS.border },
  actionText: { fontSize: 13, fontWeight: '600' },
  dangerText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  successText: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  secondaryText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  infoItem: { backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 14, width: '48%', borderWidth: 1, borderColor: COLORS.border },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  section: { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  listItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  listTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  listSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: { color: COLORS.textMuted, textAlign: 'center', padding: 20 },
});

export default UserDetailScreen;
