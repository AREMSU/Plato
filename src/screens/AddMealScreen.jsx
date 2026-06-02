import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { categories } from '../utils/constants';
import { uploadImageToCloudinary, verifyImageWithBackend } from '../api/uploadImage';

const { width } = Dimensions.get('window');

// Category icons mapping helper
const getCategoryIcon = (categoryId) => {
  switch (categoryId) {
    case 'all': return 'restaurant-outline';
    case 'Nepali': return 'fast-food-outline';
    case 'Continental': return 'pizza-outline';
    case 'Chinese': return 'restaurant-outline';
    case 'Snacks': return 'cafe-outline';
    case 'Breakfast': return 'egg-outline';
    default: return 'restaurant-outline';
  }
};

// InputField Component
const InputField = ({
  label,
  placeholder,
  keyboardType,
  multiline,
  required,
  prefix,
  value,
  onChangeText,
  error,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>
      {label}{' '}
      {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View
      style={[
        styles.inputWrapper,
        multiline && styles.inputWrapperMulti,
        error && styles.inputError,
      ]}
    >
      {prefix && <Text style={styles.prefix}>{prefix}</Text>}
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
    {error && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={14} color="#FF5252" style={{ marginRight: 4 }} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
);

export default function AddMealScreen({ navigation }) {
  const { addMeal } = useApp();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [imageVerified, setImageVerified] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Nepali',
    pricePerPortion: '',
    totalPortions: '',
    pickupLocation: '',
    isVegetarian: false,
    tags: '',
  });
  const [errors, setErrors] = useState({});

  // ── Time Picker State ──
  const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  const now = new Date();
  const initH = now.getHours() % 12 || 12;
  const initM = MINUTES.reduce((prev, cur) =>
    Math.abs(Number(cur) - now.getMinutes()) < Math.abs(Number(prev) - now.getMinutes()) ? cur : prev
  );
  const initAP = now.getHours() >= 12 ? 'PM' : 'AM';
  const [selHour,   setSelHour]   = useState(String(initH).padStart(2, '0'));
  const [selMinute, setSelMinute] = useState(initM);
  const [selAmPm,   setSelAmPm]   = useState(initAP);

  const getPickupTimeString = () => `${selHour}:${selMinute} ${selAmPm}`;

  const updateForm = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: null }));
  }, []);

  const requestPermission = async (type) => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
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

  const pickFromGallery = async () => {
    const hasPermission = await requestPermission('gallery');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
        setImageVerified(false);
        setErrors(prev => ({ ...prev, image: null }));

        setImageLoading(true);
        try {
          const verification = await verifyImageWithBackend(uri);
          console.log('VERIFY RESPONSE:', verification);
          if (verification.verdict !== 'approved') {
            setUploadedImageUrl('');
            setImageVerified(false);
            Alert.alert('Image Not Verified', verification.reason || 'Please use a clearer food image.');
            return;
          }

          const url = await uploadImageToCloudinary(uri);
          if (url) {
            setUploadedImageUrl(url);
            setImageVerified(true);
            console.log('Image uploaded:', url);
          } else {
            Alert.alert('Upload Failed', 'Could not upload image. The meal will be listed without a photo.');
          }
        } catch (error) {
          Alert.alert('Verification Failed', error.message || 'Please try again.');
        } finally {
          setImageLoading(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setImageLoading(false);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
        setImageVerified(false);
        setErrors(prev => ({ ...prev, image: null }));

        setImageLoading(true);
        try {
          const verification = await verifyImageWithBackend(uri);
          console.log('VERIFY RESPONSE:', verification);
          if (verification.verdict !== 'approved') {
            setUploadedImageUrl('');
            setImageVerified(false);
            Alert.alert('Image Not Verified', verification.reason || 'Please use a clearer food image.');
            return;
          }

          const url = await uploadImageToCloudinary(uri);
          if (url) {
            setUploadedImageUrl(url);
            setImageVerified(true);
            console.log('Image uploaded:', url);
          } else {
            Alert.alert(
              'Upload Failed',
              'Could not upload image. The meal will be listed without a photo.'
            );
          }
        } catch (error) {
          Alert.alert('Verification Failed', error.message || 'Please try again.');
        } finally {
          setImageLoading(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setImageLoading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Meal Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const validate = () => {
    const newErrors = {};
    if (!uploadedImageUrl || !imageVerified) newErrors.image = 'Verified meal photo is required';
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.pricePerPortion || isNaN(Number(form.pricePerPortion)) || Number(form.pricePerPortion) <= 0)
      newErrors.pricePerPortion = 'Enter a valid price';
    if (!form.totalPortions || isNaN(Number(form.totalPortions)) || Number(form.totalPortions) <= 0)
      newErrors.totalPortions = 'Enter valid portions';

    // ── Validate pickup time is not in the past ──
    const now = new Date();
    let hr = Number(selHour);
    if (selAmPm === 'PM' && hr !== 12) hr += 12;
    if (selAmPm === 'AM' && hr === 12) hr = 0;
    const pickupDate = new Date();
    pickupDate.setHours(hr, Number(selMinute), 0, 0);
    if (pickupDate <= now) {
      newErrors.pickupTime = 'Pickup time must be in the future';
    }

    if (!form.pickupLocation.trim()) newErrors.pickupLocation = 'Location required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddMeal = async () => {
    if (!validate()) {
      Alert.alert('Missing Info', 'Please fill all required fields including a verified meal photo.');
      return;
    }
    setLoading(true);
    try {
      const tagsArray = form.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const result = await addMeal({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        pricePerPortion: Number(form.pricePerPortion),
        totalPortions: Number(form.totalPortions),
        pickupTime: getPickupTimeString(),
        pickupLocation: form.pickupLocation.trim(),
        isVegetarian: form.isVegetarian,
        tags: tagsArray,
        image: uploadedImageUrl,
        calories: 400,
        protein: 15,
        mealDate: new Date().toISOString().split('T')[0],
      });

      if (result && !result.error) {
        Alert.alert(
          '🎉 Meal Listed!',
          'Your meal has been successfully added to the platform.',
          [{
            text: 'View Home',
            onPress: () => {
              navigation.navigate('Home');
              setForm({
                title: '', description: '', category: 'Nepali',
                pricePerPortion: '', totalPortions: '',
                pickupLocation: '',
                isVegetarian: false, tags: '',
              });
              setSelHour(String(new Date().getHours() % 12 || 12).padStart(2,'0'));
              setSelMinute('00');
              setSelAmPm(new Date().getHours() >= 12 ? 'PM' : 'AM');
              setSelectedImage(null);
              setUploadedImageUrl('');
              setImageVerified(false);
              setErrors({});
            },
          }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to add meal');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* ── Header ── */}
      <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        style={styles.header}
      >
        <View style={styles.headerContentRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Share a Meal</Text>
            <Text style={styles.headerSubtitle}>
              Let your campus community enjoy your cooking
            </Text>
          </View>
          <Ionicons name="restaurant-outline" size={32} color="rgba(255,255,255,0.9)" />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {/* ══════════════════════════════
            MEAL PHOTO — REQUIRED
        ══════════════════════════════ */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Meal Photo <Text style={styles.required}>*</Text>
          </Text>

          {selectedImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <View style={styles.imageOverlayButtons}>
                <TouchableOpacity
                  style={styles.imageOverlayBtn}
                  onPress={showImageOptions}
                  activeOpacity={0.7}
                >
                  <View style={styles.overlayBtnIconWrap}>
                    <Ionicons name="sync-outline" size={15} color="#fff" />
                  </View>
                  <Text style={styles.imageOverlayBtnText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageOverlayBtn, styles.imageOverlayBtnRed]}
                  onPress={() => {
                    setSelectedImage(null);
                    setUploadedImageUrl('');
                    setImageVerified(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.overlayBtnIconWrap}>
                    <Ionicons name="close" size={15} color="#fff" />
                  </View>
                  <Text style={styles.imageOverlayBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.imageSuccessBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.imageSuccessText}>Photo Added</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.imageUploadBox,
                errors.image && styles.imageUploadBoxError,
              ]}
              onPress={showImageOptions}
              activeOpacity={0.8}
            >
              {imageLoading ? (
                <View style={styles.imageLoadingBox}>
                  <ActivityIndicator color="#FF6B35" size="large" />
                  <Text style={styles.imageLoadingText}>Verifying & Uploading...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.imageUploadIconBox}>
                    <LinearGradient
                      colors={['#FF6B35', '#FF8C42']}
                      style={styles.imageUploadIconGradient}
                    >
                      <Ionicons name="add" size={28} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.imageUploadTitle}>Add Meal Photo</Text>
                  <Text style={styles.imageUploadSubtitle}>
                    Snap a fresh pic or pick from your library
                  </Text>
                  <View style={styles.imageUploadButtonsRow}>
                    <TouchableOpacity
                      style={styles.imageUploadOption}
                      onPress={takePhoto}
                      activeOpacity={0.7}
                    >
                      <View style={styles.uploadOptionIconWrap}>
                        <Ionicons name="scan-outline" size={18} color="#FF6B35" />
                      </View>
                      <Text style={styles.imageUploadOptionText}>Camera</Text>
                    </TouchableOpacity>
                    <View style={styles.imageUploadOptionDivider} />
                    <TouchableOpacity
                      style={styles.imageUploadOption}
                      onPress={pickFromGallery}
                      activeOpacity={0.7}
                    >
                      <View style={styles.uploadOptionIconWrap}>
                        <Ionicons name="images-outline" size={18} color="#FF6B35" />
                      </View>
                      <Text style={styles.imageUploadOptionText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
          {errors.image && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={14} color="#FF5252" style={{ marginRight: 4 }} />
              <Text style={styles.errorText}>{errors.image}</Text>
            </View>
          )}
        </View>

        {/* ══════════════════════════════
            MEAL DETAILS
        ══════════════════════════════ */}
        <InputField
          label="Meal Title"
          placeholder="e.g. Dal Bhat Set, Momo Special..."
          required
          value={form.title}
          onChangeText={(t) => updateForm('title', t)}
          error={errors.title}
        />

        <InputField
          label="Description"
          placeholder="Describe your meal, ingredients, and any special notes..."
          multiline
          required
          value={form.description}
          onChangeText={(t) => updateForm('description', t)}
          error={errors.description}
        />

        {/* ── Category ── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {categories
              .filter((c) => c.id !== 'all')
              .map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => updateForm('category', cat.id)}
                  style={[
                    styles.categoryChip,
                    form.category === cat.id && styles.categoryChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={getCategoryIcon(cat.id)}
                    size={16}
                    color={form.category === cat.id ? '#fff' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      form.category === cat.id && styles.categoryTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* ── Price & Portions ── */}
        <View style={styles.twoColumns}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>
              Price / Portion <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                errors.pricePerPortion && styles.inputError,
              ]}
            >
              <Text style={styles.prefix}>Rs.</Text>
              <TextInput
                style={styles.input}
                placeholder="120"
                placeholderTextColor="#94A3B8"
                value={form.pricePerPortion}
                onChangeText={(t) => updateForm('pricePerPortion', t)}
                keyboardType="numeric"
                autoCorrect={false}
              />
            </View>
            {errors.pricePerPortion && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={14} color="#FF5252" style={{ marginRight: 4 }} />
                <Text style={styles.errorText}>{errors.pricePerPortion}</Text>
              </View>
            )}
          </View>

          <View style={{ width: 12 }} />

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>
              Portions <Text style={styles.required}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                errors.totalPortions && styles.inputError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="4"
                placeholderTextColor="#94A3B8"
                value={form.totalPortions}
                onChangeText={(t) => updateForm('totalPortions', t)}
                keyboardType="numeric"
                autoCorrect={false}
              />
            </View>
            {errors.totalPortions && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={14} color="#FF5252" style={{ marginRight: 4 }} />
                <Text style={styles.errorText}>{errors.totalPortions}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Pickup Time Picker ── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Pickup Time <Text style={styles.required}>*</Text>
          </Text>

          {/* Big time display */}
          <View style={[styles.timeDisplayBox, errors.pickupTime && styles.inputError]}>
            <Ionicons name="time-outline" size={22} color="#FF6B35" />
            <Text style={styles.timeDisplayText}>{getPickupTimeString()}</Text>
            <View style={styles.amPmInlineButtons}>
              {['AM', 'PM'].map((ap) => (
                <TouchableOpacity
                  key={ap}
                  onPress={() => { setSelAmPm(ap); setErrors(p => ({...p, pickupTime: null})); }}
                  style={[styles.amPmInlineBtn, selAmPm === ap && styles.amPmInlineBtnActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.amPmInlineText, selAmPm === ap && styles.amPmInlineTextActive]}>{ap}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hour row — horizontal scroll, works inside vertical parent */}
          <Text style={styles.timeRowLabel}>Hour</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeChipRow}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => { setSelHour(h); setErrors(p => ({...p, pickupTime: null})); }}
                style={[styles.timeChip, selHour === h && styles.timeChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.timeChipText, selHour === h && styles.timeChipTextActive]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Minute row — horizontal scroll */}
          <Text style={[styles.timeRowLabel, { marginTop: 12 }]}>Minute</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeChipRow}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {MINUTES.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => { setSelMinute(m); setErrors(p => ({...p, pickupTime: null})); }}
                style={[styles.timeChip, selMinute === m && styles.timeChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.timeChipText, selMinute === m && styles.timeChipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {errors.pickupTime && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={14} color="#FF5252" style={{ marginRight: 4 }} />
              <Text style={styles.errorText}>{errors.pickupTime}</Text>
            </View>
          )}
        </View>

        <InputField
          label="Pickup Location"
          placeholder="e.g. Block A Room 204, Library Gate"
          required
          value={form.pickupLocation}
          onChangeText={(t) => updateForm('pickupLocation', t)}
          error={errors.pickupLocation}
        />

        <InputField
          label="Tags (comma-separated)"
          placeholder="e.g. vegetarian, spicy, homemade"
          value={form.tags}
          onChangeText={(t) => updateForm('tags', t)}
          error={errors.tags}
        />

        {/* ── Vegetarian Toggle ── */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.toggleLabel}>Vegetarian Meal</Text>
              <Ionicons name="leaf" size={16} color="#4CAF50" style={{ marginLeft: 6 }} />
            </View>
            <Text style={styles.toggleSubtitle}>
              Mark if this meal contains no meat
            </Text>
          </View>
          <Switch
            value={form.isVegetarian}
            onValueChange={(v) => updateForm('isVegetarian', v)}
            trackColor={{ false: '#E2E8F0', true: '#4CAF50' }}
            thumbColor={form.isVegetarian ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* ── Live Preview ── */}
        <View style={styles.previewCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="eye-outline" size={16} color="#FF6B35" style={{ marginRight: 6 }} />
            <Text style={styles.previewLabel}>Listing Preview</Text>
          </View>
          <View style={styles.previewContent}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.previewImagePlaceholder}>
                <Ionicons name="restaurant-outline" size={22} color="#CBD5E1" style={{ marginBottom: 4 }} />
                <Text style={styles.previewImagePlaceholderText}>
                  No photo yet
                </Text>
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewMealTitle} numberOfLines={1}>
                {form.title || 'Your Meal Title'}
              </Text>
              <Text style={styles.previewPrice}>
                Rs. {form.pricePerPortion || '0'} / portion
              </Text>
              <Text style={styles.previewPortions}>
                {form.totalPortions || '0'} portions available
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.previewMeta} numberOfLines={1}>
                  {getPickupTimeString()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <Ionicons name="location-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.previewMeta} numberOfLines={1}>
                  {form.pickupLocation || 'Pickup location'}
                </Text>
              </View>
              {form.isVegetarian && (
                <View style={styles.previewVegBadge}>
                  <Ionicons name="leaf" size={10} color="#4CAF50" style={{ marginRight: 4 }} />
                  <Text style={styles.previewVegText}>Vegetarian</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ══════════════════════════════
            SUBMIT BUTTON
        ══════════════════════════════ */}
        <TouchableOpacity
          onPress={handleAddMeal}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.submitButtonWrapper}
        >
          <LinearGradient
            colors={loading ? ['#94A3B8', '#64748B'] : ['#FF6B35', '#FF8C42']}
            style={styles.submitButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <View style={styles.submitButtonInner}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitText}>Listing your meal...</Text>
              </View>
            ) : (
              <View style={styles.submitButtonInner}>
                <Ionicons name="restaurant-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.submitText}>List My Meal</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.submitHint}>
          Your meal will be visible to all students on campus once listed.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    paddingTop: 55,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  required: { color: '#FF5252' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  inputWrapperMulti: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  inputError: { borderColor: '#FF5252' },
  prefix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B35',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  inputMulti: { minHeight: 100 },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  imageUploadBox: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    borderRadius: 18,
    backgroundColor: '#FFF8F5',
    padding: 24,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  imageUploadBoxError: {
    borderColor: '#FF5252',
    backgroundColor: '#FFF5F5',
  },
  imageLoadingBox: {
    alignItems: 'center',
    gap: 12,
  },
  imageLoadingText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  imageUploadIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  imageUploadIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOptionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  imageUploadTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  imageUploadSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  imageUploadButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFD5C2',
    overflow: 'hidden',
    width: '100%',
  },
  imageUploadOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  imageUploadOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  imageUploadOptionDivider: {
    width: 1.5,
    height: '60%',
    backgroundColor: '#FFD5C2',
  },
  imagePreviewContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    height: 220,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlayButtons: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 10,
  },
  imageOverlayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingVertical: 10,
    borderRadius: 24,
    backdropFilter: 'blur(8px)',
  },
  imageOverlayBtnRed: {
    backgroundColor: 'rgba(220,38,38,0.72)',
  },
  overlayBtnIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  imageOverlayBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  imageSuccessBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageSuccessText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  categoryRow: {
    gap: 10,
    paddingBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  categoryTextActive: { color: '#fff' },
  twoColumns: { flexDirection: 'row' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  toggleInfo: { flex: 1 },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  previewCard: {
    backgroundColor: '#FFF8F5',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#FFD5C2',
    borderStyle: 'dashed',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  previewContent: {
    flexDirection: 'row',
    gap: 14,
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  previewImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  previewImagePlaceholderText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  previewInfo: { flex: 1 },
  previewMealTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  previewPrice: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  previewPortions: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  previewMeta: {
    fontSize: 12,
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  previewVegBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewVegText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  submitButtonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  submitButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  submitHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },

  // ── Time Picker ──
  timeDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 14,
  },
  timeDisplayText: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-black',
  },
  amPmInlineButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  amPmInlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  amPmInlineBtnActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  amPmInlineText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  amPmInlineTextActive: {
    color: '#fff',
  },
  timeRowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  timeChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    paddingRight: 8,
  },
  timeChip: {
    width: 52,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  timeChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timeChipText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  timeChipTextActive: {
    color: '#fff',
  },
});