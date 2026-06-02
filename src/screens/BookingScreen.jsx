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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
  const mealImage = meal?.image || '';

  const handleConfirmBooking = () => {
    if (loading) return;
    Alert.alert(
      'Confirm Booking',
      `Book ${portions} portion${portions > 1 ? 's' : ''} of "${meal.title}" for ${formatCurrency(totalCost)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Pay',
          onPress: async () => {
            setLoading(true);
            const result = await bookMeal(meal, portions);
            setLoading(false);

            if (result?.error) {
              Alert.alert('Booking Failed', result.error);
              return;
            }

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
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.paymentIconBox,
          { backgroundColor: color + '15' },
        ]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text
        style={[
          styles.paymentName,
          paymentMethod === id && styles.paymentNameActive,
        ]}
      >
        {name}
      </Text>
      <View style={[styles.radioOuter, paymentMethod === id && styles.radioOuterActive]}>
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
          activeOpacity={0.8}
        >
          <View style={styles.backButtonContent}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Summary */}
        <View style={styles.mealCard}>
          {mealImage ? (
            <Image source={{ uri: mealImage }} style={styles.mealImage} />
          ) : (
            <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={34} color="#FF6B35" />
            </View>
          )}
          <View style={styles.mealInfo}>
            <Text style={styles.mealTitle} numberOfLines={2}>
              {meal.title}
            </Text>
            <Text style={styles.mealSeller}>
              by {meal.sellerName}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.mealMeta}>
                {meal.pickupTime}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.mealMeta} numberOfLines={1}>
                {meal.pickupLocation}
              </Text>
            </View>
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
            icon="wallet-outline"
            color="#4CAF50"
          />
          <PaymentOption
            id="khalti"
            name="Khalti"
            icon="card-outline"
            color="#9C27B0"
          />
          <PaymentOption
            id="cash"
            name="Cash on Pickup"
            icon="cash-outline"
            color="#FF6B35"
          />
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Cancellation Policy
          </Text>
          <View style={styles.policyCard}>
            <View style={styles.policyHeader}>
              <Ionicons name="warning-outline" size={16} color="#FF6B35" style={{ marginRight: 6 }} />
              <Text style={styles.policyTitle}>
                30% Cancellation Fee
              </Text>
            </View>
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
                    { color: '#EF4444' },
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
                    { color: '#10B981' },
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
          activeOpacity={0.85}
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
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    paddingTop: 55,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  backButton: { marginBottom: 8 },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
  },
  backButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  scrollView: { flex: 1 },
  mealCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EFEA',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  mealImage: { width: 110, height: 110, resizeMode: 'cover' },
  mealImagePlaceholder: {
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfo: { flex: 1, padding: 14, justifyContent: 'center' },
  mealTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  mealSeller: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealMeta: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EFEA',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  summaryValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  paymentOption: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
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
  paymentName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  paymentNameActive: {
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#FF6B35',
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
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  policyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  policyBreakdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFD5C2',
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  policyRowLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  policyRowValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
    borderTopWidth: 1,
    borderTopColor: '#F0EFEA',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomInfo: { flex: 1 },
  bottomLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
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
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
});