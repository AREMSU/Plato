import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  calculateCancellationFee,
  getRefundAmount,
} from '../utils/helpers';

export default function BookingScreen({ navigation, route }) {
  const { meal, portions } = route.params;
  const { bookMeal } = useApp();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('esewa');

  const totalCost = meal.pricePerPortion * portions;
  const cancellationFee = calculateCancellationFee(totalCost);
  const refundAmount = getRefundAmount(totalCost);

  const handleConfirmBooking = () => {
    Alert.alert(
      'Confirm Booking',
      `Book ${portions} portion${portions > 1 ? 's' : ''} of "${meal.title}" for ${formatCurrency(totalCost)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Pay',
          onPress: () => {
            setLoading(true);
            setTimeout(() => {
              const result = bookMeal(meal, portions);
              setLoading(false);
              if (result.success) {
                Alert.alert(
                  '🎉 Booking Confirmed!',
                  `Your meal has been booked!\n\nPickup: ${meal.pickupTime} at ${meal.pickupLocation}`,
                  [
                    {
                      text: 'View My Bookings',
                      onPress: () => {
                        navigation.navigate('Main', {
                          screen: 'MyMeals',
                        });
                      },
                    },
                  ]
                );
              }
            }, 1500);
          },
        },
      ]
    );
  };

  const PaymentOption = ({ id, name, icon, color }) => (
    <TouchableOpacity
      style={[
        styles.paymentOption,
        paymentMethod === id && styles.paymentOptionActive,
      ]}
      onPress={() => setPaymentMethod(id)}
    >
      <View
        style={[
          styles.paymentIconBox,
          { backgroundColor: color + '20' },
        ]}
      >
        <Text style={styles.paymentIcon}>{icon}</Text>
      </View>
      <Text
        style={[
          styles.paymentName,
          paymentMethod === id && styles.paymentNameActive,
        ]}
      >
        {name}
      </Text>
      <View style={styles.radioOuter}>
        {paymentMethod === id && (
          <View style={styles.radioInner} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Summary */}
        <View style={styles.mealCard}>
          <Image
            source={{ uri: meal.image }}
            style={styles.mealImage}
          />
          <View style={styles.mealInfo}>
            <Text style={styles.mealTitle} numberOfLines={2}>
              {meal.title}
            </Text>
            <Text style={styles.mealSeller}>
              by {meal.sellerName}
            </Text>
            <Text style={styles.mealMeta}>
              ⏰ {meal.pickupTime}
            </Text>
            <Text style={styles.mealMeta} numberOfLines={1}>
              📍 {meal.pickupLocation}
            </Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Price per portion
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(meal.pricePerPortion)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Portions</Text>
              <Text style={styles.summaryValue}>× {portions}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(totalCost)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <PaymentOption
            id="esewa"
            name="eSewa"
            icon="💚"
            color="#4CAF50"
          />
          <PaymentOption
            id="khalti"
            name="Khalti"
            icon="💜"
            color="#9C27B0"
          />
          <PaymentOption
            id="cash"
            name="Cash on Pickup"
            icon="💵"
            color="#FF6B35"
          />
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Cancellation Policy
          </Text>
          <View style={styles.policyCard}>
            <Text style={styles.policyTitle}>
              ⚠️ 30% Cancellation Fee
            </Text>
            <Text style={styles.policyText}>
              If you cancel this booking, you will be charged a
              cancellation fee of{' '}
              {formatCurrency(cancellationFee)} (30% of total).
            </Text>
            <View style={styles.policyBreakdown}>
              <View style={styles.policyRow}>
                <Text style={styles.policyRowLabel}>
                  Cancellation fee
                </Text>
                <Text
                  style={[
                    styles.policyRowValue,
                    { color: '#FF5252' },
                  ]}
                >
                  -{formatCurrency(cancellationFee)}
                </Text>
              </View>
              <View style={styles.policyRow}>
                <Text style={styles.policyRowLabel}>
                  Refund amount
                </Text>
                <Text
                  style={[
                    styles.policyRowValue,
                    { color: '#4CAF50' },
                  ]}
                >
                  {formatCurrency(refundAmount)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>Total to Pay</Text>
          <Text style={styles.bottomPrice}>
            {formatCurrency(totalCost)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF8C42']}
            style={styles.confirmGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>
                Confirm & Pay
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: 55,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  backButton: { marginBottom: 8 },
  backButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  scrollView: { flex: 1 },
  mealCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 3,
  },
  mealImage: { width: 110, height: 110, resizeMode: 'cover' },
  mealInfo: { flex: 1, padding: 14, justifyContent: 'center' },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  mealSeller: {
    fontSize: 13,
    color: '#9E9E9E',
    marginBottom: 8,
  },
  mealMeta: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
    marginBottom: 4,
  },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#616161',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#212121',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B35',
  },
  paymentOption: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    elevation: 1,
  },
  paymentOptionActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF8F5',
  },
  paymentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paymentIcon: { fontSize: 22 },
  paymentName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#424242',
  },
  paymentNameActive: { color: '#FF6B35' },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  policyCard: {
    backgroundColor: '#FFF8F5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD5C2',
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 10,
  },
  policyText: {
    fontSize: 13,
    color: '#616161',
    lineHeight: 20,
    marginBottom: 14,
  },
  policyBreakdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  policyRowLabel: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  policyRowValue: { fontSize: 14, fontWeight: '700' },
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
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
  },
  bottomInfo: { flex: 1 },
  bottomLabel: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  confirmButton: { borderRadius: 16, overflow: 'hidden' },
  confirmGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});