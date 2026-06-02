import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import MealCard from '../components/MealCard';
import UserAvatar from '../components/UserAvatar';
import { getReliabilityBadge, isMealOwner } from '../utils/helpers';

export default function CookProfileScreen({ navigation, route }) {
  const { sellerId, sellerName, sellerAvatar, sellerRating } = route.params;
  const { meals, user } = useApp();

  // Get all meals listed by this seller that aren't owned by current user
  const cookMeals = meals.filter(
    (m) => (m.sellerId === sellerId || m.seller_id === sellerId)
  );

  const badge = getReliabilityBadge(sellerRating || 4.5);
  const isMe = user?.id === sellerId;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#E8500A', '#FF6B35', '#FF8C42']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {sellerAvatar ? (
              <Image source={{ uri: sellerAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>
                  {sellerName?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
            )}
            {/* Verified ring */}
            <View style={styles.verifiedRing} />
          </View>

          <Text style={styles.sellerName}>{sellerName}</Text>
          {isMe && <Text style={styles.youLabel}>That's you!</Text>}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.statValue}>
                {sellerRating ? sellerRating.toFixed(1) : '5.0'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="storefront-outline" size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.statValue}>{cookMeals.length}</Text>
              <Text style={styles.statLabel}>Meals</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.badgePill, { backgroundColor: badge.color + '30' }]}>
                <Text style={[styles.badgeText, { color: '#fff' }]}>{badge.label}</Text>
              </View>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Meals by this cook */}
        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>
            {isMe ? 'Your Listings' : `Meals by ${sellerName?.split(' ')[0]}`}
          </Text>

          {cookMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="restaurant-outline" size={36} color="#FF6B35" />
              </View>
              <Text style={styles.emptyTitle}>No meals listed yet</Text>
              <Text style={styles.emptySubtitle}>
                {isMe ? 'Start sharing your cooking!' : 'This cook hasn\'t listed any meals yet.'}
              </Text>
            </View>
          ) : (
            cookMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onPress={() => navigation.navigate('MealDetail', { meal })}
              />
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

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 60,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarLetter: { fontSize: 36, color: '#fff', fontWeight: '800' },
  verifiedRing: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#fff',
  },
  sellerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  youLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 4,
  },
  statItem: { alignItems: 'center', gap: 4, flex: 1 },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },

  // Meals section
  mealsSection: { paddingHorizontal: 16, paddingTop: 22 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 14,
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
});
