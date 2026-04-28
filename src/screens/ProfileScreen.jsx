import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { getReliabilityBadge } from '../utils/helpers';
import RatingStars from '../components/RatingStars';
import UserAvatar from '../components/UserAvatar';

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
  const { user, logout, meals, bookings, setUser } = useApp();

  const myMeals = meals.filter((m) => m.sellerId === user?.id);
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
  const badge = getReliabilityBadge(user?.rating || 5);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [dietModalVisible, setDietModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

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
    { id: '1', type: 'eSewa', number: '98XXXXXXXX', icon: '💚', color: '#4CAF50' },
    { id: '2', type: 'Khalti', number: '98XXXXXXXX', icon: '💜', color: '#9C27B0' },
  ];

  const mockReviews = [
    { id: '1', reviewer: 'Nabin C.', rating: 5, comment: 'Amazing dal bhat! Very fresh and tasty.', date: '2025-01-15', avatar: 'https://i.pravatar.cc/150?img=3' },
    { id: '2', reviewer: 'Suraj P.', rating: 4, comment: 'Good momos, slightly spicy but loved it!', date: '2025-01-12', avatar: 'https://i.pravatar.cc/150?img=4' },
    { id: '3', reviewer: 'Aditya J.', rating: 5, comment: 'Best home-cooked food on campus!', date: '2025-01-10', avatar: 'https://i.pravatar.cc/150?img=5' },
    { id: '4', reviewer: 'Priya S.', rating: 4, comment: 'Loved the pasta. Will book again!', date: '2025-01-08', avatar: 'https://i.pravatar.cc/150?img=6' },
  ];

  const totalEarnings = myMeals.reduce(
    (sum, meal) => sum + meal.pricePerPortion * meal.bookings,
    0
  );

  // ─────────────────────────────────────
  // AVATAR HELPERS
  // ─────────────────────────────────────
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
          '🖼️ Permission Required',
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
        setUser({ ...user, avatar: result.assets[0].uri });
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
        setUser({ ...user, avatar: result.assets[0].uri });
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
      '🗑️ Remove Photo',
      'Your profile will show your name initial instead of a photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setUser({ ...user, avatar: null });
            Alert.alert('✅ Done', 'Profile photo removed.');
          },
        },
      ]
    );
  };

  const showAvatarOptions = () => {
    const options = [
      { text: '📷 Take Photo', onPress: takeAvatarPhoto },
      { text: '🖼️ Choose from Gallery', onPress: pickAvatarFromGallery },
    ];
    if (user?.avatar) {
      options.push({
        text: '🗑️ Remove Photo',
        style: 'destructive',
        onPress: removeAvatar,
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('📸 Profile Photo', 'Choose an option', options);
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
  const MenuItem = ({ iconSource, label, value, onPress, color }) => (
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
        <Image source={iconSource} style={styles.menuIconImage} />
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
                  name={user?.name}
                  size={110}
                  loading={avatarLoading}
                  borderColor="#fff"
                  borderWidth={4}
                />
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraBadgeIcon}>📷</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.onlineDot} />
            </View>

            {/* ❌ REMOVED: changePhotoBtn */}
            {/* ❌ REMOVED: userEmail */}
            {/* ❌ REMOVED: editProfileBtn */}

            <Text style={styles.userName}>{user?.name}</Text>

            <Text style={styles.userUniversity}>
              🎓 {user?.university}
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
          <Text style={styles.activityTitle}>📊 Activity Summary</Text>
          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <Text style={styles.activityEmoji}>🍽️</Text>
              <Text style={styles.activityValue}>{myMeals.length}</Text>
              <Text style={styles.activityLabel}>Listed</Text>
            </View>
            <View style={styles.activityItem}>
              <Image source={PROFILE_ICONS.dietary} style={styles.activityIconImage} />
              <Text style={styles.activityValue}>
                {activeBookings.length}
              </Text>
              <Text style={styles.activityLabel}>Active</Text>
            </View>
            <View style={styles.activityItem}>
              <Text style={styles.activityEmoji}>❌</Text>
              <Text style={styles.activityValue}>
                {cancelledBookings.length}
              </Text>
              <Text style={styles.activityLabel}>Cancelled</Text>
            </View>
            <View style={styles.activityItem}>
              <Text style={styles.activityEmoji}>⭐</Text>
              <Text style={styles.activityValue}>
                {mockReviews.length}
              </Text>
              <Text style={styles.activityLabel}>Reviews</Text>
            </View>
          </View>
        </View>

        {/* ══════════════ SDG IMPACT ══════════════ */}
        <View style={styles.sdgCard}>
          <Text style={styles.sdgTitle}>🌍 Your SDG Impact</Text>
          <View style={styles.sdgRow}>
            <View
              style={[styles.sdgBadge, { backgroundColor: '#FFC10715' }]}
            >
              <Text style={styles.sdgEmoji}>🌾</Text>
              <Text style={styles.sdgLabel}>SDG 2{'\n'}Zero Hunger</Text>
            </View>
            <View
              style={[styles.sdgBadge, { backgroundColor: '#4CAF5015' }]}
            >
              <Text style={styles.sdgEmoji}>❤️</Text>
              <Text style={styles.sdgLabel}>SDG 3{'\n'}Good Health</Text>
            </View>
            <View
              style={[styles.sdgBadge, { backgroundColor: '#FF6B3515' }]}
            >
              <Text style={styles.sdgEmoji}>♻️</Text>
              <Text style={styles.sdgLabel}>SDG 12{'\n'}Responsible</Text>
            </View>
          </View>
          <View style={styles.impactBar}>
            <Text style={styles.impactBarLabel}>
              Community Impact Score
            </Text>
            <View style={styles.impactBarTrack}>
              <View
                style={[
                  styles.impactBarFill,
                  {
                    width: `${Math.min(
                      (myMeals.length / 10) * 100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.impactBarValue}>
              {myMeals.length}/10 meals to next level
            </Text>
          </View>
        </View>

        {/* ══════════════ MENU ══════════════ */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>ACCOUNT</Text>
          <MenuItem
            iconSource={PROFILE_ICONS.user}
            label="Edit Profile"
            color="#2196F3"
            onPress={() => setEditModalVisible(true)}
          />
          <MenuItem
            iconSource={PROFILE_ICONS.bell}
            label="Notifications"
            color="#9C27B0"
            onPress={() => setNotifModalVisible(true)}
          />
          <MenuItem
            iconSource={PROFILE_ICONS.safety}
            label="Privacy & Safety"
            color="#4CAF50"
            onPress={() => setPrivacyModalVisible(true)}
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>PREFERENCES</Text>
          <MenuItem
            iconSource={PROFILE_ICONS.dietary}
            label="Dietary Preferences"
            color="#4CAF50"
            onPress={() => setDietModalVisible(true)}
          />
          <MenuItem
            iconSource={PROFILE_ICONS.payment}
            label="Payment Methods"
            color="#FF6B35"
            onPress={() => setPaymentModalVisible(true)}
          />
          <MenuItem
            iconSource={PROFILE_ICONS.rating}
            label="My Reviews"
            value={`${mockReviews.length} reviews`}
            color="#FFC107"
            onPress={() => setReviewsModalVisible(true)}
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>SUPPORT</Text>
          <MenuItem
            iconSource={PROFILE_ICONS.faq}
            label="Help & FAQ"
            color="#607D8B"
            onPress={() =>
              Alert.alert(
                '❓ Help & FAQ',
                'Common Questions:\n\n• How do I book a meal?\nBrowse meals → tap one → Book Now\n\n• How do I list a meal?\nTap + tab → fill details → List My Meal\n\n• Cancellation fee?\n30% of total booking amount\n\nContact: support@plato.edu.np',
                [{ text: 'Got it!' }]
              )
            }
          />
          {/* <MenuItem
            icon="📄"
            label="Terms of Service"
            color="#607D8B"
            onPress={() =>
              Alert.alert(
                '📄 Terms of Service',
                '1. Share only safe and hygienic food\n2. Honour your meal commitments\n3. 30% cancellation fee applies\n4. Respect all community members\n5. Do not misuse the rating system\n6. Plato is not liable for food quality disputes',
                [{ text: 'I Understand' }]
              )
            }
          /> */}
          <MenuItem
            iconSource={PROFILE_ICONS.contact}
            label="Contact Us"
            color="#607D8B"
            onPress={() =>
              Alert.alert(
                '📧 Contact Us',
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
            iconSource={PROFILE_ICONS.info}
            label="About Plato"
            color="#607D8B"
            onPress={() =>
              Alert.alert(
                'ℹ️ About Plato v1.0.0',
                'Peer-to-peer meal sharing for students.\n\nAligned with:\n🌾 SDG 2 — Zero Hunger\n❤️ SDG 3 — Good Health\n♻️ SDG 12 — Responsible Consumption\n\nBuilt by:\n• Aarnav Dahal — PM & AI\n• Aditya Dev Joshi — Backend\n• Nabin Chamlagai — UI/UX\n• Suraj Patel — Frontend\n\nMade with ❤️ in Nepal',
                [{ text: 'Close' }]
              )
            }
          />
        </View>

        {/* ══════════════ LOGOUT ══════════════ */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Image source={PROFILE_ICONS.logout} style={styles.logoutIconImage} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Plato v1.0.0</Text>
          <Text style={styles.footerSubText}>
            Made with ❤️ for students in Nepal
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ══════════════════════════════════════
          EDIT PROFILE MODAL
      ══════════════════════════════════════ */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Image source={PROFILE_ICONS.close} style={styles.modalCloseIcon} />
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
                    <Text style={styles.modalCameraIcon}>📷</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.modalAvatarButtons}>
                  <TouchableOpacity
                    style={styles.modalAvatarBtn}
                    onPress={takeAvatarPhoto}
                  >
                    <Text style={styles.modalAvatarBtnIcon}>📷</Text>
                    <Text style={styles.modalAvatarBtnText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalAvatarBtn}
                    onPress={pickAvatarFromGallery}
                  >
                    <Text style={styles.modalAvatarBtnIcon}>🖼️</Text>
                    <Text style={styles.modalAvatarBtnText}>Gallery</Text>
                  </TouchableOpacity>

                  {user?.avatar && (
                    <TouchableOpacity
                      style={[styles.modalAvatarBtn, styles.modalAvatarBtnRed]}
                      onPress={removeAvatar}
                    >
                      <Image source={PROFILE_ICONS.delete} style={styles.modalAvatarBtnIconImage} />
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
      </Modal>

      {/* ══════════════════════════════════════
          NOTIFICATIONS MODAL
      ══════════════════════════════════════ */}
      <Modal visible={notifModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔔 Notifications</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Image source={PROFILE_ICONS.close} style={styles.modalCloseIcon} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Choose what notifications you receive
            </Text>

            {[
              { key: 'newMeals', label: 'New Meals Available', desc: 'When new meals are posted near you', icon: '🍽️' },
              { key: 'bookingUpdates', label: 'Booking Updates', desc: 'Confirmations and cancellations', icon: '📋' },
              { key: 'reminders', label: 'Meal Reminders', desc: 'Pickup time reminders', icon: '⏰' },
              { key: 'reviews', label: 'New Reviews', desc: 'When someone reviews your meal', icon: '⭐' },
              { key: 'promotions', label: 'Promotions', desc: 'Deals and special offers', icon: '🎉' },
            ].map((item) => (
              <View key={item.key} style={styles.notifRow}>
                <Text style={styles.notifIcon}>{item.icon}</Text>
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

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => {
                setNotifModalVisible(false);
                Alert.alert('✅ Saved', 'Notification preferences updated!');
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
      </Modal>

      {/* ══════════════════════════════════════
          DIETARY MODAL
      ══════════════════════════════════════ */}
      <Modal visible={dietModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌿 Dietary Preferences</Text>
              <TouchableOpacity onPress={() => setDietModalVisible(false)}>
                <Image source={PROFILE_ICONS.close} style={styles.modalCloseIcon} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Set your dietary needs for better meal recommendations
            </Text>

            {[
              { key: 'vegetarian', label: 'Vegetarian', desc: 'No meat or fish', icon: '🌱' },
              { key: 'vegan', label: 'Vegan', desc: 'No animal products at all', icon: '🥦' },
              { key: 'glutenFree', label: 'Gluten Free', desc: 'No wheat, barley or rye', icon: '🌾' },
              { key: 'dairyFree', label: 'Dairy Free', desc: 'No milk or dairy products', icon: '🥛' },
              { key: 'nutFree', label: 'Nut Free', desc: 'No nuts or nut products', icon: '🥜' },
              { key: 'halal', label: 'Halal', desc: 'Halal certified ingredients only', icon: '✅' },
            ].map((item) => (
              <View key={item.key} style={styles.notifRow}>
                <Text style={styles.notifIcon}>{item.icon}</Text>
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
      </Modal>

      {/* ══════════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════════ */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💳 Payment Methods</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Image source={PROFILE_ICONS.close} style={styles.modalCloseIcon} />
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
                  <Text style={styles.paymentIcon}>{pm.icon}</Text>
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
                  '➕ Add Payment Method',
                  'Choose a method to add:',
                  [
                    {
                      text: '💚 eSewa',
                      onPress: () =>
                        Alert.alert('eSewa', 'eSewa integration coming soon!'),
                    },
                    {
                      text: '💜 Khalti',
                      onPress: () =>
                        Alert.alert('Khalti', 'Khalti integration coming soon!'),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                )
              }
            >
              <Text style={styles.addPaymentText}>
                ➕ Add New Payment Method
              </Text>
            </TouchableOpacity>

            <View style={styles.paymentNote}>
              <Text style={styles.paymentNoteText}>
                🔒 Your payment info is encrypted and secure. Plato never stores your full card details.
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
      </Modal>

      {/* ══════════════════════════════════════
          REVIEWS MODAL
      ══════════════════════════════════════ */}
      <Modal visible={reviewsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⭐ My Reviews</Text>
              <TouchableOpacity onPress={() => setReviewsModalVisible(false)}>
                <Image source={PROFILE_ICONS.close} style={styles.modalCloseIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.reviewSummary}>
              <Text style={styles.reviewBigRating}>
                {user?.rating?.toFixed(1)}
              </Text>
              <RatingStars rating={user?.rating || 5} size={22} />
              <Text style={styles.reviewCount}>
                Based on {mockReviews.length} reviews
              </Text>
            </View>

            <ScrollView
              style={styles.reviewsList}
              showsVerticalScrollIndicator={false}
            >
              {mockReviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={{ uri: review.avatar }}
                      style={styles.reviewAvatar}
                    />
                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer}
                      </Text>
                      <Text style={styles.reviewDate}>{review.date}</Text>
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
                  <Text style={styles.reviewComment}>{review.comment}</Text>
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
      </Modal>

      {/* ══════════════════════════════════════
          PRIVACY MODAL
      ══════════════════════════════════════ */}
      <Modal visible={privacyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛡️ Privacy & Safety</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <Image source={PROFILE_ICONS.close} style={styles.modalCloseIcon} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                {
                  icon: '👁️',
                  title: 'Profile Visibility',
                  desc: 'Your profile is visible to all Plato users on your campus. Your email is never shown publicly.',
                },
                {
                  icon: '📍',
                  title: 'Location Privacy',
                  desc: 'Only your pickup location for active meals is shared. Your home address is never stored.',
                },
                {
                  icon: '💳',
                  title: 'Payment Security',
                  desc: 'All payments are processed securely. Plato never stores card details.',
                },
                {
                  icon: '📊',
                  title: 'Data Usage',
                  desc: 'We use your meal history to improve AI recommendations. Your data is never sold.',
                },
              ].map((item, index) => (
                <View key={index} style={styles.privacyItem}>
                  <Text style={styles.privacyIcon}>{item.icon}</Text>
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
                    '🚨 Report a User',
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
                  <Image source={PROFILE_ICONS.safety} style={styles.actionButtonIcon} />
                  <Text style={styles.reportButtonText}>Report a User</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  Alert.alert(
                    '⚠️ Delete Account',
                    'This will permanently delete your account.\n\nEmail: delete@plato.edu.np to request deletion.',
                    [{ text: 'OK' }]
                  )
                }
              >
                <View style={styles.actionButtonRow}>
                  <Image source={PROFILE_ICONS.delete} style={styles.actionButtonIcon} />
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
      </Modal>
    </View>
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
  cameraBadgeIcon: { fontSize: 16 },
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
  activityEmoji: { fontSize: 24, marginBottom: 6 },
  activityIconImage: {
    width: 33,
    height: 33,
    resizeMode: 'contain',
    marginBottom: 6,
  },
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
  modalCameraIcon: { fontSize: 13 },
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
});