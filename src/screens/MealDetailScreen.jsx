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
import UserAvatar from '../components/UserAvatar';

const { width } = Dimensions.get('window');

const VegSymbol = ({ isVeg }) => (
  <View style={[styles.vegBox, { borderColor: isVeg ? '#0F8A5F' : '#E23744' }]}>
    <View style={[styles.vegDot, { backgroundColor: isVeg ? '#0F8A5F' : '#E23744' }]} />
  </View>
);

export default function MealDetailScreen({ navigation, route }) {
  const { meal } = route.params;
  const { user } = useApp();
  const [portions, setPortions] = useState(1);

  const badge = getReliabilityBadge(meal.sellerRating ?? meal.seller_rating ?? 5.0);
  const price = meal.pricePerPortion || meal.price_per_portion || 0;
  const totalCost = price * portions;
  const isOwner = isMealOwner(user, meal);
  const mealImage = meal?.image || '';
  const sellerAvatar = meal?.sellerAvatar || meal?.seller_avatar || '';
  const sellerName = meal?.sellerName || meal?.seller_name || 'Unknown';
  const sellerId = meal?.seller?.id ?? meal?.sellerId ?? meal?.seller_id ?? meal?.seller ?? null;
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

  const getRatingColor = (r) => {
    if (r >= 4.0) return '#257D3D';
    if (r > 0) return '#E2A93E';
    return '#64748B';
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Parallax Image Header */}
        <View style={styles.imageContainer}>
          {mealImage ? (
            <Image source={{ uri: mealImage }} style={styles.mealImage} />
          ) : (
            <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={64} color="#FC8019" />
            </View>
          )}
          
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)']}
            style={styles.imageOverlay}
          />
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.categoryFloatingBadge}>
            <Text style={styles.categoryFloatingBadgeText}>{meal.category}</Text>
          </View>
        </View>

        {/* Details Card Overlapping the image */}
        <View style={styles.content}>
          {/* Main Info Header Card */}
          <View style={styles.titleCard}>
            <View style={styles.vegBadgeRow}>
              <VegSymbol isVeg={meal.isVegetarian ?? meal.is_vegetarian ?? false} />
              <Text style={styles.vegText}>{meal.isVegetarian ?? meal.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}</Text>
            </View>
            
            <Text style={styles.mealTitle}>{meal.title}</Text>
            <Text style={styles.priceText}>{formatCurrency(price)} <Text style={styles.perPortion}>per portion</Text></Text>

            <View style={styles.divider} />

            <View style={styles.ratingInfoRow}>
              <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(meal.rating) }]}>
                <Ionicons name="star" size={12} color="#fff" style={{ marginRight: 2 }} />
                <Text style={styles.ratingBadgeText}>{meal.rating > 0 ? meal.rating.toFixed(1) : 'New'}</Text>
              </View>
              <Text style={styles.reviewsText}>
                {meal.reviews > 0 ? `(${meal.reviews} reviews)` : 'No reviews yet'}
              </Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.portionsRemainingText}>
                {portionsLeft > 0 ? `${portionsLeft} portions left` : 'Sold out'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this meal</Text>
            <Text style={styles.descriptionText}>{meal.description}</Text>
            {meal.tags && meal.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {meal.tags.map((tag) => (
                  <View key={tag} style={styles.tagBadge}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Details list card */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>Pickup Instructions</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFF3EE' }]}>
                <Ionicons name="time" size={16} color="#FC8019" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Time Slot</Text>
                <Text style={styles.infoValue}>{meal.pickupTime ?? meal.pickup_time}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#E2F0FF' }]}>
                <Ionicons name="location" size={16} color="#0066cc" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Pickup Hub</Text>
                <Text style={styles.infoValue}>{meal.pickupLocation ?? meal.pickup_location}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="calendar" size={16} color="#7C3AED" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Meal Date</Text>
                <Text style={styles.infoValue}>{formatDate(meal.mealDate ?? meal.meal_date)}</Text>
              </View>
            </View>
          </View>

          {/* Cook profile card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Home Chef Details</Text>
            <TouchableOpacity
              style={styles.sellerCard}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('CookProfile', {
                  sellerId,
                  sellerName,
                  sellerAvatar,
                  sellerRating,
                })
              }
            >
              <UserAvatar uri={sellerAvatar} name={sellerName} size={48} borderWidth={0} />
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{sellerName}</Text>
                <View style={styles.sellerSubRow}>
                  <View style={[styles.badge, { backgroundColor: badge.color + '15' }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <View style={styles.chefRatingRow}>
                    <Ionicons name="star" size={12} color="#E2A93E" />
                    <Text style={styles.chefRatingText}>{sellerRating > 0 ? sellerRating.toFixed(1) : '5.0'}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Portion Selector */}
          {!isOwner && portionsLeft > 0 && (
            <View style={styles.portionSection}>
              <Text style={styles.sectionTitle}>Select Portions</Text>
              <View style={styles.portionContainer}>
                <View style={styles.portionControlRow}>
                  <TouchableOpacity
                    onPress={decrementPortions}
                    style={[styles.portionBtn, portions === 1 && styles.portionBtnDisabled]}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="remove" size={20} color={portions === 1 ? '#94A3B8' : '#FC8019'} />
                  </TouchableOpacity>
                  
                  <Text style={styles.portionCountText}>{portions}</Text>
                  
                  <TouchableOpacity
                    onPress={incrementPortions}
                    style={[styles.portionBtn, portions >= portionsLeft && styles.portionBtnDisabled]}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="add" size={20} color={portions >= portionsLeft ? '#94A3B8' : '#FC8019'} />
                  </TouchableOpacity>
                </View>

                <View style={styles.portionTotalContainer}>
                  <Text style={styles.portionTotalLabel}>Total Amount</Text>
                  <Text style={styles.portionTotalValue}>{formatCurrency(totalCost)}</Text>
                </View>
              </View>
            </View>
          )}

          {isOwner && (
            <View style={styles.ownerNotice}>
              <Ionicons name="information-circle-outline" size={20} color="#FC8019" />
              <Text style={styles.ownerNoticeText}>You listed this meal. You can manage bookings in your Profile tab.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Checkout Bar */}
      {!isOwner && (
        <View style={styles.bottomBar}>
          <View style={styles.priceSummary}>
            <Text style={styles.bottomTotalLabel}>Total Price</Text>
            <Text style={styles.bottomTotalPrice}>{formatCurrency(totalCost)}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.bookBtn, portionsLeft === 0 && styles.bookBtnDisabled]}
            onPress={handleBook}
            disabled={portionsLeft === 0}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={portionsLeft === 0 ? ['#94A3B8', '#64748B'] : ['#FC8019', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bookGradient}
            >
              <Text style={styles.bookBtnText}>
                {portionsLeft === 0 ? 'SOLD OUT' : 'Proceed to Book'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    width: width,
    height: 280,
  },
  mealImage: {
    width: '100%',
    height: '100%',
  },
  mealImagePlaceholder: {
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 44,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryFloatingBadge: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  categoryFloatingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FC8019',
    textTransform: 'uppercase',
  },
  content: {
    marginTop: -28,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  titleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  vegBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  vegText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 6,
  },
  mealTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FC8019',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  perPortion: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  ratingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  reviewsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  dotSeparator: {
    marginHorizontal: 8,
    color: '#CBD5E1',
  },
  portionsRemainingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F8A5F',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  detailsCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sellerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sellerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  chefRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  chefRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  portionSection: {
    marginBottom: 20,
  },
  portionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  portionControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FC8019',
    borderRadius: 10,
    padding: 4,
    backgroundColor: '#ffffff',
  },
  portionBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionBtnDisabled: {
    opacity: 0.4,
  },
  portionCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FC8019',
    paddingHorizontal: 12,
  },
  portionTotalContainer: {
    alignItems: 'flex-end',
  },
  portionTotalLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  portionTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  ownerNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF3EE',
    borderWidth: 1,
    borderColor: '#FFD5C2',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  ownerNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    lineHeight: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  priceSummary: {
    justifyContent: 'center',
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bottomTotalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  bookBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FC8019',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  bookBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  bookGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  bookBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
