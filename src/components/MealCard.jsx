import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, truncateText } from '../utils/helpers';
import UserAvatar from './UserAvatar';

const VegSymbol = ({ isVeg }) => (
  <View style={[styles.vegBox, { borderColor: isVeg ? '#0F8A5F' : '#E23744' }]}>
    <View style={[styles.vegDot, { backgroundColor: isVeg ? '#0F8A5F' : '#E23744' }]} />
  </View>
);

export default function MealCard({ meal, onPress }) {
  const portionsLeft = meal.available_portions ?? meal.availablePortions ?? 0;
  const isSoldOut = portionsLeft === 0;
  const image = meal.image || null;
  const sellerAvatar = meal.seller_avatar || meal.sellerAvatar || null;
  const sellerName = meal.seller_name || meal.sellerName || 'Unknown';
  const price = meal.price_per_portion || meal.pricePerPortion || 0;
  const pickupTime = meal.pickup_time || meal.pickupTime || '';
  const pickupLocation = meal.pickup_location || meal.pickupLocation || '';
  const isVegetarian = meal.is_vegetarian ?? meal.isVegetarian ?? false;
  const rating = meal.rating || 0;
  const isFeatured = meal.is_featured ?? meal.isFeatured ?? false;

  const getRatingColor = (r) => {
    if (r >= 4.0) return '#257D3D';
    if (r > 0) return '#E2A93E';
    return '#64748B';
  };

  return (
    <TouchableOpacity
      style={[styles.card, isSoldOut && styles.cardSoldOut]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* ── Left Side Details ── */}
      <View style={styles.detailsContainer}>
        {/* Top Indicators */}
        <View style={styles.badgeRow}>
          <VegSymbol isVeg={isVegetarian} />
          {isFeatured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.featuredText}>Bestseller</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>{meal.title}</Text>

        {/* Rating and Delivery time row */}
        <View style={styles.metaRow}>
          <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(rating) }]}>
            <Ionicons name="star" size={10} color="#fff" style={{ marginRight: 2 }} />
            <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
          </View>
          <Text style={styles.metaBullet}>•</Text>
          <Text style={styles.metaText} numberOfLines={1}>{pickupTime || 'Anytime'}</Text>
        </View>

        {/* Price */}
        <Text style={styles.price}>{formatCurrency(price)}</Text>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {meal.description}
        </Text>

        {/* Seller Info */}
        <View style={styles.sellerRow}>
          <UserAvatar uri={sellerAvatar} name={sellerName} size={20} borderWidth={0} />
          <Text style={styles.sellerName} numberOfLines={1}>
            By {sellerName} · {truncateText(pickupLocation, 14)}
          </Text>
        </View>
      </View>

      {/* ── Right Side Image & Portions Overlay ── */}
      <View style={styles.imageWrapper}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={32} color="#CBD5E1" />
          </View>
        )}

        {/* Custom Portions Overlay positioned like Swiggy "ADD" button */}
        <View style={[styles.portionsPill, isSoldOut && styles.portionsPillSoldOut]}>
          <Text style={[styles.portionsPillText, isSoldOut && styles.portionsPillTextSoldOut]}>
            {isSoldOut ? 'SOLD OUT' : `${portionsLeft} LEFT`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardSoldOut: {
    opacity: 0.8,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
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
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FC8019',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  featuredText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  metaBullet: {
    color: '#94A3B8',
    fontSize: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    maxWidth: 120,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sellerName: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },

  // Image styles
  imageWrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  image: {
    width: 104,
    height: 104,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  portionsPill: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#FC8019',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    minWidth: 76,
    alignItems: 'center',
    shadowColor: '#FC8019',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  portionsPillSoldOut: {
    borderColor: '#94A3B8',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  portionsPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FC8019',
  },
  portionsPillTextSoldOut: {
    color: '#64748B',
  },
});