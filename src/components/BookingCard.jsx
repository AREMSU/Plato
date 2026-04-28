import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { formatCurrency } from '../utils/helpers';

export default function BookingCard({ booking, onCancel }) {
  const isConfirmed = booking.status === 'confirmed';
  return (
    <View style={[styles.card, !isConfirmed && styles.cancelledCard]}>
      <Image source={{ uri: booking.meal.image }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {booking.meal.title}
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
        <Text style={styles.meta}>⏰ {booking.meal.pickupTime}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          📍 {booking.meal.pickupLocation}
        </Text>
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
  meta: { fontSize: 12, color: '#9E9E9E', marginBottom: 4 },
  cancelButton: {
    borderWidth: 1.5, borderColor: '#FF5252', borderRadius: 10,
    paddingVertical: 6, alignItems: 'center', marginTop: 6,
  },
  cancelText: { fontSize: 12, color: '#FF5252', fontWeight: '700' },
});
