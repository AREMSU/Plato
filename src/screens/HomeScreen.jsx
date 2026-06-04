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
  const { user, meals, bookings, reviewsReceived, refreshUserData } = useApp();
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
  const availableMeals = meals.filter((meal) => !isMealOwner(user, meal) && !isMealExpired(meal) && meal.status === 'approved');
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
  const myMeals = meals.filter((meal) => isMealOwner(user, meal));
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const myRating = user?.rating?.toFixed(1) || '5.0';

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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FC8019" />}
      >
        {/* ── Top Header (scrolls with content) ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingTitle}>{greeting}, {firstName} 👋</Text>
              <Text style={styles.greetingSub}>What would you like to eat today?</Text>
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
          <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Explore')} activeOpacity={0.9}>
            <Ionicons name="search-outline" size={18} color="#FC8019" style={{ marginRight: 6 }} />
            <Text style={styles.searchPlaceholder}>Search for dishes, home chefs or cuisines...</Text>
            <View style={styles.filterBtn}>
              <Ionicons name="options-outline" size={16} color="#64748B" />
            </View>
          </TouchableOpacity>
        </View>
        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Main', { screen: 'MyMeals', params: { initialTab: 'listings' } })}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF3EE' }]}>
              <Ionicons name="restaurant" size={18} color="#FC8019" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{myMeals.length}</Text>
              <Text style={styles.statLabel}>Meals Listed</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8} onPress={() => navigation.navigate('MyMeals')}>
            <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="bag-check" size={18} color="#257D3D" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: '#257D3D' }]}>{activeBookings.length}</Text>
              <Text style={styles.statLabel}>Active Orders</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Main', { screen: 'Profile', params: { openReviews: true } })}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#FFFDE7' }]}>
              <Ionicons name="star" size={18} color="#E2A93E" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: '#E2A93E' }]}>{myRating}</Text>
              <Text style={styles.statLabel}>Cook Rating</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Active booking banner ── */}
        {activeBookings.length > 0 && (
          <TouchableOpacity style={styles.activeBanner} onPress={() => navigation.navigate('MyMeals')} activeOpacity={0.88}>
            <LinearGradient colors={['#0F8A5F', '#1F9A6F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bannerGradient}>
              <View style={styles.bannerLeft}>
                <Ionicons name="bicycle" size={20} color="#fff" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.bannerTitle}>
                    {activeBookings.length} Active Booking{activeBookings.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.bannerSub}>Tap to track and pick up your meal</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── AI Recommendations ── */}
        <AIRecommendation navigation={navigation} />

        {/* ── Browse Meals ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What's on your mind?</Text>
        </View>

        <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

        <View style={styles.sectionHeaderBordered}>
          <Text style={styles.sectionTitle}>All Home Kitchens</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Explore')} style={styles.seeAllBtn}>
            <Text style={styles.seeAll}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color="#FC8019" />
          </TouchableOpacity>
        </View>

        <View style={styles.mealsList}>
          {filteredMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="restaurant-outline" size={32} color="#FC8019" />
              </View>
              <Text style={styles.emptyTitle}>No meals found</Text>
              <Text style={styles.emptySubtitle}>Be the first to list a meal on campus!</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // ── Header ──
  header: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  greetingSub: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFF3EE',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFEBE0',
  },
  avatarLetter: { fontSize: 18, color: '#FC8019', fontWeight: '800' },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F8A5F',
    borderWidth: 2,
    borderColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchPlaceholder: { flex: 1, fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  filterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: { fontSize: 15, fontWeight: '800', color: '#FC8019' },
  statLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },

  // ── Banner ──
  activeBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0F8A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },

  // ── Section header ──
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionHeaderBordered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { fontSize: 13, color: '#FC8019', fontWeight: '700' },

  // ── Meals list ──
  mealsList: { paddingHorizontal: 20, paddingTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#64748B' },
});

