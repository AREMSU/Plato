import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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

  return (
    <TouchableOpacity
      style={[styles.card, isSoldOut && styles.cardSoldOut]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={40} color="#FF6B35" />
          </View>
        )}
        {isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
        {isVegetarian && (
          <View style={styles.vegBadge}>
            <Ionicons name="leaf" size={14} color="#fff" />
          </View>
        )}
        <View style={styles.portionsBadge}>
          <Ionicons name="restaurant-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.portionsText}>{portionsLeft} left</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{meal.title}</Text>
          <Text style={styles.price}>{formatCurrency(price)}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>{meal.description}</Text>
        <View style={styles.metaRow}>
          <View style={styles.sellerRow}>
            <UserAvatar uri={sellerAvatar} name={sellerName} size={24} borderWidth={0} />
            <Text style={styles.sellerName} numberOfLines={1}>{sellerName}</Text>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={styles.rating}>{meal.rating || 0}</Text>
          </View>
        </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#9E9E9E" style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{pickupTime}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#9E9E9E" style={{ marginRight: 4 }} />
            <Text style={styles.metaText} numberOfLines={1}>
              {truncateText(pickupLocation, 20)}
            </Text>
          </View>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{meal.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 16,
    elevation: 4, overflow: 'hidden',
  },
  cardSoldOut: { opacity: 0.75 },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 180 },
  imagePlaceholder: {
    backgroundColor: '#FFF3EE',
    justifyContent: 'center', alignItems: 'center',
  },
  imagePlaceholderText: { fontSize: 48 },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  soldOutText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  vegBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#4CAF50', width: 32, height: 32,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  vegText: { fontSize: 16 },
  portionsBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center'
  },
  portionsText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  content: { padding: 16 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginRight: 10 },
  price: { fontSize: 16, fontWeight: '800', color: '#FF6B35' },
  description: { fontSize: 13, color: '#757575', lineHeight: 20, marginBottom: 12 },
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  sellerName: { fontSize: 13, color: '#424242', fontWeight: '600', flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingStar: { color: '#FFC107', fontSize: 14 },
  rating: { fontSize: 13, fontWeight: '700', color: '#212121' },
  bottomRow: { flexDirection: 'row', gap: 14, marginBottom: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#9E9E9E', fontWeight: '500' },
  categoryTag: {
    alignSelf: 'flex-start', backgroundColor: '#FFF3EE',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: '#FFD5C2',
  },
  categoryText: { fontSize: 12, color: '#FF6B35', fontWeight: '700' },
});