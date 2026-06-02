import React, { useState, useEffect, useRef } from 'react';
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
  Switch,
  Linking,
  Platform,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { getDisplayName, getReliabilityBadge, isMealOwner } from '../utils/helpers';
import RatingStars from '../components/RatingStars';
import UserAvatar from '../components/UserAvatar';
import apiCall from '../api/client';
import { uploadImageToCloudinary } from '../api/uploadImage';

const PROFILE_ICONS = {
  user: require('../../assets/branding/user.png'),
  bell: require('../../assets/branding/bell.png'),
  safety: require('../../assets/branding/safety.png'),
  dietary: require('../../assets/branding/button.png'),
  payment: require('../../assets/branding/cashless-payment.png'),
  rating: require('../../assets/branding/rating.png'),
  faq: require('../../assets/branding/faq.png'),
  contact: require('../../assets/branding/contact-us.png'),
  info: require('../../assets/branding/information.png'),
  logout: require('../../assets/branding/log-out.png'),
  close: require('../../assets/branding/cross.png'),
  delete: require('../../assets/branding/delete.png'),
};

export default function ProfileScreen({ navigation }) {
  const {
    user,
    logout,
    meals,
    bookings,
    setUser,
    loggingOut,
    reviewsReceived,
    notifications: notificationsList,
    loadNotifications,
    markNotificationsRead,
  } = useApp();

  const myMeals = meals.filter((m) => isMealOwner(user, m));
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
  const badge = getReliabilityBadge(user?.rating || 5);
  const displayName = getDisplayName(user);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [dietModalVisible, setDietModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionActionLoading, setSubscriptionActionLoading] = useState(false);
  const [renewalCancelled, setRenewalCancelled] = useState(false);
  const [proUpgradeModalVisible, setProUpgradeModalVisible] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    university: user?.university || '',
    bio: user?.bio || '',
  });

  const [notifications, setNotifications] = useState({
    newMeals: true,
    bookingUpdates: true,
    reminders: true,
    promotions: false,
    reviews: true,
  });

  const [dietary, setDietary] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
    nutFree: false,
    halal: false,
  });

  const savedPayments = [
    { id: '1', type: 'eSewa', number: '98XXXXXXXX', icon: 'wallet-outline', color: '#4CAF50' },
    { id: '2', type: 'Khalti', number: '98XXXXXXXX', icon: 'wallet-outline', color: '#9C27B0' },
  ];

  const sellerReviews = Array.isArray(reviewsReceived) ? reviewsReceived : [];

  const totalEarnings = myMeals.reduce(
    (sum, meal) => sum + meal.pricePerPortion * meal.bookings,
    0
  );

  const isPro = Boolean(subscription?.isPro);
  const daysRemaining = subscription?.daysRemaining ?? 0;
  const expiresAt = subscription?.expiresAt;
  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : null;

  const loadSubscription = async () => {
    if (!user) return;
    setSubscriptionLoading(true);
    try {
      const data = await apiCall('/subscription/', 'GET', null, true);
      setSubscription(data);
    } catch (error) {
      console.log('Load subscription error:', error.message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Re-fetch subscription on mount, on foreground return, and every 30s while pending
  const appStateRef = useRef(AppState.currentState);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    loadSubscription();

    // AppState listener: re-fetch when app comes back to foreground
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        loadSubscription();
      }
      appStateRef.current = nextState;
    });

    return () => {
      appStateSub.remove();
    };
  }, [user?.id]);

  // 30-second polling while subscription is pending
  useEffect(() => {
    if (subscription?.status === 'pending') {
      pollIntervalRef.current = setInterval(() => {
        loadSubscription();
      }, 30000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [subscription?.status]);

  useEffect(() => {
    if (!notifModalVisible) return;
    loadNotifications();
    markNotificationsRead();
  }, [notifModalVisible]);

  useEffect(() => {
    if (!user) return;
    setNotifications({
      newMeals: user.notifyNewMeals ?? true,
      bookingUpdates: user.notifyBookingUpdates ?? true,
      reminders: user.notifyReminders ?? true,
      promotions: user.notifyPromotions ?? false,
      reviews: user.notifyReviews ?? true,
    });
  }, [user]);

  const handleUpgrade = () => {
    setProUpgradeModalVisible(true);
  };

  const submitUpgradeRequest = async () => {
    if (!paymentRef.trim()) {
      Alert.alert('Error', 'Please enter your payment Transaction ID / Reference.');
      return;
    }
    setSubscriptionActionLoading(true);
    try {
      const data = await apiCall('/subscription/upgrade/', 'POST', { payment_reference: paymentRef.trim() }, true);
      const next = data?.subscription ?? data;
      setSubscription(next);
      setRenewalCancelled(false);
      setProUpgradeModalVisible(false);
      setPremiumModalVisible(false);
      setPaymentRef('');
      Alert.alert('✅ Request Submitted', 'Your payment reference has been sent to the admin. Verification will take up to 24 hours.');
    } catch (error) {
      Alert.alert('Upgrade Request Failed', error.message || 'Please try again.');
    } finally {
      setSubscriptionActionLoading(false);
    }
  };

  const handleEsewaUpgrade = async () => {
    setSubscriptionActionLoading(true);
    try {
      const data = await apiCall('/subscription/esewa/initiate/', 'POST', null, true);
      if (data.checkout_url) {
        setProUpgradeModalVisible(false);
        setPremiumModalVisible(false);
        Linking.openURL(data.checkout_url);
      } else {
        Alert.alert('Error', 'Failed to retrieve payment redirect from server.');
      }
    } catch (error) {
      Alert.alert('Payment Error', error.message || 'Could not initiate eSewa payment.');
    } finally {
      setSubscriptionActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'You will keep Pro benefits until the current period ends.',
      [
        { text: 'Keep Pro', style: 'cancel' },
        {
          text: 'Cancel Renewal',
          style: 'destructive',
          onPress: async () => {
            setSubscriptionActionLoading(true);
            try {
              await apiCall('/subscription/cancel/', 'POST', null, true);
              setRenewalCancelled(true);
              Alert.alert('Cancelled', 'Auto-renew is turned off.');
            } catch (error) {
              Alert.alert('Cancel Failed', error.message || 'Please try again.');
            } finally {
              setSubscriptionActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRenewSubscription = async () => {
    setSubscriptionActionLoading(true);
    try {
      const data = await apiCall('/subscription/renew/', 'POST', null, true);
      const next = data?.subscription ?? data;
      setSubscription(next);
      setRenewalCancelled(false);
      Alert.alert('✅ Renewed', 'Subscription extended by 30 days.');
    } catch (error) {
      Alert.alert('Renew Failed', error.message || 'Please try again.');
    } finally {
      setSubscriptionActionLoading(false);
    }
  };

  // ─────────────────────────────────────
  // AVATAR HELPERS
  // ─────────────────────────────────────
  const persistUser = async (nextUser) => {
    setUser(nextUser);
    await AsyncStorage.setItem('user', JSON.stringify(nextUser));
  };

  const updateAvatar = async (avatarUrl) => {
    const updated = await apiCall('/users/me/', 'PATCH', { avatar: avatarUrl }, true);
    await persistUser(updated);
  };

  const saveNotificationPrefs = async () => {
    const updated = await apiCall('/users/me/', 'PATCH', {
      notifyNewMeals: notifications.newMeals,
      notifyBookingUpdates: notifications.bookingUpdates,
      notifyReminders: notifications.reminders,
      notifyPromotions: notifications.promotions,
      notifyReviews: notifications.reviews,
    }, true);
    await persistUser(updated);
  };

  const requestPermission = async (type) => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '📷 Permission Required',
          'Enable camera permission in your phone Settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Enable gallery permission in your phone Settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickAvatarFromGallery = async () => {
    const ok = await requestPermission('gallery');
    if (!ok) return;
    setAvatarLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const localUri = result.assets[0].uri;
        const url = await uploadImageToCloudinary(localUri);
        if (!url) {
          Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
          return;
        }
        await updateAvatar(url);
        Alert.alert('✅ Updated', 'Profile photo updated!');
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const takeAvatarPhoto = async () => {
    const ok = await requestPermission('camera');
    if (!ok) return;
    setAvatarLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const localUri = result.assets[0].uri;
        const url = await uploadImageToCloudinary(localUri);
        if (!url) {
          Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
          return;
        }
        await updateAvatar(url);
        Alert.alert('✅ Updated', 'Profile photo updated!');
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const removeAvatar = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setAvatarLoading(true);
            try {
              await updateAvatar('');
              Alert.alert('✅ Done', 'Profile photo removed.');
            } catch {
              Alert.alert('Error', 'Failed to remove photo. Please try again.');
            } finally {
              setAvatarLoading(false);
            }
          },
        },
      ]
    );
  };

  const showAvatarOptions = () => {
    const options = [
      { text: 'Take Photo', onPress: takeAvatarPhoto },
      { text: 'Choose from Gallery', onPress: pickAvatarFromGallery },
    ];
    if (user?.avatar) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: removeAvatar,
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', 'Choose an option', options);
  };

  // ─────────────────────────────────────
  // PROFILE SAVE
  // ─────────────────────────────────────
  const handleSaveProfile = () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setUser({ ...user, ...editForm });
    setEditModalVisible(false);
    Alert.alert('✅ Success', 'Profile updated successfully!');
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  // ─────────────────────────────────────
  // REUSABLE MENU ITEM
  // ─────────────────────────────────────
  const MenuItem = ({ iconName, iconSource, label, value, onPress, color }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIconBox,
          { backgroundColor: (color || '#FF6B35') + '15' },
        ]}
      >
        {iconName ? (
          <Ionicons name={iconName} size={20} color={color || '#FF6B35'} />
        ) : (
          <Image source={iconSource} style={styles.menuIconImage} />
        )}
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {value && (
          <Text style={[styles.menuValue, { color: color || '#9E9E9E' }]}>
            {value}
          </Text>
        )}
        <Text style={styles.menuArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  // ─────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══════════════ HEADER ══════════════ */}
        <LinearGradient
          colors={['#FF6B35', '#FF8C42']}
          style={styles.header}
        >
          <View style={styles.profileSection}>

            {/* Avatar only - tap to change */}
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                onPress={showAvatarOptions}
                activeOpacity={0.85}
              >
                <UserAvatar
                  uri={user?.avatar}
                  name={displayName}
                  size={110}
                  loading={avatarLoading}
                  borderColor="#fff"
                  borderWidth={4}
                />
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.onlineDot} />
            </View>

            {/* ❌ REMOVED: changePhotoBtn */}
            {/* ❌ REMOVED: userEmail */}
            {/* ❌ REMOVED: editProfileBtn */}

            <View style={styles.nameRow}>
              <Text style={styles.userName}>{displayName}</Text>
              {isPro && (
                <View style={styles.proPill}>
                  <Text style={styles.proPillText}>PRO</Text>
                </View>
              )}
            </View>

            <Text style={styles.userUniversity}>
              <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.9)" /> {user?.university}
            </Text>

            {user?.bio ? (
              <Text style={styles.userBio}>{user.bio}</Text>
            ) : null}

            <View style={styles.ratingRow}>
              <RatingStars rating={user?.rating || 5} size={16} />
              <Text style={styles.ratingText}>
                {user?.rating?.toFixed(1)}
              </Text>
              <View
                style={[styles.badge, { backgroundColor: badge.color }]}
              >
                <Text style={styles.badgeText}>{badge.label}</Text>
              </View>
            </View>

          </View>
        </LinearGradient>

        {/* ══════════════ STATS ══════════════ */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{myMeals.length}</Text>
            <Text style={styles.statLabel}>Meals{'\n'}Shared</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeBookings.length}</Text>
            <Text style={styles.statLabel}>Active{'\n'}Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {user?.rating?.toFixed(1) || '5.0'}
            </Text>
            <Text style={styles.statLabel}>My{'\n'}Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Rs.{totalEarnings}</Text>
            <Text style={styles.statLabel}>Total{'\n'}Earned</Text>
          </View>
        </View>

        {/* ══════════════ ACTIVITY ══════════════ */}
        <View style={styles.activityCard}>
          <Text style={styles.activityTitle}>Activity Summary</Text>
          <View style={styles.activityRow}>
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => navigation.navigate('MyMeals', { initialTab: 'listings' })}
            >
              <Ionicons name="restaurant" size={24} color="#FF6B35" style={{ marginBottom: 4 }} />
              <Text style={styles.activityValue}>{myMeals.length}</Text>
              <Text style={styles.activityLabel}>Listed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => navigation.navigate('MyMeals', { initialTab: 'bookings' })}
            >
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={{ marginBottom: 4 }} />
              <Text style={styles.activityValue}>{activeBookings.length}</Text>
              <Text style={styles.activityLabel}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => navigation.navigate('MyMeals', { initialTab: 'bookings' })}
            >
              <Ionicons name="close-circle" size={24} color="#F44336" style={{ marginBottom: 4 }} />
              <Text style={styles.activityValue}>{cancelledBookings.length}</Text>
              <Text style={styles.activityLabel}>Cancelled</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => setReviewsModalVisible(true)}
            >
              <Ionicons name="star" size={24} color="#FFC107" style={{ marginBottom: 4 }} />
              <Text style={styles.activityValue}>{sellerReviews.length}</Text>
              <Text style={styles.activityLabel}>Reviews</Text>
            </TouchableOpacity>
          </View>
        </View>

    {/* ══════════════ PREMIUM PLANS ══════════════ */ }
    < View style = { styles.premiumCard } >
          <View style={styles.premiumHeader}>
            <Text style={styles.premiumTitle}>Premium Plans</Text>
            <View
              style={[
                styles.premiumBadge,
                isPro ? styles.premiumBadgePro : (subscription?.status === 'pending' ? styles.premiumBadgePending : (subscription?.status === 'rejected' ? styles.premiumBadgeRejected : styles.premiumBadgeFree)),
              ]}
            >
              <Text style={styles.premiumBadgeText}>
                {isPro ? 'PRO' : (subscription?.status === 'pending' ? 'PENDING' : (subscription?.status === 'rejected' ? 'REJECTED' : 'FREE'))}
              </Text>
            </View>
          </View>

          <Text style={styles.premiumPrice}>
            {isPro ? 'NPR 199 / month' : 'Upgrade to NPR 199 / month'}
          </Text>
          <Text style={styles.premiumSubtitle}>
            Boost your meals with priority visibility and AI preference.
          </Text>

          <View style={styles.premiumFeatureRow}>
            <Ionicons name="cloud-upload-outline" size={18} color="#FF6B35" style={{ marginRight: 10 }} />
            <Text style={styles.premiumFeatureText}>
              Meals pushed to top of Explore and Home
            </Text>
          </View>
          <View style={styles.premiumFeatureRow}>
            <Ionicons name="ribbon-outline" size={18} color="#FF6B35" style={{ marginRight: 10 }} />
            <Text style={styles.premiumFeatureText}>
              AI recommendations prioritize your meals
            </Text>
          </View>
          <View style={styles.premiumFeatureRow}>
            <Ionicons name="star-outline" size={18} color="#FF6B35" style={{ marginRight: 10 }} />
            <Text style={styles.premiumFeatureText}>
              Featured badge on your listings
            </Text>
          </View>

  {
    subscriptionLoading ? (
      <Text style={styles.premiumStatus}>Checking subscription...</Text>
    ) : (
      <Text style={styles.premiumStatus}>
        {isPro
          ? `Pro active • ${daysRemaining} days left`
          : (subscription?.status === 'pending'
            ? 'Upgrade request pending approval'
            : (subscription?.status === 'rejected'
              ? 'Previous request was rejected'
              : 'You are on the Free plan'))}
      </Text>
    )
  }

  {
    isPro && expiresLabel && (
      <Text style={styles.premiumExpiry}>Expires on {expiresLabel}</Text>
    )
  }

  {
    isPro ? (
      <View style={styles.premiumActions}>
        <TouchableOpacity
          style={[styles.premiumButton, styles.premiumButtonOutline]}
          onPress={handleCancelSubscription}
          disabled={subscriptionActionLoading}
        >
          <Text style={styles.premiumButtonOutlineText}>Cancel Renewal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.premiumButton}
          onPress={handleRenewSubscription}
          disabled={subscriptionActionLoading}
        >
          <Text style={styles.premiumButtonText}>Renew 30 Days</Text>
        </TouchableOpacity>
      </View>
    ) : subscription?.status === 'pending' ? (
      <TouchableOpacity
        style={[styles.premiumButton, styles.premiumButtonDisabled]}
        disabled={true}
      >
        <Text style={styles.premiumButtonText}>Verification in Progress</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={styles.premiumButton}
        onPress={handleUpgrade}
        disabled={subscriptionActionLoading}
      >
        <Text style={styles.premiumButtonText}>
          {subscription?.status === 'rejected' ? 'Retry Upgrade to Pro' : 'Upgrade to Pro'}
        </Text>
      </TouchableOpacity>
    )
  }

  <TouchableOpacity
    style={styles.premiumLearnMore}
    onPress={() =>
      Alert.alert(
        'Premium Plans',
        'Pro sellers get featured placement in Explore/Home and priority in AI recommendations for NPR 199/month.',
        [{ text: 'Got it' }]
      )
    }
  >
    <Text style={styles.premiumLearnMoreText}>Learn more</Text>
  </TouchableOpacity>
        </View >

    {/* ══════════════ MENU ══════════════ */ }
    <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>ACCOUNT</Text>
          <MenuItem
            iconName="person-outline"
            label="Edit Profile"
            color="#2196F3"
            onPress={() => setEditModalVisible(true)}
          />
          <MenuItem
            iconName="ribbon-outline"
            label="Premium Plans"
            value={isPro ? 'Pro Active' : 'Free Plan'}
            color="#FF6B35"
            onPress={() => setPremiumModalVisible(true)}
          />
          <MenuItem
            iconName="notifications-outline"
            label="Notifications"
            color="#9C27B0"
            onPress={() => setNotifModalVisible(true)}
          />
          <MenuItem
            iconName="shield-checkmark-outline"
            label="Privacy & Safety"
            color="#4CAF50"
            onPress={() => setPrivacyModalVisible(true)}
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>PREFERENCES</Text>
          <MenuItem
            iconName="restaurant-outline"
            label="Dietary Preferences"
            color="#4CAF50"
            onPress={() => setDietModalVisible(true)}
          />
          <MenuItem
            iconName="card-outline"
            label="Payment Methods"
            color="#FF6B35"
            onPress={() => setPaymentModalVisible(true)}
          />
          <MenuItem
            iconName="chatbubble-ellipses-outline"
            label="My Reviews"
            value={`${sellerReviews.length} reviews`}
            color="#FFC107"
            onPress={() => setReviewsModalVisible(true)}
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>SUPPORT</Text>
          <MenuItem
            iconName="help-circle-outline"
            label="Help & FAQ"
            color="#607D8B"
            onPress={() =>
              Alert.alert(
                'Help & FAQ',
                'Common Questions:\n\n• How do I book a meal?\nBrowse meals → tap one → Book Now\n\n• How do I list a meal?\nTap + tab → fill details → List My Meal\n\n• Cancellation fee?\n30% of total booking amount\n\nContact: support@plato.edu.np',
                [{ text: 'Got it!' }]
              )
            }
          />
          <MenuItem
            iconName="mail-outline"
            label="Contact Us"
            color="#607D8B"
            onPress={() =>
              Alert.alert(
                'Contact Us',
                'Email: support@plato.edu.np\nPhone: +977-01-XXXXXXX\nHours: Mon–Fri 9AM–6PM\n\nResponse time: Within 24 hours',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Send Email',
                    onPress: () =>
                      Linking.openURL('mailto:support@plato.edu.np'),
                  },
                ]
              )
            }
          />
          <MenuItem
            iconName="information-circle-outline"
            label="About Plato"
            color="#607D8B"
            onPress={() =>
              Alert.alert(
                'About Plato v1.0.0',
                'Peer-to-peer meal sharing for students.\n\nBuilt by:\n• Aarnav Dahal — PM & AI\n• Aditya Dev Joshi — Backend\n• Nabin Chamlagai — UI/UX\n• Suraj Patel — Frontend\n\nMade with ❤️ for students in Nepal',
                [{ text: 'Close', style: 'cancel' }]
              )
            }
          />
        </View>

  {/* ══════════════ LOGOUT ══════════════ */ }
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF5252" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Plato v1.0.0</Text>
          <Text style={styles.footerSubText}>
            Made with ❤️ for students in Nepal
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView >

  {/* ══════════════════════════════════════
          EDIT PROFILE MODAL
      ══════════════════════════════════════ */}
    <Modal
      visible={editModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close-circle" size={22} color="#9E9E9E" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Avatar picker inside modal */}
            <View style={styles.modalAvatarSection}>
              <TouchableOpacity
                onPress={showAvatarOptions}
                style={styles.modalAvatarTouchable}
              >
                <UserAvatar
                  uri={user?.avatar}
                  name={user?.name}
                  size={90}
                  loading={avatarLoading}
                  borderColor="#FF6B35"
                  borderWidth={3}
                />
                <View style={styles.modalCameraOverlay}>
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                </View>
              </TouchableOpacity>

              <View style={styles.modalAvatarButtons}>
                <TouchableOpacity
                  style={styles.modalAvatarBtn}
                  onPress={takeAvatarPhoto}
                >
                  <View style={styles.modalAvatarBtnIconWrap}>
                    <Ionicons name="scan-outline" size={16} color="#FF6B35" />
                  </View>
                  <Text style={styles.modalAvatarBtnText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalAvatarBtn}
                  onPress={pickAvatarFromGallery}
                >
                  <View style={styles.modalAvatarBtnIconWrap}>
                    <Ionicons name="images-outline" size={16} color="#FF6B35" />
                  </View>
                  <Text style={styles.modalAvatarBtnText}>Gallery</Text>
                </TouchableOpacity>

                {user?.avatar && (
                  <TouchableOpacity
                    style={[styles.modalAvatarBtn, styles.modalAvatarBtnRed]}
                    onPress={removeAvatar}
                  >
                    <View style={[styles.modalAvatarBtnIconWrap, { backgroundColor: '#FFF0F0' }]}>
                      <Ionicons name="close" size={16} color="#FF5252" />
                    </View>
                    <Text style={[styles.modalAvatarBtnText, { color: '#FF5252' }]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {!user?.avatar && (
                <View style={styles.noAvatarInfo}>
                  <Text style={styles.noAvatarInfoText}>
                    Your name initial is shown when no photo is set
                  </Text>
                </View>
              )}
            </View>

            {/* Name */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.name}
                onChangeText={(t) => setEditForm({ ...editForm, name: t })}
                placeholder="Your full name"
                placeholderTextColor="#BDBDBD"
              />
            </View>

            {/* University */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>University / College</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.university}
                onChangeText={(t) => setEditForm({ ...editForm, university: t })}
                placeholder="e.g. Kathmandu University"
                placeholderTextColor="#BDBDBD"
              />
            </View>

            {/* Bio */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Bio</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMulti]}
                value={editForm.bio}
                onChangeText={(t) => setEditForm({ ...editForm, bio: t })}
                placeholder="Tell others about yourself..."
                placeholderTextColor="#BDBDBD"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Email (readonly) */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Email</Text>
              <View style={styles.modalInputDisabled}>
                <Text style={styles.modalInputDisabledText}>
                  {user?.email}
                </Text>
              </View>
              <Text style={styles.modalHint}>🔒 Email cannot be changed</Text>
            </View>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveProfile}
            >
              <LinearGradient
                colors={['#FF6B35', '#FF8C42']}
                style={styles.modalSaveGradient}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      </Modal >

  {/* ══════════════════════════════════════
          NOTIFICATIONS MODAL
      ══════════════════════════════════════ */}
    <Modal
      visible={notifModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setNotifModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
              <Ionicons name="close-circle" size={22} color="#9E9E9E" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Choose what notifications you receive
          </Text>

          {[
            { key: 'newMeals', label: 'New Meals Available', desc: 'When new meals are posted near you', icon: 'restaurant-outline' },
            { key: 'bookingUpdates', label: 'Booking Updates', desc: 'Confirmations and cancellations', icon: 'receipt-outline' },
            { key: 'reminders', label: 'Meal Reminders', desc: 'Pickup time reminders', icon: 'time-outline' },
            { key: 'reviews', label: 'New Reviews', desc: 'When someone reviews your meal', icon: 'star-outline' },
            { key: 'promotions', label: 'Promotions', desc: 'Deals and special offers', icon: 'gift-outline' },
          ].map((item) => (
            <View key={item.key} style={styles.notifRow}>
              <Ionicons name={item.icon} size={22} color="#757575" style={{ marginRight: 12, width: 24, textAlign: 'center' }} />
              <View style={styles.notifInfo}>
                <Text style={styles.notifLabel}>{item.label}</Text>
                <Text style={styles.notifDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={notifications[item.key]}
                onValueChange={(v) =>
                  setNotifications({ ...notifications, [item.key]: v })
                }
                trackColor={{ false: '#E0E0E0', true: '#FF6B35' }}
                thumbColor="#fff"
              />
            </View>
          ))}

          <View style={styles.notifSectionHeader}>
            <Text style={styles.notifSectionTitle}>Recent Notifications</Text>
            <TouchableOpacity onPress={() => loadNotifications()}>
              <Text style={styles.notifRefresh}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {notificationsList.length === 0 ? (
            <View style={styles.notifEmptyState}>
              <Ionicons name="notifications-outline" size={48} color="#BDBDBD" style={{ marginBottom: 12 }} />
              <Text style={styles.notifEmptyTitle}>No notifications yet</Text>
              <Text style={styles.notifEmptySubtitle}>
                Updates will appear here based on your preferences.
              </Text>
            </View>
          ) : (
            notificationsList.slice(0, 10).map((n) => (
              <View key={n.id} style={styles.notifItem}>
                {!n.isRead && <View style={styles.notifDot} />}
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMessage}>{n.message}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(n.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={async () => {
              try {
                await saveNotificationPrefs();
                setNotifModalVisible(false);
                Alert.alert('✅ Saved', 'Notification preferences updated!');
              } catch (error) {
                Alert.alert('Error', error.message || 'Failed to save preferences.');
              }
            }}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF8C42']}
              style={styles.modalSaveGradient}
            >
              <Text style={styles.modalSaveText}>Save Preferences</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      </Modal >

  {/* ══════════════════════════════════════
          DIETARY MODAL
      ══════════════════════════════════════ */}
    <Modal
      visible={dietModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setDietModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dietary Preferences</Text>
            <TouchableOpacity onPress={() => setDietModalVisible(false)}>
              <Ionicons name="close-circle" size={22} color="#9E9E9E" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Set your dietary needs for better meal recommendations
          </Text>

          {[
            { key: 'vegetarian', label: 'Vegetarian', desc: 'No meat or fish', icon: 'leaf-outline' },
            { key: 'vegan', label: 'Vegan', desc: 'No animal products at all', icon: 'nutrition-outline' },
            { key: 'glutenFree', label: 'Gluten Free', desc: 'No wheat, barley or rye', icon: 'leaf-outline' },
            { key: 'dairyFree', label: 'Dairy Free', desc: 'No milk or dairy products', icon: 'water-outline' },
            { key: 'nutFree', label: 'Nut Free', desc: 'No nuts or nut products', icon: 'shield-checkmark-outline' },
            { key: 'halal', label: 'Halal', desc: 'Halal certified ingredients only', icon: 'checkmark-circle-outline' },
          ].map((item) => (
            <View key={item.key} style={styles.notifRow}>
              <Ionicons name={item.icon} size={22} color="#757575" style={{ marginRight: 12, width: 24, textAlign: 'center' }} />
              <View style={styles.notifInfo}>
                <Text style={styles.notifLabel}>{item.label}</Text>
                <Text style={styles.notifDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={dietary[item.key]}
                onValueChange={(v) =>
                  setDietary({ ...dietary, [item.key]: v })
                }
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor="#fff"
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={() => {
              setDietModalVisible(false);
              Alert.alert(
                '✅ Saved',
                'Dietary preferences updated! AI will now recommend better meals.'
              );
            }}
          >
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              style={styles.modalSaveGradient}
            >
              <Text style={styles.modalSaveText}>Save Preferences</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      </Modal >

  {/* ══════════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════════ */}
    <Modal
      visible={paymentModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setPaymentModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Methods</Text>
            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
              <Ionicons name="close-circle" size={22} color="#9E9E9E" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Your saved payment methods
          </Text>

          {savedPayments.map((pm) => (
            <View key={pm.id} style={styles.paymentRow}>
              <View
                style={[
                  styles.paymentIconBox,
                  { backgroundColor: pm.color + '20' },
                ]}
              >
                <Ionicons name={pm.icon} size={20} color={pm.color} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentType}>{pm.type}</Text>
                <Text style={styles.paymentNumber}>{pm.number}</Text>
              </View>
              <View style={styles.paymentActiveBadge}>
                <Text style={styles.paymentActiveText}>Active</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addPaymentButton}
            onPress={() =>
              Alert.alert(
                'Add Payment Method',
                'Choose a method to add:',
                [
                  {
                    text: 'eSewa',
                    onPress: () =>
                      Alert.alert('eSewa', 'eSewa integration coming soon!'),
                  },
                  {
                    text: 'Khalti',
                    onPress: () =>
                      Alert.alert('Khalti', 'Khalti integration coming soon!'),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              )
            }
          >
            <Text style={styles.addPaymentText}>
              Add New Payment Method
            </Text>
          </TouchableOpacity>

          <View style={styles.paymentNote}>
            <Text style={styles.paymentNoteText}>
              Your payment info is encrypted and secure. Plato never stores your full card details.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={() => setPaymentModalVisible(false)}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF8C42']}
              style={styles.modalSaveGradient}
            >
              <Text style={styles.modalSaveText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      </Modal >

  {/* ══════════════════════════════════════
          REVIEWS MODAL
      ══════════════════════════════════════ */}
    <Modal
      visible={reviewsModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setReviewsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Reviews</Text>
            <TouchableOpacity onPress={() => setReviewsModalVisible(false)}>
              <Ionicons name="close-circle" size={22} color="#9E9E9E" />
            </TouchableOpacity>
          </View>

          <View style={styles.reviewSummary}>
            <Text style={styles.reviewBigRating}>
              {user?.rating?.toFixed(1)}
            </Text>
            <RatingStars rating={user?.rating || 5} size={22} />
            <Text style={styles.reviewCount}>
              Based on {sellerReviews.length} reviews
            </Text>
          </View>

          <ScrollView
            style={styles.reviewsList}
            showsVerticalScrollIndicator={false}
          >
            {sellerReviews.length === 0 ? (
              <View style={styles.reviewEmptyState}>
                <Ionicons name="star-outline" size={48} color="#BDBDBD" />
                <Text style={styles.reviewEmptyTitle}>No reviews yet</Text>
                <Text style={styles.reviewEmptySubtitle}>
                  Reviews from buyers will appear here.
                </Text>
              </View>
            ) : sellerReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  {review.reviewerAvatar ? (
                    <Image
                      source={{ uri: review.reviewerAvatar }}
                      style={styles.reviewAvatar}
                    />
                  ) : (
                    <View style={[styles.reviewAvatar, styles.reviewAvatarPlaceholder]}>
                      <Ionicons name="person" size={24} color="#9E9E9E" />
                    </View>
                  )}
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewerName}>
                      {review.reviewerName || 'Anonymous'}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.reviewStarsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Text
                        key={s}
                        style={{
                          fontSize: 13,
                          color: s <= review.rating ? '#FFC107' : '#E0E0E0',
                        }}
                      >
                        ★
                      </Text>
                    ))}
                  </View>
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={() => setReviewsModalVisible(false)}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF8C42']}
              style={styles.modalSaveGradient}
            >
              <Text style={styles.modalSaveText}>Close</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      </Modal >

  {/* ══════════════════════════════════════
          PREMIUM MODAL
      ══════════════════════════════════════ */}
    <Modal
      visible={premiumModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setPremiumModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>💎 Premium Plans</Text>
            <TouchableOpacity onPress={() => setPremiumModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.premiumModalHeaderRow}>
            <Text style={styles.premiumModalTitle}>Plato Pro</Text>
            <View
              style={[
                styles.premiumBadge,
                isPro ? styles.premiumBadgePro : (subscription?.status === 'pending' ? styles.premiumBadgePending : (subscription?.status === 'rejected' ? styles.premiumBadgeRejected : styles.premiumBadgeFree)),
              ]}
            >
              <Text style={styles.premiumBadgeText}>
                {isPro ? 'ACTIVE' : (subscription?.status === 'pending' ? 'PENDING' : (subscription?.status === 'rejected' ? 'REJECTED' : 'FREE'))}
              </Text>
            </View>
          </View>

          <Text style={styles.premiumPrice}>NPR 199 / month</Text>
          <Text style={styles.premiumSubtitle}>
            Featured placement and AI priority to grow your sales.
          </Text>

          <View style={styles.premiumFeatureRow}>
            <Ionicons name="cloud-upload-outline" size={18} color="#FF6B35" style={{ marginRight: 10 }} />
            <Text style={styles.premiumFeatureText}>
              Meals pushed to top of Explore and Home
            </Text>
          </View>
          <View style={styles.premiumFeatureRow}>
            <Text style={styles.premiumFeatureIcon}>🤖</Text>
            <Text style={styles.premiumFeatureText}>
              AI recommendations prioritize your meals
            </Text>
          </View>
          <View style={styles.premiumFeatureRow}>
            <Ionicons name="star-outline" size={18} color="#FF6B35" style={{ marginRight: 10 }} />
            <Text style={styles.premiumFeatureText}>
              Featured badge on your listings
            </Text>
          </View>

          {subscriptionLoading ? (
            <Text style={styles.premiumStatus}>Checking subscription...</Text>
          ) : (
            <Text style={styles.premiumStatus}>
              {isPro
                ? (renewalCancelled
                  ? 'Pro active • renewal cancelled'
                  : `Pro active • ${daysRemaining} days left`)
                : (subscription?.status === 'pending'
                  ? 'Upgrade request pending approval'
                  : (subscription?.status === 'rejected'
                    ? 'Previous request was rejected'
                    : 'You are on the Free plan'))}
            </Text>
          )}

          {isPro && expiresLabel && (
            <Text style={styles.premiumExpiry}>Expires on {expiresLabel}</Text>
          )}

          {isPro ? (
            <View style={styles.premiumActions}>
              <TouchableOpacity
                style={[styles.premiumButton, styles.premiumButtonOutline]}
                onPress={handleCancelSubscription}
                disabled={subscriptionActionLoading}
              >
                <Text style={styles.premiumButtonOutlineText}>Cancel Renewal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.premiumButton}
                onPress={handleRenewSubscription}
                disabled={subscriptionActionLoading}
              >
                <Text style={styles.premiumButtonText}>Renew 30 Days</Text>
              </TouchableOpacity>
            </View>
          ) : subscription?.status === 'pending' ? (
            <TouchableOpacity
              style={[styles.premiumButton, styles.premiumButtonDisabled]}
              disabled={true}
            >
              <Text style={styles.premiumButtonText}>Verification in Progress</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.premiumButton}
              onPress={handleUpgrade}
              disabled={subscriptionActionLoading}
            >
              <Text style={styles.premiumButtonText}>
                {subscription?.status === 'rejected' ? 'Retry Upgrade to Pro' : 'Upgrade to Pro'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={() => setPremiumModalVisible(false)}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF8C42']}
              style={styles.modalSaveGradient}
            >
              <Text style={styles.modalSaveText}>Close</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      </Modal >

  {/* ══════════════════════════════════════
          PRO UPGRADE / PAYMENT REFERENCE MODAL
      ══════════════════════════════════════ */}
      <Modal
        visible={proUpgradeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProUpgradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💳 Pro Payment Verify</Text>
              <TouchableOpacity onPress={() => setProUpgradeModalVisible(false)}>
                <Ionicons name="close-circle" size={22} color="#9E9E9E" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.paymentInstructionsTitle}>Instructions:</Text>
              <Text style={styles.paymentInstructionsText}>
                Please transfer <Text style={{ fontWeight: 'bold' }}>NPR 199</Text> to our official eSewa or Khalti account:
              </Text>
              
              <View style={styles.paymentMethodBox}>
                <View style={styles.paymentDetailsRow}>
                  <Text style={styles.paymentMethodLabel}>🟢 eSewa ID:</Text>
                  <Text style={styles.paymentMethodValue}>9812345678</Text>
                </View>
                <View style={styles.paymentDetailsRow}>
                  <Text style={styles.paymentMethodLabel}>🟣 Khalti ID:</Text>
                  <Text style={styles.paymentMethodValue}>9812345678</Text>
                </View>
              </View>

              <Text style={styles.paymentInstructionsText}>
                After payment completion, enter your transaction reference ID below to submit for manual approval:
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Transaction ID / Ref Code</Text>
                <TextInput
                  style={styles.textInput}
                  value={paymentRef}
                  onChangeText={setPaymentRef}
                  placeholder="e.g. 8X3Y9Z2W"
                  autoCapitalize="characters"
                />
              </View>

              <TouchableOpacity
                style={styles.submitRequestButton}
                onPress={submitUpgradeRequest}
                disabled={subscriptionActionLoading}
              >
                {subscriptionActionLoading ? (
                  <Text style={styles.submitRequestButtonText}>Submitting...</Text>
                ) : (
                  <Text style={styles.submitRequestButtonText}>Submit Reference ID</Text>
                )}
              </TouchableOpacity>

              <View style={{ marginVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontWeight: 'bold', fontSize: 13 }}>— OR —</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitRequestButton, { backgroundColor: '#60bb46', borderSide: 'none' }]}
                onPress={handleEsewaUpgrade}
                disabled={subscriptionActionLoading}
              >
                <Text style={styles.submitRequestButtonText}>🟢 Pay Instantly with eSewa (UAT)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

  {/* ══════════════════════════════════════
          PRIVACY MODAL
      ══════════════════════════════════════ */}
    <Modal
      visible={privacyModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setPrivacyModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy & Safety</Text>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
              <Ionicons name="close-circle" size={22} color="#9E9E9E" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              {
                icon: 'person-circle-outline',
                title: 'Profile Visibility',
                desc: 'Your profile is visible to all Plato users on your campus. Your email is never shown publicly.',
              },
              {
                icon: 'location-outline',
                title: 'Location Privacy',
                desc: 'Only your pickup location for active meals is shared. Your home address is never stored.',
              },
              {
                icon: 'card-outline',
                title: 'Payment Security',
                desc: 'All payments are processed securely. Plato never stores card details.',
              },
              {
                icon: 'stats-chart-outline',
                title: 'Data Usage',
                desc: 'We use your meal history to improve AI recommendations. Your data is never sold.',
              },
            ].map((item, index) => (
              <View key={index} style={styles.privacyItem}>
                <Ionicons name={item.icon} size={24} color="#FF6B35" style={{ marginRight: 14 }} />
                <View style={styles.privacyContent}>
                  <Text style={styles.privacyTitle}>{item.title}</Text>
                  <Text style={styles.privacyDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.reportButton}
              onPress={() =>
                Alert.alert(
                  'Report a User',
                  'To report:\n\nEmail: safety@plato.edu.np\nInclude the username and issue description.\n\nWe respond within 24 hours.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Send Report',
                      onPress: () =>
                        Linking.openURL('mailto:safety@plato.edu.np'),
                    },
                  ]
                )
              }
            >
              <View style={styles.actionButtonRow}>
                <View style={styles.actionButtonIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#FF6B35" />
                </View>
                <Text style={styles.reportButtonText}>Report a User</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() =>
                Alert.alert(
                  'Delete Account',
                  'This will permanently delete your account.\n\nEmail: delete@plato.edu.np to request deletion.',
                  [{ text: 'OK' }]
                )
              }
            >
              <View style={styles.actionButtonRow}>
                <View style={[styles.actionButtonIconWrap, { backgroundColor: '#FFF0F0' }]}>
                  <Ionicons name="trash-outline" size={18} color="#FF5252" />
                </View>
                <Text style={styles.deleteButtonText}>Request Account Deletion</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={() => setPrivacyModalVisible(false)}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF8C42']}
              style={styles.modalSaveGradient}
            >
              <Text style={styles.modalSaveText}>Close</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      </Modal >
    </View >
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileSection: { alignItems: 'center', width: '100%' },

  // Avatar
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FF6B35',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 4,
  },
  onlineDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    marginTop: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proPill: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  proPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.6,
  },
  userUniversity: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 6,
  },
  userBio: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  ratingText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Stats
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#9E9E9E',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  statDivider: { width: 1, backgroundColor: '#F0F0F0' },

  // Activity
  activityCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    elevation: 2,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  activityItem: { alignItems: 'center' },
  activityValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 11,
    color: '#9E9E9E',
    fontWeight: '500',
  },

  // Premium
  premiumCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    elevation: 2,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  premiumModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  premiumModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgePro: { backgroundColor: '#FF6B35' },
  premiumBadgePending: { backgroundColor: '#F59E0B' },
  premiumBadgeRejected: { backgroundColor: '#EF4444' },
  premiumBadgeFree: { backgroundColor: '#BDBDBD' },
  premiumButtonDisabled: { backgroundColor: '#BDBDBD' },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.6,
  },
  premiumPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 6,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    marginBottom: 12,
  },
  premiumFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  premiumFeatureText: {
    fontSize: 13,
    color: '#424242',
    flex: 1,
  },
  premiumStatus: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 10,
  },
  premiumExpiry: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 4,
  },
  premiumActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  premiumButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  premiumButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  premiumButtonOutlineText: {
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: 14,
  },
  premiumLearnMore: {
    marginTop: 10,
    alignItems: 'center',
  },
  premiumLearnMoreText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },

  // SDG
  sdgCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    elevation: 2,
  },
  sdgTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  sdgRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  sdgBadge: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  sdgEmoji: { fontSize: 22, marginBottom: 6 },
  sdgLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#424242',
    textAlign: 'center',
  },
  impactBar: { marginTop: 4 },
  impactBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  impactBarTrack: {
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  impactBarFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 5,
    minWidth: 10,
  },
  impactBarValue: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 6,
  },

  // Menu
  menuSection: { marginHorizontal: 16, marginTop: 16 },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9E9E9E',
    marginBottom: 10,
    letterSpacing: 1,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    gap: 12,
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuValue: { fontSize: 13, fontWeight: '600' },
  menuArrow: { fontSize: 22, color: '#BDBDBD' },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    gap: 10,
  },
  logoutIconImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#FF5252' },

  // Footer
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: {
    fontSize: 13,
    color: '#BDBDBD',
    fontWeight: '600',
  },
  footerSubText: { fontSize: 12, color: '#BDBDBD', marginTop: 4 },

  // Modal Base
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalCloseIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#9E9E9E',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9E9E9E',
    marginBottom: 20,
    lineHeight: 20,
  },

  // Edit profile modal avatar
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatarTouchable: {
    position: 'relative',
    marginBottom: 16,
  },
  modalCameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B35',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalCameraIcon: { /* deprecated – using Ionicons now */ },
  modalAvatarBtnIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  modalAvatarButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalAvatarBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#FFD5C2',
    gap: 4,
  },
  modalAvatarBtnRed: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFCDD2',
  },
  modalAvatarBtnIcon: { fontSize: 20 },
  modalAvatarBtnIconImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#FF5252',
  },
  modalAvatarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  noAvatarInfo: {
    marginTop: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 10,
  },
  noAvatarInfoText: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
  },

  // Form fields
  modalField: { marginBottom: 16 },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212121',
    backgroundColor: '#FAFAFA',
    fontWeight: '500',
  },
  modalInputMulti: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalInputDisabled: {
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  modalInputDisabledText: { fontSize: 15, color: '#BDBDBD' },
  modalHint: { fontSize: 12, color: '#BDBDBD', marginTop: 5 },
  modalSaveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    elevation: 3,
  },
  modalSaveGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 16,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Notifications
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  notifIcon: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  notifInfo: { flex: 1 },
  notifLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  notifDesc: { fontSize: 12, color: '#9E9E9E' },
  notifSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  notifSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#424242',
  },
  notifRefresh: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  notifEmptyState: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  notifEmptyEmoji: { fontSize: 26, marginBottom: 6 },
  notifEmptyTitle: { fontSize: 14, fontWeight: '700', color: '#424242' },
  notifEmptySubtitle: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 4,
  },
  notifItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginTop: 6,
  },
  notifContent: { flex: 1 },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 12,
    color: '#616161',
  },
  notifTime: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 4,
  },

  // Payment
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  paymentIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentIcon: { fontSize: 22 },
  paymentInfo: { flex: 1 },
  paymentType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  paymentNumber: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 2,
  },
  paymentActiveBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  paymentActiveText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '700',
  },
  addPaymentButton: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addPaymentText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
  },
  paymentNote: {
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  paymentNoteText: {
    fontSize: 12,
    color: '#FF6B35',
    lineHeight: 18,
  },

  // Reviews
  reviewSummary: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  reviewBigRating: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FF6B35',
  },
  reviewCount: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 6,
  },
  reviewsList: { maxHeight: 300 },
  reviewCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewAvatarPlaceholder: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarPlaceholderText: { fontSize: 16 },
  reviewMeta: { flex: 1 },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewDate: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 1,
  },
  reviewStarsRow: { flexDirection: 'row', gap: 1 },
  reviewComment: {
    fontSize: 13,
    color: '#616161',
    lineHeight: 20,
  },
  reviewEmptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  reviewEmptyEmoji: { fontSize: 28, marginBottom: 8 },
  reviewEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 4,
  },
  reviewEmptySubtitle: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
  },

  // Privacy
  privacyItem: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 12,
  },
  privacyIcon: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  privacyContent: { flex: 1 },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  privacyDesc: {
    fontSize: 13,
    color: '#757575',
    lineHeight: 20,
  },
  reportButton: {
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5252',
  },
  actionButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  paymentInstructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 10,
    marginBottom: 6,
  },
  paymentInstructionsText: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
    marginBottom: 12,
  },
  paymentMethodBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  paymentDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  paymentMethodValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1A202C',
    backgroundColor: '#FFF',
    height: 44,
  },
  submitRequestButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitRequestButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});