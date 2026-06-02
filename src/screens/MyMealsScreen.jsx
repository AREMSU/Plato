import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  calculateCancellationFee,
  getRefundAmount,
  isMealOwner,
} from '../utils/helpers';

export default function MyMealsScreen({ navigation, route }) {
  const { bookings, cancelBooking, user, meals, createReview } = useApp();
  const [activeTab, setActiveTab] = useState('bookings');
    useEffect(() => {
      const nextTab = route?.params?.initialTab;
      if (nextTab) {
        setActiveTab(nextTab);
      }
    }, [route?.params?.initialTab]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const myMeals = meals.filter((meal) => isMealOwner(user, meal));
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

  const openReviewModal = (booking) => {
    setReviewBooking(booking);
    setReviewRating(5);
    setReviewComment('');
    setReviewModalVisible(true);
  };

  const submitReview = async () => {
    if (!reviewBooking) return;
    setReviewLoading(true);
    const result = await createReview(
      reviewBooking.id,
      reviewRating,
      reviewComment.trim()
    );
    setReviewLoading(false);

    if (result?.error) {
      Alert.alert('Review Failed', result.error);
      return;
    }

    setReviewModalVisible(false);
    Alert.alert('✅ Review Submitted', 'Thanks for your feedback!');
  };

  const BookingCard = ({ booking }) => {
    const hasReviewed = booking.hasReviewed ?? booking.has_reviewed ?? false;
    const canReview = booking.status === 'confirmed' && !hasReviewed;
    return (
    <View
      style={[
        styles.bookingCard,
        booking.status === 'cancelled' && styles.cancelledCard,
      ]}
    >
      {booking?.meal?.image ? (
        <Image source={{ uri: booking.meal.image }} style={styles.bookingImage} />
      ) : (
        <View style={[styles.bookingImage, styles.bookingImagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={32} color="#FF6B35" />
        </View>
      )}
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
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              },
            ]}
          >
            <Ionicons
              name={booking.status === 'confirmed' ? "checkmark-circle" : "close-circle"}
              size={12}
              color={booking.status === 'confirmed' ? '#4CAF50' : '#FF5252'}
            />
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
              {booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingMeta}>
          {booking.portions} portion
          {booking.portions > 1 ? 's' : ''} •{' '}
          {formatCurrency(booking.totalCost)}
        </Text>
        <Text style={styles.bookingDetail}>
          <Ionicons name="time-outline" size={13} color="#757575" /> {booking.meal.pickupTime}
        </Text>
        <Text style={styles.bookingDetail} numberOfLines={1}>
          <Ionicons name="location-outline" size={13} color="#757575" /> {booking.meal.pickupLocation}
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
        {canReview && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => openReviewModal(booking)}
          >
            <Text style={styles.reviewButtonText}>Leave Review</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )};

  const MyMealCard = ({ meal }) => (
    <TouchableOpacity
      style={styles.myMealCard}
      onPress={() => navigation.navigate('MealDetail', { meal })}
    >
      {meal?.image ? (
        <Image source={{ uri: meal.image }} style={styles.myMealImage} />
      ) : (
        <View style={[styles.myMealImage, styles.myMealImagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={26} color="#FF6B35" />
        </View>
      )}
      <View style={styles.myMealInfo}>
        <Text style={styles.myMealTitle} numberOfLines={1}>
          {meal.title}
        </Text>
        <Text style={styles.myMealPrice}>
          {formatCurrency(meal.pricePerPortion)} / portion
        </Text>
        <View style={styles.myMealStats}>
          <Text style={styles.myMealStat}>
            <Ionicons name="people-outline" size={13} color="#757575" /> {meal.bookings} booked
          </Text>
          <Text style={styles.myMealStat}>
            <Ionicons name="restaurant-outline" size={12} color="#757575" /> {meal.availablePortions} left
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
                <Ionicons name="receipt-outline" size={52} color="#BDBDBD" style={{ marginBottom: 14 }} />
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
                <Ionicons name="restaurant-outline" size={52} color="#BDBDBD" style={{ marginBottom: 14 }} />
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

      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlayInner}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Leave a Review</Text>
                  <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                    <Ionicons name="close-circle" size={22} color="#9E9E9E" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  How was your meal from {reviewBooking?.meal?.sellerName}?
                </Text>

                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setReviewRating(star)}
                    >
                      <Text
                        style={[
                          styles.star,
                          star <= reviewRating && styles.starActive,
                        ]}
                      >
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.reviewInput}
                  placeholder="Write a short review (optional)"
                  placeholderTextColor="#BDBDBD"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={styles.submitReviewButton}
                  onPress={submitReview}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitReviewText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
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
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  tabTextActive: { color: '#FF6B35' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelledCard: { opacity: 0.7 },
  bookingImage: {
    width: 100,
    minHeight: 120,
    resizeMode: 'cover',
  },
  bookingImagePlaceholder: {
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  bookingMeta: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  bookingDetail: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
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
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  reviewButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    marginTop: 8,
  },
  reviewButtonText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  myMealCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  myMealImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  myMealImagePlaceholder: {
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myMealInfo: { flex: 1 },
  myMealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  myMealPrice: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  myMealStats: { flexDirection: 'row', gap: 14 },
  myMealStat: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9E9E9E',
    marginBottom: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  starRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  star: { fontSize: 28, color: '#E0E0E0' },
  starActive: { color: '#FFC107' },
  reviewInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#FAFAFA',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  submitReviewButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  submitReviewText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  arrowText: { fontSize: 22, color: '#BDBDBD' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
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
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
});