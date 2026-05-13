import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const PREMIUM_FEATURES = [
  {
    icon: '📚',
    title: 'Unlimited Meal Listings',
    desc: 'List as many meals as you want with no restrictions',
  },
  {
    icon: '⭐',
    title: 'Daily Featured Placement',
    desc: 'Your meals appear at the top of search results every day',
  },
  {
    icon: '💰',
    title: '30% Booking Discount',
    desc: 'Save 30% on every booking you make through the app',
  },
  {
    icon: '📊',
    title: 'Advanced Analytics',
    desc: 'Deep insights into your meal views, bookings & revenue',
  },
  {
    icon: '⚡',
    title: '24/7 Priority Support',
    desc: 'Get help anytime with our dedicated premium support team',
  },
  {
    icon: '🎯',
    title: 'Smart Recommendations',
    desc: 'AI-powered meal suggestions tailored to your preferences',
  },
  {
    icon: '🔔',
    title: 'Instant Notifications',
    desc: 'Real-time alerts for bookings, reviews and messages',
  },
  {
    icon: '🏷️',
    title: 'Premium Seller Badge',
    desc: 'Stand out with exclusive premium seller badges',
  },
];

const COMPARISON_ROWS = [
  { feature: '📚 Meal Listings', free: 'Limited\n(2/week)', premium: 'Unlimited\n+ Featured' },
  { feature: '💰 Booking Discount', free: '0%', premium: '30%' },
  { feature: '📊 Analytics', free: 'None', premium: 'Advanced +' },
  { feature: '⚡ Support', free: 'Basic', premium: '24/7 Priority' },
  { feature: '⭐ Featured Listing', free: '✗', premium: '✓ Daily' },
  { feature: '🎯 AI Recommendations', free: '✗', premium: '✓' },
  { feature: '🔔 Instant Alerts', free: '✗', premium: '✓' },
  { feature: '🏷️ Premium Badge', free: '✗', premium: '✓' },
];

const FAQ_DATA = [
  {
    id: 'q1',
    q: '❓ Can I cancel anytime?',
    a: 'Yes! Cancel your subscription at any time. You will keep premium benefits until the end of your billing period. No penalties.',
  },
  {
    id: 'q2',
    q: '❓ Is there a refund policy?',
    a: 'We offer a 7-day money-back guarantee. Contact support within 7 days of purchase for a full refund.',
  },
  {
    id: 'q3',
    q: '❓ What payment methods are accepted?',
    a: 'We accept eSewa, Khalti, and credit/debit cards. All payments are encrypted and secure.',
  },
  {
    id: 'q4',
    q: '❓ What happens after I cancel?',
    a: "You'll revert to the Free plan. Your meals and booking history remain intact. Upgrade again anytime.",
  },
  {
    id: 'q5',
    q: '❓ Will price change in future?',
    a: 'Current members are locked in at Rs. 199/month forever. Price is guaranteed for existing subscribers.',
  },
];

// ─── STATUS BAR HEIGHT (Android fix) ─────────────────────────────────────────
const STATUSBAR_HEIGHT = Platform.OS === 'android'
  ? StatusBar.currentHeight ?? 24
  : 0;

// ─── Sub-components ───────────────────────────────────────────────────────────

const CustomHeader = memo(({ onBack }) => (
  <LinearGradient
    colors={['#7C3AED', '#9F67FF']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.header}
  >
    {/* Push content below the status bar on Android */}
    <View style={{ height: STATUSBAR_HEIGHT }} />
    <View style={styles.headerContent}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>✨ Go Premium</Text>
        <Text style={styles.headerSubtitle}>
          Unlock everything for Rs. 199/month
        </Text>
      </View>
    </View>
  </LinearGradient>
));

const HeroSection = memo(({ isPremiumActive, user }) => (
  <LinearGradient
    colors={['#7C3AED', '#9F67FF', '#C084FC']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.heroSection}
  >
    <View style={styles.heroBubble1} />
    <View style={styles.heroBubble2} />

    <View style={styles.heroIconWrapper}>
      <Text style={styles.heroIcon}>👑</Text>
    </View>

    <Text style={styles.heroTitle}>
      {isPremiumActive ? 'You Are Premium!' : 'Become a Premium Member'}
    </Text>
    <Text style={styles.heroSubtitle}>
      {isPremiumActive
        ? `Active until ${new Date(
            user?.subscriptionExpiry || new Date()
          ).toLocaleDateString()}`
        : 'Join thousands of students enjoying exclusive benefits'}
    </Text>

    {!isPremiumActive && (
      <View style={styles.pricePill}>
        <Text style={styles.pricePillOld}>Rs. 399</Text>
        <Text style={styles.pricePillNew}>Rs. 199</Text>
        <View style={styles.pricePillBadge}>
          <Text style={styles.pricePillBadgeText}>50% OFF</Text>
        </View>
      </View>
    )}

    {isPremiumActive && (
      <View style={styles.activePill}>
        <Text style={styles.activePillText}>✓ Premium Active</Text>
      </View>
    )}
  </LinearGradient>
));

const FeatureCard = memo(({ item }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureCardIconBox}>
      <Text style={styles.featureCardIcon}>{item.icon}</Text>
    </View>
    <View style={styles.featureCardText}>
      <Text style={styles.featureCardTitle}>{item.title}</Text>
      <Text style={styles.featureCardDesc}>{item.desc}</Text>
    </View>
  </View>
));

const ComparisonTable = memo(() => (
  <View style={styles.comparisonSection}>
    <Text style={styles.sectionTitle}>Free vs 👑 Premium</Text>
    <View style={styles.comparisonTable}>
      {/* Table Header */}
      <View style={styles.comparisonHeader}>
        <Text style={styles.comparisonHeaderFeature}>Feature</Text>
        <Text style={styles.comparisonHeaderFree}>Free</Text>
        <LinearGradient
          colors={['#7C3AED', '#9F67FF']}
          style={styles.comparisonHeaderPremium}
        >
          <Text style={styles.comparisonHeaderPremiumText}>👑 Premium</Text>
        </LinearGradient>
      </View>

      {/* Table Rows */}
      {COMPARISON_ROWS.map((row, idx) => (
        <View
          key={idx}
          style={[
            styles.comparisonRow,
            idx % 2 === 0 && styles.comparisonRowAlt,
            idx === COMPARISON_ROWS.length - 1 && styles.comparisonRowLast,
          ]}
        >
          <Text style={styles.comparisonFeature}>{row.feature}</Text>
          <Text style={styles.comparisonFreeCell}>{row.free}</Text>
          <Text style={styles.comparisonPremiumCell}>{row.premium}</Text>
        </View>
      ))}
    </View>
  </View>
));

const FaqItem = memo(({ item, isExpanded, onToggle }) => (
  <View style={styles.faqItem}>
    <TouchableOpacity
      style={styles.faqQuestion}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.faqQuestionText}>{item.q}</Text>
      <Text style={styles.faqToggle}>{isExpanded ? '▼' : '▶'}</Text>
    </TouchableOpacity>
    {isExpanded && (
      <View style={styles.faqAnswerBox}>
        <Text style={styles.faqAnswer}>{item.a}</Text>
      </View>
    )}
  </View>
));

const ConfirmModal = memo(({ visible, loading, onConfirm, onCancel }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    statusBarTranslucent
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {/* Modal Header */}
        <LinearGradient
          colors={['#7C3AED', '#9F67FF']}
          style={styles.modalHeaderGradient}
        >
          <Text style={styles.modalHeaderIcon}>👑</Text>
          <Text style={styles.modalHeaderTitle}>Confirm Subscription</Text>
          <Text style={styles.modalHeaderSub}>
            Start your premium journey today
          </Text>
        </LinearGradient>

        <View style={styles.modalBody}>
          {/* Price Breakdown */}
          <View style={styles.modalPriceBox}>
            <View style={styles.modalPriceRow}>
              <Text style={styles.modalPriceLabel}>Premium Plan</Text>
              <Text style={styles.modalPriceOld}>Rs. 399</Text>
            </View>
            <View style={styles.modalPriceRow}>
              <Text style={styles.modalDiscountLabel}>
                🎉 Launch Discount (50%)
              </Text>
              <Text style={styles.modalDiscountValue}>- Rs. 200</Text>
            </View>
            <View style={styles.modalDivider} />
            <View style={styles.modalPriceRow}>
              <Text style={styles.modalTotalLabel}>Total Today</Text>
              <Text style={styles.modalTotalValue}>Rs. 199</Text>
            </View>
            <Text style={styles.modalPriceNote}>
              Then Rs. 199/month • Cancel anytime
            </Text>
          </View>

          {/* Payment Methods */}
          <Text style={styles.modalPaymentTitle}>💳 Pay via</Text>
          <View style={styles.modalPaymentMethods}>
            {['eSewa', 'Khalti', 'Card'].map((method) => (
              <View key={method} style={styles.modalPaymentChip}>
                <Text style={styles.modalPaymentChipText}>{method}</Text>
              </View>
            ))}
          </View>

          {/* Benefits */}
          <View style={styles.modalBenefits}>
            <Text style={styles.modalBenefitsTitle}>✨ You'll unlock:</Text>
            {[
              'Unlimited meal listings',
              '30% off every booking',
              'Daily featured placement',
              '24/7 priority support',
            ].map((b, i) => (
              <Text key={i} style={styles.modalBenefit}>
                ✓ {b}
              </Text>
            ))}
          </View>

          <Text style={styles.modalNote}>
            🔒 Secure payment • 7-day money-back guarantee
          </Text>

          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.modalCancelText}>Maybe Later</Text>
            </TouchableOpacity>

            <LinearGradient
              colors={['#7C3AED', '#9F67FF']}
              style={styles.modalConfirmGradient}
            >
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    Pay Rs. 199
                  </Text>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </View>
    </View>
  </Modal>
));

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SubscriptionScreen({ navigation }) {
  const {
    user,
    upgradeSubscription,
    cancelSubscription,
    isPremium,
    PREMIUM_PRICE,
    PREMIUM_ORIGINAL_PRICE,
  } = useApp();

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  // ── Call isPremium() as a function from context ────────────────────────────
  const isPremiumActive = isPremium();

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGetPremium = useCallback(() => {
    if (isPremiumActive) {
      Alert.alert(
        'Cancel Premium?',
        'You will lose all premium benefits at the end of your billing period.',
        [
          { text: 'Keep Premium', style: 'cancel' },
          {
            text: 'Cancel Subscription',
            style: 'destructive',
            onPress: () => {
              cancelSubscription();
              Alert.alert(
                '✅ Cancelled',
                'Your premium subscription has been cancelled.'
              );
            },
          },
        ]
      );
      return;
    }
    setConfirmModalVisible(true);
  }, [isPremiumActive, cancelSubscription]);

  const handleConfirmSubscription = useCallback(() => {
    const processPayment = () => {
      setLoading(true);
      setTimeout(() => {
        const result = upgradeSubscription('premium');
        setLoading(false);
        setConfirmModalVisible(false);

        if (result?.success) {
          Alert.alert(
            '🎉 Welcome to Premium!',
            'Your premium subscription is now active.\nEnjoy 30% off all bookings!',
            [
              {
                text: "Let's Go! 🚀",
                onPress: () => navigation.goBack(),
              },
            ]
          );
        } else {
          Alert.alert(
            '❌ Payment Failed',
            result?.message || 'Please try again.'
          );
        }
      }, 1500);
    };

    Alert.alert(
      '💳 Confirm Payment',
      `Pay Rs. ${PREMIUM_PRICE ?? 199} via eSewa to activate Premium`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Pay Rs. ${PREMIUM_PRICE ?? 199}`,
          onPress: processPayment,
        },
      ]
    );
  }, [upgradeSubscription, navigation, PREMIUM_PRICE]);

  const handleFaqToggle = useCallback((id) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        ✅ FIX: Use StatusBar to make it translucent so our custom
        header gradient extends behind it on Android.
      */}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/*
        ✅ FIX: Plain View as root (NOT SafeAreaView) with flex:1.
        SafeAreaView was fighting with the ScrollView for height on Android.
      */}
      <View style={styles.root}>
        {/* Fixed Header — does NOT scroll */}
        <CustomHeader onBack={() => navigation.goBack()} />

        {/* ✅ ScrollView takes ALL remaining space via flex:1 */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <HeroSection isPremiumActive={isPremiumActive} user={user} />

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Everything in Premium</Text>
            <Text style={styles.sectionSubtitle}>
              8 powerful features to supercharge your experience
            </Text>
            {PREMIUM_FEATURES.map((item, idx) => (
              <FeatureCard key={idx} item={item} />
            ))}
          </View>

          {/* CTA Banner — only when not premium */}
          {!isPremiumActive && (
            <LinearGradient
              colors={['#7C3AED', '#9F67FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaBanner}
            >
              <Text style={styles.ctaBannerTitle}>🔥 Limited Time Offer</Text>
              <Text style={styles.ctaBannerText}>
                Get Premium for just{' '}
                <Text style={styles.ctaBannerPrice}>Rs. 199/month</Text>
              </Text>
              <Text style={styles.ctaBannerSub}>
                Regular price Rs. 399 • Save 50%
              </Text>
            </LinearGradient>
          )}

          {/* Comparison Table */}
          <ComparisonTable />

          {/* Main CTA / Active State */}
          <View style={styles.subscribeSection}>
            {isPremiumActive ? (
              <View style={styles.activeCard}>
                <Text style={styles.activeCardIcon}>👑</Text>
                <Text style={styles.activeCardTitle}>
                  You're a Premium Member!
                </Text>
                <Text style={styles.activeCardSub}>
                  Active until{' '}
                  {new Date(
                    user?.subscriptionExpiry || new Date()
                  ).toLocaleDateString()}
                </Text>

                {/* Active benefits summary */}
                <View style={styles.activeCardBenefits}>
                  <Text style={styles.activeCardBenefit}>
                    ✓ 30% off all bookings
                  </Text>
                  <Text style={styles.activeCardBenefit}>
                    ✓ Daily featured listings
                  </Text>
                  <Text style={styles.activeCardBenefit}>
                    ✓ 24/7 priority support
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleGetPremium}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>
                    Cancel Subscription
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <LinearGradient
                  colors={['#7C3AED', '#9F67FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.mainCTAGradient}
                >
                  <TouchableOpacity
                    style={styles.mainCTAButton}
                    onPress={handleGetPremium}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.mainCTATitle}>
                      👑 Get Premium Now
                    </Text>
                    <Text style={styles.mainCTAPrice}>
                      Rs. 199 / month
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>

                <Text style={styles.subscribeNote}>
                  🔒 Secure payment • Cancel anytime • 7-day money-back
                </Text>
              </>
            )}
          </View>

          {/* Social Proof */}
          <View style={styles.socialProof}>
            <View style={styles.socialProofAvatars}>
              {['👨', '👩', '🧑', '👴', '👵'].map((a, i) => (
                <View
                  key={i}
                  style={[
                    styles.avatar,
                    { marginLeft: i === 0 ? 0 : -10 },
                  ]}
                >
                  <Text style={styles.avatarText}>{a}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.socialProofText}>
              <Text style={styles.socialProofBold}>2,400+ students </Text>
              already enjoying premium
            </Text>
          </View>

          {/* FAQ */}
          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>
              Frequently Asked Questions
            </Text>
            {FAQ_DATA.map((item) => (
              <FaqItem
                key={item.id}
                item={item}
                isExpanded={expandedFaqId === item.id}
                onToggle={handleFaqToggle}
              />
            ))}
          </View>

          {/* Support Card */}
          <View style={styles.supportCard}>
            <Text style={styles.supportIcon}>💬</Text>
            <Text style={styles.supportTitle}>Still have questions?</Text>
            <Text style={styles.supportText}>
              Our team is happy to help you
            </Text>
            <TouchableOpacity
              style={styles.supportButton}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert(
                  'Support',
                  'support@plato.app\n+977-1-4XXXXXX'
                )
              }
            >
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      {/* Confirm Modal — outside the View so it overlays everything */}
      <ConfirmModal
        visible={confirmModalVisible}
        loading={loading}
        onConfirm={handleConfirmSubscription}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Root ────────────────────────────────────────────────────────────────────
  // ✅ Plain View with flex:1 — no SafeAreaView fighting for height
  root: {
    flex: 1,
    backgroundColor: '#7C3AED', // matches header so status bar area is purple
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    // ✅ No paddingTop here — we use the explicit <View height={STATUSBAR_HEIGHT}/>
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },

  // ── ScrollView ───────────────────────────────────────────────────────────────
  // ✅ flex:1 fills ALL space below the header
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  // ✅ flexGrow:1 lets content taller than screen scroll freely
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  heroSection: {
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBubble1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -60,
  },
  heroBubble2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    left: -40,
  },
  heroIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroIcon: { fontSize: 44 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 10,
  },
  pricePillOld: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'line-through',
  },
  pricePillNew: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  pricePillBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pricePillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  activePill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  activePillText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },

  // ── Features ─────────────────────────────────────────────────────────────────
  featuresSection: {
    padding: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  featureCardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureCardIcon: { fontSize: 24 },
  featureCardText: { flex: 1 },
  featureCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  featureCardDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },

  // ── CTA Banner ───────────────────────────────────────────────────────────────
  ctaBanner: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  ctaBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  ctaBannerText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  ctaBannerPrice: {
    fontWeight: '800',
    fontSize: 18,
    color: '#FFD700',
  },
  ctaBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  // ── Comparison Table ──────────────────────────────────────────────────────────
  comparisonSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  comparisonTable: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    marginTop: 12,
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
    alignItems: 'center',
  },
  comparisonHeaderFeature: {
    flex: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  comparisonHeaderFree: {
    flex: 1.2,
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textAlign: 'center',
  },
  comparisonHeaderPremium: {
    flex: 1.5,
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonHeaderPremiumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBFF',
  },
  comparisonRowAlt: { backgroundColor: '#FDFCFF' },
  comparisonRowLast: { borderBottomWidth: 0 },
  comparisonFeature: {
    flex: 2,
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
  },
  comparisonFreeCell: {
    flex: 1.2,
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  comparisonPremiumCell: {
    flex: 1.5,
    fontSize: 11,
    color: '#7C3AED',
    textAlign: 'center',
    fontWeight: '700',
  },

  // ── Subscribe Section ─────────────────────────────────────────────────────────
  subscribeSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  mainCTAGradient: {
    width: '100%',
    borderRadius: 18,
    elevation: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  mainCTAButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  mainCTATitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mainCTAPrice: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 3,
  },
  subscribeNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },

  // ── Active Card ───────────────────────────────────────────────────────────────
  activeCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7C3AED',
    elevation: 3,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  activeCardIcon: { fontSize: 40, marginBottom: 8 },
  activeCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3AED',
    marginBottom: 4,
  },
  activeCardSub: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  activeCardBenefits: {
    alignSelf: 'stretch',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  activeCardBenefit: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  cancelButtonText: {
    color: '#FF4444',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Social Proof ──────────────────────────────────────────────────────────────
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 10,
  },
  socialProofAvatars: { flexDirection: 'row' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarText: { fontSize: 16 },
  socialProofText: { fontSize: 12, color: '#666' },
  socialProofBold: { fontWeight: '800', color: '#7C3AED' },

  // ── FAQ ───────────────────────────────────────────────────────────────────────
  faqSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  faqItem: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    elevation: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
    lineHeight: 20,
    marginRight: 8,
  },
  faqToggle: { fontSize: 12, color: '#7C3AED' },
  faqAnswerBox: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#EDE9FE',
  },
  faqAnswer: { fontSize: 13, color: '#666', lineHeight: 21 },

  // ── Support Card ──────────────────────────────────────────────────────────────
  supportCard: {
    margin: 16,
    marginTop: 24,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  supportIcon: { fontSize: 36, marginBottom: 10 },
  supportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  supportText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  supportButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
  },
  supportButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },

  bottomSpacing: { height: 40 },

  // ── Modal ─────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalHeaderGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalHeaderIcon: { fontSize: 36, marginBottom: 6 },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  modalHeaderSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  modalBody: { padding: 20 },
  modalPriceBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPriceLabel: { fontSize: 14, color: '#666' },
  modalPriceOld: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  modalDiscountLabel: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '600',
  },
  modalDiscountValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EDE9FE',
    marginVertical: 8,
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  modalTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7C3AED',
  },
  modalPriceNote: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
  },
  modalPaymentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginBottom: 10,
  },
  modalPaymentMethods: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modalPaymentChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  modalPaymentChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  modalBenefits: { marginBottom: 12 },
  modalBenefitsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalBenefit: {
    fontSize: 13,
    color: '#555',
    marginBottom: 5,
    lineHeight: 19,
  },
  modalNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  modalConfirmGradient: {
    flex: 1,
    borderRadius: 14,
  },
  modalConfirmBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
});