import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';

export default function AIRecommendation({ navigation }) {
  const { getAIRecommendations } = useApp();
  const recommended = getAIRecommendations();

  if (!recommended || recommended.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recommended for You</Text>
          <Text style={styles.subtitle}>Picked based on your preferences</Text>
        </View>
        <View style={styles.aiBadge}>
          <Ionicons name="flash" size={13} color="#fff" />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>

      {/* Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={192}
        snapToAlignment="start"
      >
        {recommended.map((meal) => {
          const price = meal.price_per_portion || meal.pricePerPortion || 0;
          const rating = meal.rating || 0;
          const isVeg = meal.is_vegetarian ?? meal.isVegetarian ?? false;

          return (
            <TouchableOpacity
              key={meal.id}
              style={styles.card}
              onPress={() => navigation.navigate('MealDetail', { meal })}
              activeOpacity={0.9}
            >
              {/* Meal image */}
              {meal?.image ? (
                <Image source={{ uri: meal.image }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Ionicons name="restaurant-outline" size={36} color="#FFB89A" />
                </View>
              )}

              {/* Gradient overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.78)']}
                style={styles.cardOverlay}
              />

              {/* Veg badge */}
              {isVeg && (
                <View style={styles.vegBadge}>
                  <Ionicons name="leaf" size={12} color="#fff" />
                </View>
              )}

              {/* Card content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{meal.title}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardPrice}>{formatCurrency(price)}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={11} color="#FFD700" />
                    <Text style={styles.cardRating}>
                      {rating > 0 ? rating.toFixed(1) : 'New'}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Insight pill */}
      <View style={styles.insightRow}>
        <Ionicons name="sparkles" size={16} color="#9C27B0" />
        <Text style={styles.insightText}>
          Based on your campus location &amp; preferences
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 20 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  subtitle: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#9C27B0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // Scroll
  scrollContent: { paddingHorizontal: 16, gap: 12 },

  // Card
  card: {
    width: 180,
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
  cardImagePlaceholder: {
    backgroundColor: '#2E1C3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  vegBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#FFD700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardRating: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Insight
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#F3E5F5',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    color: '#6A1B9A',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
});
