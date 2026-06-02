import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  RefreshControl, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import MealCard from '../components/MealCard';
import AIRecommendation from '../components/AIRecommendation';
import CategoryFilter from '../components/CategoryFilter';
import { getDisplayName, getGreeting, isMealOwner } from '../utils/helpers';
import { categories } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const { user, meals, bookings, refreshUserData } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const greeting = getGreeting();
  const displayName = getDisplayName(user);
  const firstName = displayName.split(' ')[0] || displayName;
  const isMealExpired = (meal) => {
    try {
      const dateStr = meal?.mealDate || new Date().toISOString().split('T')[0];
      const dt = new Date(`${dateStr} ${meal?.pickupTime}`);
      return !isNaN(dt.getTime()) && dt < new Date();
    } catch { return false; }
  };
  const availableMeals = meals.filter((meal) => !isMealOwner(user, meal) && !isMealExpired(meal));
  const getFeaturedFlag = (meal) => meal.isFeatured ?? meal.is_featured ?? false;
  const sortFeaturedFirst = (list) => [...list].sort((a, b) => {
    const aFeatured = getFeaturedFlag(a) ? 1 : 0;
    const bFeatured = getFeaturedFlag(b) ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  const filteredMeals = selectedCategory === 'all'
    ? sortFeaturedFirst(availableMeals)
    : sortFeaturedFirst(availableMeals.filter((m) => m.category === selectedCategory));
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (typeof refreshUserData === 'function') {
        await refreshUserData();
      }
    } catch (e) {
      console.error('Home refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E8500A" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={['#E8500A', '#FF6B35', '#FF8C42']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Top row */}
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>

              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarWrapper}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>
                    {displayName.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Explore')} activeOpacity={0.85}>
            <Ionicons name="search-outline" size={18} color="#9E9E9E" />
            <Text style={styles.searchPlaceholder}>Search meals, cuisines...</Text>
            <View style={styles.filterBtn}>
              <Ionicons name="options-outline" size={17} color="#FF6B35" />
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF3EE' }]}>
              <Ionicons name="storefront-outline" size={20} color="#FF6B35" />
            </View>
            <Text style={[styles.statValue, { color: '#FF6B35' }]}>{meals.length}</Text>
            <Text style={styles.statLabel}>Meals</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => navigation.navigate('MyMeals')}>
            <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="bag-check-outline" size={20} color="#4CAF50" />
            </View>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{activeBookings.length}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFFDE7' }]}>
              <Ionicons name="star" size={20} color="#FFC107" />
            </View>
            <Text style={[styles.statValue, { color: '#FFC107' }]}>{user?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </TouchableOpacity>
        </View>

        {/* ── Active booking banner ── */}
        {activeBookings.length > 0 && (
          <TouchableOpacity style={styles.activeBanner} onPress={() => navigation.navigate('MyMeals')} activeOpacity={0.88}>
            <LinearGradient colors={['#1B873F', '#4CAF50']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bannerGradient}>
              <View style={styles.bannerLeft}>
                <Ionicons name="bicycle-outline" size={22} color="#fff" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.bannerTitle}>
                    {activeBookings.length} active order{activeBookings.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.bannerSub}>Tap to track your pickup</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── AI Recommendations ── */}
        <AIRecommendation navigation={navigation} />

        {/* ── Browse Meals ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse Meals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Explore')} style={styles.seeAllBtn}>
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons name="arrow-forward" size={14} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

        <View style={styles.mealsList}>
          {filteredMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="restaurant-outline" size={40} color="#FF6B35" />
              </View>
              <Text style={styles.emptyTitle}>No meals found</Text>
              <Text style={styles.emptySubtitle}>Be the first to share a meal!</Text>
            </View>
          ) : (
            filteredMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onPress={() => navigation.navigate('MealDetail', { meal })} />
            ))
          )}
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: { flex: 1 },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 10,
  },
  locationText: { fontSize: 12, fontWeight: '700', color: '#FF6B35' },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '500',
    marginBottom: 2,
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  avatarWrapper: { position: 'relative', marginTop: 4 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarLetter: { fontSize: 22, color: '#fff', fontWeight: '800' },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: '#BDBDBD', fontWeight: '500' },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 6,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '600' },

  // ── Banner ──
  activeBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAll: { fontSize: 13, color: '#FF6B35', fontWeight: '700' },

  // ── Meals list ──
  mealsList: { paddingHorizontal: 16, paddingTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9E9E9E' },
});
