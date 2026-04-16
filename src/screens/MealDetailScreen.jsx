import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  getReliabilityBadge,
  formatDate,
} from '../utils/helpers';
import RatingStars from '../components/RatingStars';

const { width } = Dimensions.get('window');

export default function MealDetailScreen({ navigation, route }) {
  const { meal } = route.params;
  const { user, bookMeal } = useApp();
  const [portions, setPortions] = useState(1);

  const badge = getReliabilityBadge(meal.sellerRating);
  const totalCost = meal.pricePerPortion * portions;
  const isOwner = user?.id === meal.sellerId;

  const incrementPortions = () => {
    if (portions < meal.availablePortions)
      setPortions(portions + 1);
  };

  const decrementPortions = () => {
    if (portions > 1) setPortions(portions - 1);
  };

  const handleBook = () => {
    if (isOwner) {
      Alert.alert('Oops!', "You can't book your own meal.");
      return;
    }
    if (meal.availablePortions === 0) {
      Alert.alert('Sold Out', 'No portions available.');
      return;
    }
    navigation.navigate('Booking', { meal, portions });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: meal.image }}
            style={styles.mealImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.imageOverlay}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.imageBadges}>
            {meal.isVegetarian && (
              <View style={styles.vegBadge}>
                <Text style={styles.vegBadgeText}>🌱 Veg</Text>
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {meal.category}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text style={styles.mealTitle}>{meal.title}</Text>
              <View style={styles.ratingRow}>
                <RatingStars rating={meal.rating} size={16} />
                <Text style={styles.ratingText}>
                  {meal.rating} ({meal.reviews} reviews)
                </Text>
              </View>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>per portion</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(meal.pricePerPortion)}
              </Text>
            </View>
          </View>

          {/* Nutrition */}
          <View style={styles.nutritionRow}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionEmoji}>🔥</Text>
              <Text style={styles.nutritionValue}>
                {meal.calories}
              </Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionEmoji}>💪</Text>
              <Text style={styles.nutritionValue}>
                {meal.protein}g
              </Text>
              <Text style={styles.nutritionLabel}>protein</Text>
            </View>
            <View style={styles.nutritionDivider} />
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionEmoji}>🍽️</Text>
              <Text style={styles.nutritionValue}>
                {meal.availablePortions}
              </Text>
              <Text style={styles.nutritionLabel}>left</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>About This Meal</Text>
          <Text style={styles.description}>{meal.description}</Text>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {meal.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Meal Info */}
          <Text style={styles.sectionTitle}>Meal Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBox, { backgroundColor: '#FF6B3520' }]}>
                <Text style={styles.infoIcon}>⏰</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Pickup Time</Text>
                <Text style={styles.infoValue}>
                  {meal.pickupTime}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBox, { backgroundColor: '#2196F320' }]}>
                <Text style={styles.infoIcon}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>
                  Pickup Location
                </Text>
                <Text style={styles.infoValue}>
                  {meal.pickupLocation}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBox, { backgroundColor: '#9C27B020' }]}>
                <Text style={styles.infoIcon}>📅</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Meal Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(meal.mealDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* Seller Info */}
          <Text style={styles.sectionTitle}>About the Cook</Text>
          <View style={styles.sellerCard}>
            <Image
              source={{ uri: meal.sellerAvatar }}
              style={styles.sellerAvatar}
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>
                {meal.sellerName}
              </Text>
              <View style={styles.sellerMeta}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: badge.color + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: badge.color },
                    ]}
                  >
                    {badge.label}
                  </Text>
                </View>
                <Text style={styles.sellerRatingText}>
                  ★ {meal.sellerRating}
                </Text>
              </View>
            </View>
          </View>

          {/* Portion Selector */}
          {!isOwner && meal.availablePortions > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                Select Portions
              </Text>
              <View style={styles.portionSelector}>
                <TouchableOpacity
                  onPress={decrementPortions}
                  style={[
                    styles.portionBtn,
                    portions === 1 && styles.portionBtnDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.portionBtnText,
                      portions === 1 && styles.portionBtnTextDisabled,
                    ]}
                  >
                    −
                  </Text>
                </TouchableOpacity>
                <View style={styles.portionCount}>
                  <Text style={styles.portionNumber}>
                    {portions}
                  </Text>
                  <Text style={styles.portionLabel}>
                    portion{portions > 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={incrementPortions}
                  style={[
                    styles.portionBtn,
                    portions >= meal.availablePortions &&
                      styles.portionBtnDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.portionBtnText,
                      portions >= meal.availablePortions &&
                        styles.portionBtnTextDisabled,
                    ]}
                  >
                    ＋
                  </Text>
                </TouchableOpacity>
                <View style={styles.portionTotal}>
                  <Text style={styles.portionTotalLabel}>
                    Total
                  </Text>
                  <Text style={styles.portionTotalValue}>
                    {formatCurrency(totalCost)}
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      {!isOwner ? (
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomLabel}>Total Cost</Text>
            <Text style={styles.bottomPrice}>
              {formatCurrency(totalCost)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.bookButton,
              meal.availablePortions === 0 &&
                styles.bookButtonDisabled,
            ]}
            onPress={handleBook}
            disabled={meal.availablePortions === 0}
          >
            <LinearGradient
              colors={
                meal.availablePortions === 0
                  ? ['#BDBDBD', '#9E9E9E']
                  : ['#FF6B35', '#FF8C42']
              }
              style={styles.bookGradient}
            >
              <Text style={styles.bookText}>
                {meal.availablePortions === 0
                  ? 'Sold Out'
                  : 'Book Now'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomBar}>
          <View style={styles.ownerNote}>
            <Text style={styles.ownerNoteText}>
              ℹ️ This is your meal listing
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  imageContainer: { position: 'relative' },
  mealImage: { width, height: 280, resizeMode: 'cover' },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  imageBadges: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  vegBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  vegBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryBadgeText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContent: { flex: 1, marginRight: 12 },
  mealTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  priceBox: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
  },
  nutritionRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE8DC',
  },
  nutritionItem: { flex: 1, alignItems: 'center' },
  nutritionEmoji: { fontSize: 20, marginBottom: 4 },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  nutritionLabel: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 2,
    fontWeight: '500',
  },
  nutritionDivider: {
    width: 1,
    backgroundColor: '#FFE8DC',
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    color: '#616161',
    lineHeight: 23,
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  tag: {
    backgroundColor: '#FFF3EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD5C2',
  },
  tagText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: { fontSize: 18 },
  infoLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '700',
    marginTop: 1,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sellerAvatar: { width: 52, height: 52, borderRadius: 26 },
  sellerInfo: { flex: 1 },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  sellerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sellerRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFC107',
  },
  portionSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 22,
  },
  portionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    elevation: 2,
  },
  portionBtnDisabled: { borderColor: '#E0E0E0' },
  portionBtnText: {
    fontSize: 24,
    color: '#FF6B35',
    fontWeight: '700',
    lineHeight: 28,
  },
  portionBtnTextDisabled: { color: '#BDBDBD' },
  portionCount: { alignItems: 'center', flex: 1 },
  portionNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B35',
  },
  portionLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  portionTotal: { alignItems: 'flex-end' },
  portionTotalLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  portionTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
  },
  bottomInfo: { flex: 1 },
  bottomLabel: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  bookButton: { borderRadius: 16, overflow: 'hidden' },
  bookButtonDisabled: { opacity: 0.7 },
  bookGradient: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 16,
  },
  bookText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ownerNote: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerNoteText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
  },
});