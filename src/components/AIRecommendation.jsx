import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';

export default function AIRecommendation({ navigation }) {
  const { getAIRecommendations } = useApp();
  const recommended = getAIRecommendations();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient colors={['#9C27B0', '#673AB7']} style={styles.aiBadge}>
          <Ionicons name="flash" size={12} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.aiBadgeText}>AI Picks</Text>
        </LinearGradient>
        <Text style={styles.title}>Recommended for You</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommended.map((meal) => (
          <TouchableOpacity
            key={meal.id}
            style={styles.card}
            onPress={() => navigation.navigate('MealDetail', { meal })}
            activeOpacity={0.9}
          >
            {meal?.image ? (
              <Image source={{ uri: meal.image }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="restaurant-outline" size={36} color="#E1BEE7" />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.cardOverlay}
            />
            {meal.isVegetarian && (
              <View style={styles.vegBadge}>
                <Ionicons name="leaf" size={14} color="#fff" />
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>{meal.title}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardPrice}>{formatCurrency(meal.pricePerPortion)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star" size={12} color="#FFD700" style={{ marginRight: 2 }} />
                  <Text style={styles.cardRating}>{meal.rating}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.nudgeBox}>
        <Ionicons name="bulb-outline" size={20} color="#6A1B9A" />
        <Text style={styles.nudgeText}>
          Based on your campus location and preferences, these meals are perfect for you today!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, gap: 10 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  aiBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  card: {
    width: 180, height: 200, borderRadius: 18, overflow: 'hidden',
    elevation: 4, position: 'relative',
  },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
  cardImagePlaceholder: {
    backgroundColor: '#2E1C3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImagePlaceholderText: { fontSize: 36, color: '#fff' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%' },
  vegBadge: {
    position: 'absolute', top: 10, right: 10, backgroundColor: '#4CAF50',
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  cardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#FFD700' },
  cardRating: { fontSize: 12, fontWeight: '700', color: '#fff' },
  nudgeBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F3E5F5',
    marginHorizontal: 16, marginTop: 14, borderRadius: 14, padding: 14,
    gap: 10, borderWidth: 1, borderColor: '#E1BEE7',
  },
  nudgeText: { flex: 1, fontSize: 13, color: '#6A1B9A', lineHeight: 20, fontWeight: '500' },
});
