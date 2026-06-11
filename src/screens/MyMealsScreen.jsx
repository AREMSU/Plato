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
  StatusBar,
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

const isPickupPassed = (booking) => {
  try {
    const mealDate = booking?.meal?.mealDate;
    const pickupTime = booking?.meal?.pickupTime;
    if (!pickupTime) return false;
    const dateStr = mealDate || new Date().toISOString().split('T')[0];
    const dt = new Date(`${dateStr} ${pickupTime}`);
    return !isNaN(dt.getTime()) && dt < new Date();
  } catch {
    return false;
  }
};

function BookingDetailContent({ booking: b, styles, formatCurrency, getRefundAmount, isPickupPassed }) {
  const isCan = b.status === 'cancelled';
  const isRec = b.status === 'received';
  const isPst = isPickupPassed(b);
  const statusColor = isCan ? '#FF5252' : isRec ? '#4CAF50' : isPst ? '#607D8B' : '#2196F3';
  const displayStatus = isCan ? 'Cancelled' : isRec ? 'Received' : isPst ? 'Completed' : 'Confirmed';
  const refund = getRefundAmount(b.totalCost);

  const rows = [
    { icon: 'layers-outline',   label: 'Portions',        value: `${b.portions} portion${b.portions > 1 ? 's' : ''}` },
    { icon: 'cash-outline',     label: 'Total Paid',      value: formatCurrency(b.totalCost) },
    { icon: 'wallet-outline',   label: 'Payment',         value: b.paymentMethod === 'wallet' ? 'Plato Wallet' : b.paymentMethod === 'esewa' ? 'eSewa' : 'Cash on Pickup' },
    { icon: 'time-outline',     label: 'Pickup Time',     value: b.meal?.pickupTime ?? '—' },
    { icon: 'location-outline', label: 'Pickup Location', value: b.meal?.pickupLocation ?? '—' },
    { icon: 'calendar-outline', label: 'Booked On',       value: b.bookedAt ? new Date(b.bookedAt.replace ? b.bookedAt.replace(/(\.\d{3})\d+/, '$1') : b.bookedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      {b.meal?.image ? (
        <Image source={{ uri: b.meal.image }} style={styles.detailImage} />
      ) : (
        <View style={[styles.detailImage, { backgroundColor: '#FFF3EE', justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="restaurant-outline" size={48} color="#FF6B35" />
        </View>
      )}

      <View style={[styles.detailStatusBadge, { backgroundColor: statusColor + '20' }]}>
        <Text style={[styles.detailStatusText, { color: statusColor }]}>{displayStatus}</Text>
      </View>

      {rows.map(({ icon, label, value }) => (
        <View key={label} style={styles.detailRow}>
          <View style={styles.detailRowIcon}>
            <Ionicons name={icon} size={16} color="#FF6B35" />
          </View>
          <Text style={styles.detailRowLabel}>{label}</Text>
          <Text style={styles.detailRowValue} numberOfLines={2}>{value}</Text>
        </View>
      ))}

      {b.status === 'confirmed' && !isPst && (
        <View style={styles.detailRow}>
          <View style={styles.detailRowIcon}>
            <Ionicons name="information-circle-outline" size={16} color="#FF6B35" />
          </View>
          <Text style={styles.detailRowLabel}>If Cancelled</Text>
          <Text style={styles.detailRowValue}>30% fee · {formatCurrency(refund)} back</Text>
        </View>
      )}

      {isCan && b.paymentMethod !== 'cash' && (
        <View style={[styles.detailRow, {
          backgroundColor: b.refundStatus === 'completed' ? '#E8F5E9' : '#FFF3EE',
          borderRadius: 10, padding: 10, marginTop: 4,
        }]}>
          <Ionicons
            name={b.refundStatus === 'completed' ? 'checkmark-circle' : 'time-outline'}
            size={16}
            color={b.refundStatus === 'completed' ? '#2E7D32' : '#FF6B35'}
          />
          <Text style={{ marginLeft: 8, flex: 1, fontSize: 13, fontWeight: '600', color: b.refundStatus === 'completed' ? '#2E7D32' : '#FF6B35' }}>
            {b.refundStatus === 'completed'
              ? `${formatCurrency(refund)} refunded ✓`
              : `${formatCurrency(refund)} refund pending`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function MyMealsScreen({ navigation, route }) {
  const { bookings, bookingsReceived, cancelBooking, user, meals, createReview, markBookingReceived } = useApp();
  const [activeTab, setActiveTab] = useState('bookings');
  useEffect(() => {
    const nextTab = route?.params?.initialTab;
    if (nextTab) {
      setActiveTab(nextTab);
      navigation.setParams({ initialTab: undefined });
    }
  }, [route?.params?.initialTab, navigation]);

  const ordersReceived = bookingsReceived || [];
  const ordersActive = ordersReceived.filter((b) => b.status !== 'cancelled');
  const ordersCancelled = ordersReceived.filter((b) => b.status === 'cancelled');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const myMeals = meals.filter((meal) => isMealOwner(user, meal));
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && !isPickupPassed(b)
  );
  const completedBookings = bookings.filter(
    (b) => b.status === 'received' || (b.status === 'confirmed' && isPickupPassed(b))
  );
  const cancelledBookings = bookings.filter(
    (b) => b.status === 'cancelled'
  );


  const handleCancel = (booking) => {
    const fee = calculateCancellationFee(booking.totalCost);
    const refund = getRefundAmount(booking.totalCost);
    const method = booking.paymentMethod;

    const refundNote = method === 'wallet'
      ? `${formatCurrency(refund)} will be returned to your Plato Wallet instantly.`
      : method === 'esewa'
      ? `${formatCurrency(refund)} will be refunded to your eSewa account. Admin will process this shortly.`
      : `This was a cash booking — no refund is needed.`;

    const confirmMsg = method === 'cash'
      ? `You paid with cash. Cancelling will free up the portion for others.`
      : `A 30% cancellation fee applies.\n\nCancellation fee: ${formatCurrency(fee)}\nRefund: ${formatCurrency(refund)}`;

    Alert.alert(
      'Cancel Booking?',
      confirmMsg,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelBooking(booking.id);
            Alert.alert('Booking Cancelled', refundNote);
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
    const isPast = isPickupPassed(booking);
    const isCancelled = booking.status === 'cancelled';
    const isReceived = booking.status === 'received';
    const canReview = (booking.status === 'confirmed' || isReceived) && !hasReviewed;

    const displayStatus = isCancelled ? 'Cancelled' : isReceived ? 'Received' : isPast ? 'Completed' : 'Confirmed';
    const statusColor = isCancelled ? '#FF5252' : isReceived ? '#4CAF50' : isPast ? '#607D8B' : '#2196F3';
    const statusBg = isCancelled ? '#FF525220' : isReceived ? '#4CAF5020' : isPast ? '#607D8B20' : '#2196F320';
    const statusIcon = isCancelled ? 'close-circle' : isReceived ? 'checkmark-done-circle' : isPast ? 'checkmark-done-circle' : 'checkmark-circle';

    return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setDetailBooking(booking)}
      style={[
        styles.bookingCard,
        (isCancelled || isPast) && styles.cancelledCard,
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
            {booking.meal?.title ?? 'Meal no longer available'}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusBg, flexDirection: 'row', alignItems: 'center', gap: 4 },
            ]}
          >
            <Ionicons name={statusIcon} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {displayStatus}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingMeta}>
          {booking.portions} portion
          {booking.portions > 1 ? 's' : ''} •{' '}
          {formatCurrency(booking.totalCost)}
        </Text>
        <Text style={styles.bookingDetail}>
          <Ionicons name="time-outline" size={13} color="#757575" /> {booking.meal?.pickupTime ?? '—'}
        </Text>
        <Text style={styles.bookingDetail} numberOfLines={1}>
          <Ionicons name="location-outline" size={13} color="#757575" /> {booking.meal?.pickupLocation ?? '—'}
        </Text>
        {isCancelled && booking.paymentMethod !== 'cash' && (
          <View style={[
            styles.refundBanner,
            booking.refundStatus === 'completed' && { backgroundColor: '#E8F5E9' }
          ]}>
            <Ionicons
              name={booking.refundStatus === 'completed' ? 'checkmark-circle' : 'time-outline'}
              size={13}
              color={booking.refundStatus === 'completed' ? '#2E7D32' : '#FF6B35'}
            />
            <Text style={[
              styles.refundBannerText,
              booking.refundStatus === 'completed' && { color: '#2E7D32' }
            ]}>
              {booking.refundStatus === 'completed'
                ? `${formatCurrency(getRefundAmount(booking.totalCost))} refunded to ${booking.paymentMethod === 'wallet' ? 'your Wallet' : 'eSewa'} ✓`
                : booking.paymentMethod === 'wallet'
                ? `${formatCurrency(getRefundAmount(booking.totalCost))} returned to your Wallet`
                : `${formatCurrency(getRefundAmount(booking.totalCost))} refund pending — admin will process`
              }
            </Text>
          </View>
        )}
        {booking.status === 'confirmed' && (
          <TouchableOpacity
            style={styles.receivedButton}
            onPress={() => {
              Alert.alert(
                'Confirm Receipt',
                'Have you received your food?',
                [
                  { text: 'Not Yet', style: 'cancel' },
                  {
                    text: 'Yes, Received!',
                    onPress: async () => {
                      const result = await markBookingReceived(booking.id);
                      if (result?.error) {
                        Alert.alert('Error', result.error);
                      } else {
                        Alert.alert('Enjoy your meal! 🍽️', 'Marked as received. The seller has been notified.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="checkmark-done-outline" size={15} color="#fff" />
            <Text style={styles.receivedButtonText}>Mark as Received</Text>
          </TouchableOpacity>
        )}
        {booking.status === 'confirmed' && !isPast && (
          <>
            <View style={styles.refundNote}>
              <Ionicons name="information-circle-outline" size={12} color="#FF6B35" />
              <Text style={styles.refundNoteText}>
                {booking.paymentMethod === 'cash'
                  ? 'Cancel anytime · Cash booking · No refund needed'
                  : `Cancel now · 30% fee · ${formatCurrency(getRefundAmount(booking.totalCost))} refund${booking.paymentMethod === 'wallet' ? ' to Wallet' : ''}`
                }
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(booking)}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          </>
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
    </TouchableOpacity>
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

  const ReceivedBookingCard = ({ booking }) => {
    const buyerName = booking.buyerName || booking.buyer_name || 'Someone';
    const buyerAvatar = booking.buyerAvatar || booking.buyer_avatar;
    const mealTitle = booking.meal?.title || 'a meal';
    const isCancelledOrder = booking.status === 'cancelled';

    return (
      <View style={[
        styles.bookingCard,
        { padding: 12, alignItems: 'center' },
        isCancelledOrder && styles.cancelledOrderCard,
      ]}>
        {/* Avatar */}
        <View style={{ position: 'relative' }}>
          {buyerAvatar ? (
            <Image source={{ uri: buyerAvatar }} style={{ width: 44, height: 44, borderRadius: 22, opacity: isCancelledOrder ? 0.5 : 1 }} />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isCancelledOrder ? '#FFEBEB' : '#E0E0E0', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="person" size={20} color={isCancelledOrder ? '#FF5252' : '#757575'} />
            </View>
          )}
          {isCancelledOrder && (
            <View style={styles.cancelledAvatarBadge}>
              <Ionicons name="close" size={8} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          {isCancelledOrder ? (
            <Text style={{ fontSize: 14, color: '#9E9E9E', fontWeight: '500' }}>
              <Text style={{ fontWeight: '800', color: '#FF5252' }}>{buyerName}</Text>
              {' cancelled their booking of '}
              <Text style={{ fontWeight: '700', color: '#757575' }}>{booking.portions}</Text>
              {' portion'}{booking.portions > 1 ? 's' : ''}
              {' of '}{mealTitle}
            </Text>
          ) : (
            <Text style={{ fontSize: 14, color: '#424242', fontWeight: '500' }}>
              <Text style={{ fontWeight: '800', color: '#1A1A1A' }}>{buyerName}</Text>
              {' booked '}
              <Text style={{ fontWeight: '700' }}>{booking.portions}</Text>
              {' portion'}{booking.portions > 1 ? 's' : ''}
              {' of '}{mealTitle}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>
            {new Date(booking.bookedAt || booking.booked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>

        {/* Amount / Status badge */}
        {isCancelledOrder ? (
          <View style={styles.cancelledBadge}>
            <Ionicons name="close-circle" size={12} color="#FF5252" style={{ marginRight: 3 }} />
            <Text style={styles.cancelledBadgeText}>Cancelled</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#4CAF50' }}>+{formatCurrency(booking.totalCost)}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E8500A" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header (scrolls with content) ── */}
        <LinearGradient
          colors={['#E8500A', '#FF6B35', '#FF8C42']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>
            {upcomingBookings.length} upcoming · {ordersActive.length} orders received
          </Text>
        </LinearGradient>

        {/* ── Tabs ── */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bookings' && styles.tabActive]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
              Bookings ({upcomingBookings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'listings' && styles.tabActive]}
            onPress={() => setActiveTab('listings')}
          >
            <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>
              Listings ({myMeals.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
            onPress={() => setActiveTab('orders')}
          >
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
                Orders
              </Text>
              {ordersActive.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{ordersActive.length}</Text>
                </View>
              )}
              {ordersCancelled.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: '#FF5252' }]}>
                  <Text style={styles.tabBadgeText}>{ordersCancelled.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>

        {activeTab === 'bookings' ? (
          <>
            {bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={52} color="#BDBDBD" style={{ marginBottom: 14 }} />
                <Text style={styles.emptyTitle}>No bookings yet</Text>
                <Text style={styles.emptySubtitle}>
                  Explore meals and make your first booking!
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Explore')}
                >
                  <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.actionGradient}>
                    <Text style={styles.actionText}>Explore Meals</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {upcomingBookings.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Upcoming</Text>
                    {upcomingBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} />
                    ))}
                  </>
                )}
                {completedBookings.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                      Received & Completed ({completedBookings.length})
                    </Text>
                    {completedBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} />
                    ))}
                  </>
                )}
                {cancelledBookings.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Cancelled</Text>
                    {cancelledBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} />
                    ))}
                  </>
                )}
                {upcomingBookings.length === 0 && completedBookings.length === 0 && cancelledBookings.length === 0 && bookings.filter(b => b.status === 'received').length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={52} color="#BDBDBD" style={{ marginBottom: 14 }} />
                    <Text style={styles.emptyTitle}>No bookings yet</Text>
                    <Text style={styles.emptySubtitle}>Explore meals and make your first booking!</Text>
                  </View>
                )}
              </>
            )}
          </>
        ) : activeTab === 'listings' ? (
          <>
            {myMeals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={52} color="#BDBDBD" style={{ marginBottom: 14 }} />
                <Text style={styles.emptyTitle}>No meals listed yet</Text>
                <Text style={styles.emptySubtitle}>
                  Share your cooking with the community!
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Add')}
                >
                  <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.actionGradient}>
                    <Text style={styles.actionText}>Add a Meal</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Your Meal Listings</Text>
                {myMeals.map((meal) => (
                  <MyMealCard key={meal.id} meal={meal} />
                ))}
              </>
            )}
          </>
        ) : (
          /* ── Orders Received tab ── */
          <>
            {ordersReceived.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bag-handle-outline" size={52} color="#BDBDBD" style={{ marginBottom: 14 }} />
                <Text style={styles.emptyTitle}>No orders yet</Text>
                <Text style={styles.emptySubtitle}>
                  When someone books your meal, they'll appear here.
                </Text>
              </View>
            ) : (
              <>
                {ordersActive.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Active Orders</Text>
                    {ordersActive.map((b) => (
                      <ReceivedBookingCard key={b.id} booking={b} />
                    ))}
                  </>
                )}
                {ordersCancelled.length > 0 && (
                  <>
                    <View style={styles.cancelledSectionHeader}>
                      <Ionicons name="close-circle-outline" size={16} color="#FF5252" style={{ marginRight: 6 }} />
                      <Text style={[styles.sectionTitle, { color: '#FF5252', marginBottom: 0 }]}>
                        Cancellations ({ordersCancelled.length})
                      </Text>
                    </View>
                    <Text style={styles.cancellationNote}>
                      These customers cancelled their orders
                    </Text>
                    {ordersCancelled.map((b) => (
                      <ReceivedBookingCard key={b.id} booking={b} />
                    ))}
                  </>
                )}
                {ordersActive.length === 0 && ordersCancelled.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="bag-handle-outline" size={52} color="#BDBDBD" style={{ marginBottom: 14 }} />
                    <Text style={styles.emptyTitle}>No orders yet</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── Booking Detail Modal ── */}
      <Modal
        visible={!!detailBooking}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailBooking(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHandle} />

            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {detailBooking?.meal?.title ?? 'Meal no longer available'}
              </Text>
              <TouchableOpacity onPress={() => setDetailBooking(null)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color="#9E9E9E" />
              </TouchableOpacity>
            </View>

            {detailBooking ? (
              <BookingDetailContent
                booking={detailBooking}
                styles={styles}
                formatCurrency={formatCurrency}
                getRefundAmount={getRefundAmount}
                isPickupPassed={isPickupPassed}
              />
            ) : null}
          </View>
        </View>
      </Modal>

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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingBottom: 24,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#9E9E9E',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  tabTextActive: { color: '#FF6B35' },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  scrollContent: { paddingTop: 0 },
  listContainer: { paddingHorizontal: 16, paddingTop: 16 },
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
  cancelledOrderCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    opacity: 0.9,
  },
  cancelledAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  cancelledBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF5252',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  cancelledSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  cancellationNote: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
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
  refundNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginBottom: 2,
  },
  refundNoteText: {
    fontSize: 11,
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif',
  },
  refundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#FFF3EE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  refundBannerText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  receivedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  receivedButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: '#FF5252',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    marginTop: 2,
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
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  detailHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detailTitle: {
    fontSize: 17, fontWeight: '800', color: '#1A1A1A', flex: 1, marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  detailImage: {
    width: '100%', height: 180, borderRadius: 16, marginBottom: 14,
  },
  detailStatusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 16,
  },
  detailStatusText: {
    fontSize: 13, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  detailRowIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FFF3EE',
    alignItems: 'center', justifyContent: 'center',
  },
  detailRowLabel: {
    fontSize: 13, color: '#757575', width: 110,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif',
  },
  detailRowValue: {
    fontSize: 13, fontWeight: '600', color: '#1A1A1A', flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
});