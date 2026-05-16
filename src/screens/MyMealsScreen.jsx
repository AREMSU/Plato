import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  calculateCancellationFee,
  getRefundAmount,
} from '../utils/helpers';

export default function MyMealsScreen({ navigation }) {
  const { bookings, cancelBooking, user, meals } = useApp();
  const [activeTab, setActiveTab] = useState('bookings');

  const myMeals = meals.filter((m) => m.sellerId === user?.id);
  const activeBookings = bookings.filter(
    (b) => b.status === 'confirmed'
  );
  const cancelledBookings = bookings.filter(
    (b) => b.status === 'cancelled'
  );

  const handleCancel = (booking) => {
    const fee = calculateCancellationFee(booking.totalCost);
    const refund = getRefundAmount(booking.totalCost);
    Alert.alert(
      'Cancel Booking?',
      `Fee: ${formatCurrency(fee)} (30%)\nRefund: ${formatCurrency(refund)}`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            cancelBooking(booking.id);
            Alert.alert(
              'Cancelled',
              `Refund of ${formatCurrency(refund)} will be processed.`
            );
          },
        },
      ]
    );
  };

  const BookingCard = ({ booking }) => (
    <View
      style={[
        styles.bookingCard,
        booking.status === 'cancelled' && styles.cancelledCard,
      ]}
    >
      <Image
        source={{ uri: booking.meal.image }}
        style={styles.bookingImage}
      />
      <View style={styles.bookingInfo}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingTitle} numberOfLines={1}>
            {booking.meal.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  booking.status === 'confirmed'
                    ? '#4CAF5020'
                    : '#FF525220',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    booking.status === 'confirmed'
                      ? '#4CAF50'
                      : '#FF5252',
                },
              ]}
            >
              {booking.status === 'confirmed'
                ? '✓ Confirmed'
                : '✗ Cancelled'}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingMeta}>
          {booking.portions} portion
          {booking.portions > 1 ? 's' : ''} •{' '}
          {formatCurrency(booking.totalCost)}
        </Text>
        <Text style={styles.bookingDetail}>
          ⏰ {booking.meal.pickupTime}
        </Text>
        <Text style={styles.bookingDetail} numberOfLines={1}>
          📍 {booking.meal.pickupLocation}
        </Text>
        {booking.status === 'confirmed' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancel(booking)}
          >
            <Text style={styles.cancelButtonText}>
              Cancel Booking
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const MyMealCard = ({ meal }) => (
    <TouchableOpacity
      style={styles.myMealCard}
      onPress={() => navigation.navigate('MealDetail', { meal })}
    >
      <Image
        source={{ uri: meal.image }}
        style={styles.myMealImage}
      />
      <View style={styles.myMealInfo}>
        <Text style={styles.myMealTitle} numberOfLines={1}>
          {meal.title}
        </Text>
        <Text style={styles.myMealPrice}>
          {formatCurrency(meal.pricePerPortion)} / portion
        </Text>
        <View style={styles.myMealStats}>
          <Text style={styles.myMealStat}>
            👥 {meal.bookings} booked
          </Text>
          <Text style={styles.myMealStat}>
            🍽️ {meal.availablePortions} left
          </Text>
        </View>
      </View>
      <Text style={styles.arrowText}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>My Meals</Text>
        <Text style={styles.headerSubtitle}>
          Manage your bookings and listings
        </Text>
      </LinearGradient>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'bookings' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('bookings')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'bookings' && styles.tabTextActive,
            ]}
          >
            My Bookings ({activeBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'listings' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('listings')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'listings' && styles.tabTextActive,
            ]}
          >
            My Listings ({myMeals.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'bookings' ? (
          <>
            {bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>
                  No bookings yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  Explore meals and make your first booking!
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Explore')}
                >
                  <LinearGradient
                    colors={['#FF6B35', '#FF8C42']}
                    style={styles.actionGradient}
                  >
                    <Text style={styles.actionText}>
                      Explore Meals
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {activeBookings.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>
                      Active Bookings
                    </Text>
                    {activeBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} />
                    ))}
                  </>
                )}
                {cancelledBookings.length > 0 && (
                  <>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { marginTop: 16 },
                      ]}
                    >
                      Cancelled
                    </Text>
                    {cancelledBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {myMeals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🍳</Text>
                <Text style={styles.emptyTitle}>
                  No meals listed yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  Share your cooking with the community!
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Add')}
                >
                  <LinearGradient
                    colors={['#FF6B35', '#FF8C42']}
                    style={styles.actionGradient}
                  >
                    <Text style={styles.actionText}>
                      Add a Meal
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>
                  Your Meal Listings
                </Text>
                {myMeals.map((meal) => (
                  <MyMealCard key={meal.id} meal={meal} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#FF6B35' },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  tabTextActive: { color: '#FF6B35' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 3,
  },
  cancelledCard: { opacity: 0.7 },
  bookingImage: {
    width: 100,
    minHeight: 120,
    resizeMode: 'cover',
  },
  bookingInfo: { flex: 1, padding: 14 },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  bookingTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  bookingMeta: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 8,
  },
  bookingDetail: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: '#FF5252',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#FF5252',
    fontWeight: '700',
  },
  myMealCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    gap: 12,
  },
  myMealImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  myMealInfo: { flex: 1 },
  myMealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  myMealPrice: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 6,
  },
  myMealStats: { flexDirection: 'row', gap: 14 },
  myMealStat: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  arrowText: { fontSize: 22, color: '#BDBDBD' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actionButton: { borderRadius: 14, overflow: 'hidden' },
  actionGradient: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});