import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/helpers';

export default function BookingCard({ booking, onCancel }) {
  const isConfirmed = booking.status === 'confirmed';
  const bookingImage = booking?.meal?.image || '';
  return (
    <View style={[styles.card, !isConfirmed && styles.cancelledCard]}>
      {bookingImage ? (
        <Image source={{ uri: bookingImage }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={24} color="#FF6B35" />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {booking.meal?.title ?? 'Meal no longer available'}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: isConfirmed ? '#E8F5E9' : '#FFEBEE' }]}>
            <Text style={[styles.statusText, { color: isConfirmed ? '#4CAF50' : '#FF5252' }]}>
              {isConfirmed ? 'Confirmed' : 'Cancelled'}
            </Text>
          </View>
        </View>
        <Text style={styles.portions}>
          {booking.portions} portion{booking.portions > 1 ? 's' : ''} •{' '}
          <Text style={styles.price}>{formatCurrency(booking.totalCost)}</Text>
        </Text>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color="#9E9E9E" style={{ marginRight: 4 }} />
          <Text style={styles.meta}>{booking.meal?.pickupTime ?? '—'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={12} color="#9E9E9E" style={{ marginRight: 4 }} />
          <Text style={styles.meta} numberOfLines={1}>
            {booking.meal?.pickupLocation ?? '—'}
          </Text>
        </View>
        {isConfirmed && onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => onCancel(booking)}>
            <Text style={styles.cancelText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row',
    overflow: 'hidden', marginBottom: 14, elevation: 3,
  },
  cancelledCard: { opacity: 0.65 },
  image: { width: 95, height: 115, resizeMode: 'cover' },
  imagePlaceholder: {
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: { fontSize: 24 },
  content: { flex: 1, padding: 12 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 5, gap: 6,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  portions: { fontSize: 13, color: '#757575', marginBottom: 6 },
  price: { color: '#FF6B35', fontWeight: '700' },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  meta: { fontSize: 12, color: '#9E9E9E' },
  cancelButton: {
    borderWidth: 1.5, borderColor: '#FF5252', borderRadius: 10,
    paddingVertical: 6, alignItems: 'center', marginTop: 6,
  },
  cancelText: { fontSize: 12, color: '#FF5252', fontWeight: '700' },
});
