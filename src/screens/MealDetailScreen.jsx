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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  getReliabilityBadge,
  formatDate,
  isMealOwner,
} from '../utils/helpers';
import RatingStars from '../components/RatingStars';
import UserAvatar from '../components/UserAvatar';

const { width } = Dimensions.get('window');

export default function MealDetailScreen({ navigation, route }) {
  const { meal } = route.params;
  const { user } = useApp();
  const [portions, setPortions] = useState(1);

  const badge = getReliabilityBadge(meal.sellerRating);
  const price = meal.pricePerPortion || meal.price_per_portion || 0;
  const totalCost = price * portions;
  const isOwner = isMealOwner(user, meal);
  const mealImage = meal?.image || '';
  const sellerAvatar = meal?.sellerAvatar || meal?.seller_avatar || '';
  const sellerName = meal?.sellerName || meal?.seller_name || 'Unknown';
  const sellerId = meal?.sellerId || meal?.seller_id || null;
  const sellerRating = meal?.sellerRating || meal?.seller_rating || 0;
  const portionsLeft = meal?.availablePortions ?? meal?.available_portions ?? 0;

  const incrementPortions = () => {
    if (portions < portionsLeft)
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
    if (portionsLeft === 0) {
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
          {mealImage ? (
            <Image source={{ uri: mealImage }} style={styles.mealImage} />
          ) : (
            <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={48} color="#FF6B35" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.85)']}
            style={styles.imageOverlay}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.imageBadges}>
            {meal.isVegetarian && (
              <View style={styles.vegBadge}>
                <Ionicons name="leaf" size={12} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.vegBadgeText}>Veg</Text>
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
                {formatCurrency(price)}
              </Text>
            </View>
          </View>

          {/* Portions left chip */}
          <View style={styles.portionsChipRow}>
            <View style={styles.portionsChip}>
              <Ionicons name="layers-outline" size={14} color="#FF6B35" />
              <Text style={styles.portionsChipText}>
                {portionsLeft > 0 ? `${portionsLeft} portions left` : 'Sold out'}
              </Text>
            </View>
            {meal.isVegetarian && (
              <View style={styles.vegChip}>
                <Ionicons name="leaf" size={13} color="#4CAF50" />
                <Text style={styles.vegChipText}>Vegetarian</Text>
              </View>
            )}
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
              <View style={[styles.infoIconBox, { backgroundColor: '#FF6B3515' }]}>
                <Ionicons name="time-outline" size={18} color="#FF6B35" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Pickup Time</Text>
                <Text style={styles.infoValue}>
                  {meal.pickupTime}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBox, { backgroundColor: '#2196F315' }]}>
                <Ionicons name="location-outline" size={18} color="#2196F3" />
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
              <View style={[styles.infoIconBox, { backgroundColor: '#9C27B015' }]}>
                <Ionicons name="calendar-outline" size={18} color="#9C27B0" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Meal Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(meal.mealDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* Seller Info — tappable */}
          <Text style={styles.sectionTitle}>About the Cook</Text>
          <TouchableOpacity
            style={styles.sellerCard}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('CookProfile', {
                sellerId,
                sellerName,
                sellerAvatar,
                sellerRating,
              })
            }
          >
            <UserAvatar uri={sellerAvatar} name={sellerName} size={52} borderWidth={0} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerNameText}>{sellerName}</Text>
              <View style={styles.sellerMeta}>
                <View style={[styles.badge, { backgroundColor: badge.color + '15' }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>
                    {badge.label}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="star" size={13} color="#FFB300" />
                  <Text style={styles.sellerRatingText}>{sellerRating}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
          </TouchableOpacity>

          {/* Portion Selector — only for non-owners */}
          {!isOwner && portionsLeft > 0 && (
            <>
              <Text style={styles.sectionTitle}>Select Portions</Text>
              <View style={styles.portionSelector}>
                <TouchableOpacity
                  onPress={decrementPortions}
                  style={[styles.portionBtn, portions === 1 && styles.portionBtnDisabled]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="remove-outline"
                    size={22}
                    color={portions === 1 ? '#BDBDBD' : '#FF6B35'}
                  />
                </TouchableOpacity>
                <View style={styles.portionCount}>
                  <Text style={styles.portionNumber}>{portions}</Text>
                  <Text style={styles.portionLabel}>portion{portions > 1 ? 's' : ''}</Text>
                </View>
                <TouchableOpacity
                  onPress={incrementPortions}
                  style={[styles.portionBtn, portions >= portionsLeft && styles.portionBtnDisabled]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add-outline"
                    size={22}
                    color={portions >= portionsLeft ? '#BDBDBD' : '#FF6B35'}
                  />
                </TouchableOpacity>
                <View style={styles.portionTotal}>
                  <Text style={styles.portionTotalLabel}>Total</Text>
                  <Text style={styles.portionTotalValue}>{formatCurrency(totalCost)}</Text>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar — hide Book Now for owner */}
      {!isOwner && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomLabel}>Total Cost</Text>
            <Text style={styles.bottomPrice}>{formatCurrency(totalCost)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.bookButton, portionsLeft === 0 && styles.bookButtonDisabled]}
            onPress={handleBook}
            disabled={portionsLeft === 0}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={portionsLeft === 0 ? ['#BDBDBD', '#9E9E9E'] : ['#FF6B35', '#FF8C42']}
              style={styles.bookGradient}
            >
              <Text style={styles.bookText}>
                {portionsLeft === 0 ? 'Sold Out' : 'Book Now'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  imageContainer: { position: 'relative' },
  mealImage: { width, height: 280, resizeMode: 'cover' },
  mealImagePlaceholder: {
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vegBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryBadgeText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  content: {
    backgroundColor: '#FAF9F6',
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
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
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
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  priceValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  // Portions chip
  portionsChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  portionsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3EE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD5C2',
  },
  portionsChipText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  vegChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  vegChipText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  description: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 23,
    marginBottom: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
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
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F0EFEA',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
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
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  infoValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F0EFEA',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sellerInfo: { flex: 1 },
  sellerNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
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
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  sellerRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  portionSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F0EFEA',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 22,
  },
  portionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  portionBtnDisabled: {
    borderColor: '#E2E8F0',
    elevation: 0,
  },
  portionCount: { alignItems: 'center', flex: 1 },
  portionNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  portionLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  portionTotal: { alignItems: 'flex-end' },
  portionTotalLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  portionTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
    borderTopWidth: 1,
    borderTopColor: '#F0EFEA',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomInfo: { flex: 1 },
  bottomLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
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
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  ownerNote: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerNoteText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
});