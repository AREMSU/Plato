import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, truncateText } from '../utils/helpers';
import UserAvatar from './UserAvatar';

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

  return (
    <TouchableOpacity
      style={[styles.card, isSoldOut && styles.cardSoldOut]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* ── Image ── */}
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={44} color="#FFB89A" />
          </View>
        )}

        {/* Top badges */}
        <View style={styles.imageBadgesTop}>
          {isVegetarian && (
            <View style={styles.vegBadge}>
              <Ionicons name="leaf" size={13} color="#fff" />
            </View>
          )}
        </View>

        {/* Portions badge top-right */}
        <View style={[styles.portionsBadge, isSoldOut && { backgroundColor: 'rgba(200,0,0,0.7)' }]}>
          <Ionicons name="layers-outline" size={12} color="#fff" style={{ marginRight: 3 }} />
          <Text style={styles.portionsText}>{isSoldOut ? 'Sold Out' : `${portionsLeft} left`}</Text>
        </View>

        {/* Sold out dim */}
        {isSoldOut && <View style={styles.soldOutOverlay} />}
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        {/* Title + Price */}
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{meal.title}</Text>
          <Text style={styles.price}>{formatCurrency(price)}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>{meal.description}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          {/* Seller */}
          <View style={styles.sellerRow}>
            <UserAvatar uri={sellerAvatar} name={sellerName} size={26} borderWidth={0} />
            <Text style={styles.sellerName} numberOfLines={1}>{sellerName}</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color="#FFC107" />
            <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
          </View>
        </View>

        {/* Meta info row */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={13} color="#757575" />
            <Text style={styles.metaText}>{pickupTime || 'Anytime'}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="navigate-outline" size={13} color="#757575" />
            <Text style={styles.metaText} numberOfLines={1}>
              {truncateText(pickupLocation, 18) || 'Campus'}
            </Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{meal.category}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  cardSoldOut: { opacity: 0.72 },

  // ── Image ──
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 190 },
  imagePlaceholder: {
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBadgesTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  vegBadge: {
    backgroundColor: '#4CAF50',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  portionsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portionsText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // ── Content ──
  content: { padding: 14 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  description: {
    fontSize: 13,
    color: '#757575',
    lineHeight: 19,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 12,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  sellerName: {
    fontSize: 13,
    color: '#424242',
    fontWeight: '600',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#F57F17' },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metaText: {
    fontSize: 11,
    color: '#616161',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  categoryPill: {
    backgroundColor: '#FFF3EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  categoryText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
});