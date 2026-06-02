import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { getMeals } from '../api/client';
import { COLORS, formatCurrency } from '../utils/helpers';

const FILTERS = ['all', 'pending_review', 'available', 'sold_out', 'featured', 'vegetarian'];
const CATEGORIES = ['', 'Nepali', 'Continental', 'Chinese', 'Snacks', 'Breakfast'];

const MealsScreen = ({ navigation }) => {
  const [meals, setMeals] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (filter !== 'all') params.set('filter', filter);
      if (category) params.set('category', category);
      const d = await getMeals(params.toString());
      setMeals(d.meals);
      setTotal(d.total);
    } catch (e) { console.log(e); }
  }, [query, filter, category]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderMeal = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MealDetail', { mealId: item.id })} activeOpacity={0.7}>
      <View style={styles.mealInfo}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.sub}>by {item.seller_name || 'Unknown'} · {item.category}</Text>
        <Text style={styles.price}>{formatCurrency(item.price_per_portion)}/portion</Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.portions}>{item.available_portions}/{item.total_portions}</Text>
        <View style={styles.badgeRow}>
          {item.available_portions > 0 ? <Badge text="Available" type="success" /> : <Badge text="Sold Out" type="danger" />}
          {item.is_featured && <Badge text="⭐" type="warning" />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Meals" subtitle={`${total} total`} />
      <View style={styles.toolbar}>
        <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="🔍 Search meals..." placeholderTextColor={COLORS.textMuted} onSubmitEditing={load} />
        
        <Text style={styles.sectionLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={styles.pillsWrapper}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.pill, filter === f && styles.pillActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={styles.pillsWrapper}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c || 'all'} style={[styles.pill, category === c && styles.pillActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c || 'All'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList data={meals} keyExtractor={(item) => String(item.id)} renderItem={renderMeal} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />} ListEmptyComponent={<Text style={styles.empty}>No meals found</Text>} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  toolbar: { paddingHorizontal: 16, paddingTop: 12 },
  search: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 14, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  pillsWrapper: { marginBottom: 10 },
  pills: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, height: 30, justifyContent: 'center', alignItems: 'center' },
  pillActive: { backgroundColor: COLORS.accentGlow, borderColor: 'rgba(255,107,53,0.3)' },
  pillText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.accent },
  row: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  mealInfo: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '700', color: COLORS.accent, marginTop: 4 },
  rightCol: { alignItems: 'flex-end', justifyContent: 'space-between' },
  portions: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  badgeRow: { gap: 4, marginTop: 4 },
  empty: { textAlign: 'center', color: COLORS.textMuted, padding: 40 },
});

export default MealsScreen;
