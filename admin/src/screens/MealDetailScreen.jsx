import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { getMealDetail, mealAction } from '../api/client';
import { COLORS, formatCurrency, timeAgo } from '../utils/helpers';

const MealDetailScreen = ({ route, navigation }) => {
  const { mealId } = route.params;
  const [data, setData] = useState(null);

  const load = async () => {
    try { setData(await getMealDetail(mealId)); } catch (e) { console.log(e); }
  };
  useEffect(() => { load(); }, [mealId]);

  const doAction = (action, msg) => {
    Alert.alert('Confirm', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try { await mealAction(mealId, action); action === 'delete' ? navigation.goBack() : load(); }
        catch (e) { Alert.alert('Error', e.error || 'Failed'); }
      }},
    ]);
  };

  if (!data) return (
    <View style={s.container}><Header title="Meal" onBack={() => navigation.goBack()} /><Text style={s.loading}>Loading...</Text></View>
  );

  const m = data.meal;

  return (
    <View style={s.container}>
      <Header title={m.title} subtitle={m.category} onBack={() => navigation.goBack()} />
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, m.is_featured ? s.secBtn : s.priBtn]} onPress={() => doAction('toggle_featured', `${m.is_featured ? 'Unfeature' : 'Feature'} this meal?`)}>
            <Text style={m.is_featured ? s.secText : s.priText}>{m.is_featured ? 'Unfeature' : '⭐ Feature'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.danBtn]} onPress={() => doAction('delete', 'Delete this meal?')}>
            <Text style={s.danText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={s.grid}>
          {[
            { l: 'Price', v: formatCurrency(m.price_per_portion) },
            { l: 'Portions', v: `${m.available_portions}/${m.total_portions}` },
            { l: 'Bookings', v: m.bookings },
            { l: 'Revenue', v: formatCurrency(data.revenue) },
            { l: 'Rating', v: `⭐ ${m.rating} (${m.reviews})` },
            { l: 'Pickup', v: `${m.pickup_time} · ${m.pickup_location}` },
            { l: 'Nutrition', v: `${m.calories} kcal · ${m.protein}g protein` },
            { l: 'Diet', v: m.is_vegetarian ? '🌿 Vegetarian' : 'Non-Veg' },
          ].map((item, i) => (
            <View key={i} style={s.infoItem}>
              <Text style={s.infoLabel}>{item.l}</Text>
              <Text style={s.infoValue}>{item.v}</Text>
            </View>
          ))}
        </View>

        {m.description ? (
          <View style={s.card}><Text style={s.cardTitle}>📝 Description</Text><Text style={s.desc}>{m.description}</Text></View>
        ) : null}

        {m.tags && m.tags.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🏷️ Tags</Text>
            <View style={s.tags}>{m.tags.map((t, i) => <Badge key={i} text={t} type="muted" />)}</View>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.cardTitle}>📋 Bookings ({data.bookings.length})</Text>
          {data.bookings.map((b, i) => (
            <View key={i} style={s.bookingRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.bTitle} numberOfLines={1}>{b.meal?.title || 'Booking'}</Text>
                <Text style={s.bSub}>{b.portions} portions · Rs. {b.total_cost}</Text>
              </View>
              <Badge text={b.status} type={b.status === 'confirmed' ? 'success' : 'danger'} />
              <Text style={s.bTime}>{timeAgo(b.booked_at)}</Text>
            </View>
          ))}
          {data.bookings.length === 0 && <Text style={s.empty}>No bookings</Text>}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1, padding: 16 },
  loading: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  priBtn: { backgroundColor: COLORS.accentGlow, borderColor: 'rgba(255,107,53,0.3)' },
  secBtn: { backgroundColor: COLORS.bgCard, borderColor: COLORS.border },
  danBtn: { backgroundColor: COLORS.dangerBg, borderColor: 'rgba(239,68,68,0.2)' },
  priText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  secText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  danText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  infoItem: { backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 14, width: '48%', borderWidth: 1, borderColor: COLORS.border },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  desc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  bSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  bTime: { fontSize: 11, color: COLORS.textMuted },
  empty: { color: COLORS.textMuted, textAlign: 'center', padding: 20 },
});

export default MealDetailScreen;
