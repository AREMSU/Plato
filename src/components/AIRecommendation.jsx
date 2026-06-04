import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';

const VegSymbol = ({ isVeg }) => (
  <View style={[styles.vegBox, { borderColor: isVeg ? '#0F8A5F' : '#E23744' }]}>
    <View style={[styles.vegDot, { backgroundColor: isVeg ? '#0F8A5F' : '#E23744' }]} />
  </View>
);

export default function AIRecommendation({ navigation }) {
  const { getAIRecommendations } = useApp();
  const recommended = getAIRecommendations();

  if (!recommended || recommended.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Chef's Specials</Text>
          <Text style={styles.subtitle}>Curated from home chefs near you</Text>
        </View>
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiBadge}
        >
          <Ionicons name="sparkles" size={12} color="#fff" />
          <Text style={styles.aiBadgeText}>AI Recommendation</Text>
        </LinearGradient>
      </View>

      {/* Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={262}
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

              {/* Gradient overlay to make text highly readable */}
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
                style={styles.cardOverlay}
              />

              {/* Badges on Top */}
              <View style={styles.topBadges}>
                <VegSymbol isVeg={isVeg} />
              </View>

              {/* Card content aligned at the bottom */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{meal.title}</Text>
                
                <View style={styles.cardMeta}>
                  <Text style={styles.cardPrice}>{formatCurrency(price)}</Text>
                  
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#fff" style={{ marginRight: 2 }} />
                    <Text style={styles.ratingText}>
                      {rating > 0 ? rating.toFixed(1) : 'New'}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Insight footer */}
      <View style={styles.insightRow}>
        <Ionicons name="location" size={14} color="#7C3AED" />
        <Text style={styles.insightText}>
          Personalized recommendations for your current campus location
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: 250,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardImagePlaceholder: {
    backgroundColor: '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  topBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
    padding: 3,
  },
  vegBox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FCD34D',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#257D3D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  insightText: {
    flex: 1,
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
});

