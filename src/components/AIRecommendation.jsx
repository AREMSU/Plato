import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';

export default function AIRecommendation({ navigation }) {
  const { getAIRecommendations } = useApp();
  const recommended = getAIRecommendations();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient colors={['#9C27B0', '#673AB7']} style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>⚡ AI Picks</Text>
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
            <Image source={{ uri: meal.image }} style={styles.cardImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.cardOverlay}
            />
            {meal.isVegetarian && (
              <View style={styles.vegBadge}>
                <Text style={styles.vegText}>🌱</Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>{meal.title}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardPrice}>{formatCurrency(meal.pricePerPortion)}</Text>
                <Text style={styles.cardRating}>★ {meal.rating}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.nudgeBox}>
        <Text style={styles.nudgeEmoji}>💡</Text>
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
  aiBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  aiBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  card: {
    width: 180, height: 200, borderRadius: 18, overflow: 'hidden',
    elevation: 4, position: 'relative',
  },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%' },
  vegBadge: {
    position: 'absolute', top: 10, right: 10, backgroundColor: '#4CAF50',
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  vegText: { fontSize: 14 },
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
  nudgeEmoji: { fontSize: 20 },
  nudgeText: { flex: 1, fontSize: 13, color: '#6A1B9A', lineHeight: 20, fontWeight: '500' },
});
