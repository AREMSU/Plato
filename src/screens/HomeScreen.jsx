import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import MealCard from '../components/MealCard';
import AIRecommendation from '../components/AIRecommendation';
import CategoryFilter from '../components/CategoryFilter';
import { getGreeting } from '../utils/helpers';
import { categories } from '../data/mockData';

export default function HomeScreen({ navigation }) {
  const { user, meals, bookings } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const greeting = getGreeting();
  const filteredMeals = selectedCategory === 'all' ? meals : meals.filter((m) => m.category === selectedCategory);
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{user?.name?.split(' ')[0]} 👋</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Image source={{ uri: user?.avatar }} style={styles.avatar} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Explore')}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>Search meals near campus...</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: '#FF6B35' }]}>
            <Text style={styles.statIcon}>🍽️</Text>
            <Text style={[styles.statValue, { color: '#FF6B35' }]}>{meals.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{activeBookings.length}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#FFC107' }]}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={[styles.statValue, { color: '#FFC107' }]}>{user?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>My Rating</Text>
          </View>
        </View>

        {activeBookings.length > 0 && (
          <TouchableOpacity style={styles.activeBanner} onPress={() => navigation.navigate('MyMeals')}>
            <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.bannerGradient}>
              <Text style={styles.bannerIcon}>✅</Text>
              <Text style={styles.bannerText}>
                You have {activeBookings.length} active booking{activeBookings.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.bannerArrow}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <AIRecommendation navigation={navigation} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse Meals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

        <View style={styles.mealsList}>
          {filteredMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No meals found</Text>
              <Text style={styles.emptySubtitle}>Be the first to share a meal!</Text>
            </View>
          ) : (
            filteredMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onPress={() => navigation.navigate('MealDetail', { meal })} />
            ))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: 55, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, borderColor: '#fff' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  searchIcon: { fontSize: 18 },
  searchPlaceholder: { fontSize: 14, color: '#BDBDBD', fontWeight: '500' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', borderLeftWidth: 4, elevation: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#9E9E9E', marginTop: 2, fontWeight: '500' },
  activeBanner: { marginHorizontal: 16, marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  bannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  bannerIcon: { fontSize: 18 },
  bannerText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  bannerArrow: { fontSize: 22, color: '#fff', fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  seeAll: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  mealsList: { paddingHorizontal: 16, paddingTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9E9E9E' },
});
