import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { categories } from '../data/mockData';

const { width } = Dimensions.get('window');

// ✅ FIX: Move InputField OUTSIDE the main component
const InputField = ({
  label,
  field,
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
        placeholderTextColor="#BDBDBD"
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
      <Text style={styles.errorText}>⚠️ {error}</Text>
    )}
  </View>
);

export default function AddMealScreen({ navigation }) {
  const { addMeal } = useApp();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Nepali',
    pricePerPortion: '',
    totalPortions: '',
    pickupTime: '',
    pickupLocation: '',
    isVegetarian: false,
    tags: '',
  });
  const [errors, setErrors] = useState({});

  // ✅ FIX: Use functional state update to prevent stale closures
  const updateForm = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: null }));
  }, []);

  // ── Request Permission ──
  const requestPermission = async (type) => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '📷 Permission Required',
          'Camera permission is needed to take photos. Please enable it in your phone settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '🖼️ Permission Required',
          'Gallery permission is needed to pick photos. Please enable it in your phone settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  // ── Pick from Gallery ──
  const pickFromGallery = async () => {
    const hasPermission = await requestPermission('gallery');
    if (!hasPermission) return;

    setImageLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setErrors(prev => ({ ...prev, image: null }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setImageLoading(false);
    }
  };

  // ── Take Photo with Camera ──
  const takePhoto = async () => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) return;

    setImageLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setErrors(prev => ({ ...prev, image: null }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setImageLoading(false);
    }
  };

  // ── Show Image Options ──
  const showImageOptions = () => {
    Alert.alert(
      '📸 Add Meal Photo',
      'Choose how you want to add a photo',
      [
        { text: '📷 Take Photo', onPress: takePhoto },
        { text: '🖼️ Choose from Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Validate ──
  const validate = () => {
    const newErrors = {};
    if (!selectedImage) newErrors.image = 'Please add a photo of your meal';
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (
      !form.pricePerPortion ||
      isNaN(Number(form.pricePerPortion)) ||
      Number(form.pricePerPortion) <= 0
    )
      newErrors.pricePerPortion = 'Enter a valid price';
    if (
      !form.totalPortions ||
      isNaN(Number(form.totalPortions)) ||
      Number(form.totalPortions) <= 0
    )
      newErrors.totalPortions = 'Enter valid portions';
    if (!form.pickupTime.trim()) newErrors.pickupTime = 'Pickup time required';
    if (!form.pickupLocation.trim()) newErrors.pickupLocation = 'Location required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──
  const handleAddMeal = () => {
    if (!validate()) {
      Alert.alert('⚠️ Missing Info', 'Please fill all required fields including a meal photo.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const tagsArray = form.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      addMeal({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        pricePerPortion: Number(form.pricePerPortion),
        totalPortions: Number(form.totalPortions),
        availablePortions: Number(form.totalPortions),
        pickupTime: form.pickupTime.trim(),
        pickupLocation: form.pickupLocation.trim(),
        isVegetarian: form.isVegetarian,
        tags: tagsArray,
        image: selectedImage,
        rating: 0,
        reviews: 0,
        calories: 400,
        protein: 15,
        mealDate: new Date().toISOString().split('T')[0],
      });

      setLoading(false);
      Alert.alert(
        '🎉 Meal Listed!',
        'Your meal has been successfully added to the platform.',
        [
          {
            text: 'View Home',
            onPress: () => {
              navigation.navigate('Home');
              setForm({
                title: '',
                description: '',
                category: 'Nepali',
                pricePerPortion: '',
                totalPortions: '',
                pickupTime: '',
                pickupLocation: '',
                isVegetarian: false,
                tags: '',
              });
              setSelectedImage(null);
              setErrors({});
            },
          },
        ]
      );
    }, 1200);
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
        <Text style={styles.headerTitle}>Share a Meal 🍽️</Text>
        <Text style={styles.headerSubtitle}>
          Let your campus community enjoy your cooking
        </Text>
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
                >
                  <Text style={styles.imageOverlayBtnText}>
                    🔄 Change Photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageOverlayBtn, styles.imageOverlayBtnRed]}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.imageOverlayBtnText}>
                    🗑️ Remove
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.imageSuccessBadge}>
                <Text style={styles.imageSuccessText}>✅ Photo Added</Text>
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
                  <Text style={styles.imageLoadingText}>Loading...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.imageUploadIconBox}>
                    <Text style={styles.imageUploadIcon}>📸</Text>
                  </View>
                  <Text style={styles.imageUploadTitle}>Add Meal Photo</Text>
                  <Text style={styles.imageUploadSubtitle}>
                    Take a photo or choose from gallery
                  </Text>
                  <View style={styles.imageUploadButtonsRow}>
                    <TouchableOpacity
                      style={styles.imageUploadOption}
                      onPress={takePhoto}
                    >
                      <Text style={styles.imageUploadOptionIcon}>📷</Text>
                      <Text style={styles.imageUploadOptionText}>Camera</Text>
                    </TouchableOpacity>
                    <View style={styles.imageUploadOptionDivider} />
                    <TouchableOpacity
                      style={styles.imageUploadOption}
                      onPress={pickFromGallery}
                    >
                      <Text style={styles.imageUploadOptionIcon}>🖼️</Text>
                      <Text style={styles.imageUploadOptionText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
          {errors.image && (
            <Text style={styles.errorText}>⚠️ {errors.image}</Text>
          )}
        </View>

        {/* ══════════════════════════════
            MEAL DETAILS
        ══════════════════════════════ */}

        {/* ✅ FIX: Pass value, onChangeText, error as props */}
        <InputField
          label="Meal Title"
          field="title"
          placeholder="e.g. Dal Bhat Set, Momo Special..."
          required
          value={form.title}
          onChangeText={(t) => updateForm('title', t)}
          error={errors.title}
        />

        <InputField
          label="Description"
          field="description"
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
                >
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
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
                placeholderTextColor="#BDBDBD"
                value={form.pricePerPortion}
                onChangeText={(t) => updateForm('pricePerPortion', t)}
                keyboardType="numeric"
                autoCorrect={false}
              />
            </View>
            {errors.pricePerPortion && (
              <Text style={styles.errorText}>
                ⚠️ {errors.pricePerPortion}
              </Text>
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
                placeholderTextColor="#BDBDBD"
                value={form.totalPortions}
                onChangeText={(t) => updateForm('totalPortions', t)}
                keyboardType="numeric"
                autoCorrect={false}
              />
            </View>
            {errors.totalPortions && (
              <Text style={styles.errorText}>
                ⚠️ {errors.totalPortions}
              </Text>
            )}
          </View>
        </View>

        <InputField
          label="Pickup Time"
          field="pickupTime"
          placeholder="e.g. 12:30 PM, 6:00 PM"
          required
          value={form.pickupTime}
          onChangeText={(t) => updateForm('pickupTime', t)}
          error={errors.pickupTime}
        />

        <InputField
          label="Pickup Location"
          field="pickupLocation"
          placeholder="e.g. Block A Room 204, Library Gate"
          required
          value={form.pickupLocation}
          onChangeText={(t) => updateForm('pickupLocation', t)}
          error={errors.pickupLocation}
        />

        <InputField
          label="Tags (comma-separated)"
          field="tags"
          placeholder="e.g. vegetarian, spicy, homemade"
          value={form.tags}
          onChangeText={(t) => updateForm('tags', t)}
          error={errors.tags}
        />

        {/* ── Vegetarian Toggle ── */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Vegetarian Meal 🌱</Text>
            <Text style={styles.toggleSubtitle}>
              Mark if this meal contains no meat
            </Text>
          </View>
          <Switch
            value={form.isVegetarian}
            onValueChange={(v) => updateForm('isVegetarian', v)}
            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
            thumbColor={form.isVegetarian ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* ── Live Preview ── */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>📋 Listing Preview</Text>
          <View style={styles.previewContent}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.previewImagePlaceholder}>
                <Text style={styles.previewImagePlaceholderText}>
                  📸 No photo yet
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
              <Text style={styles.previewMeta} numberOfLines={1}>
                ⏰ {form.pickupTime || 'Pickup time'}
              </Text>
              <Text style={styles.previewMeta} numberOfLines={1}>
                📍 {form.pickupLocation || 'Pickup location'}
              </Text>
              {form.isVegetarian && (
                <View style={styles.previewVegBadge}>
                  <Text style={styles.previewVegText}>🌱 Vegetarian</Text>
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
            colors={loading ? ['#BDBDBD', '#9E9E9E'] : ['#FF6B35', '#FF8C42']}
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
                <Text style={styles.submitEmoji}>🍽️</Text>
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    paddingTop: 55,
    paddingBottom: 24,
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
    color: '#424242',
    marginBottom: 8,
  },
  required: { color: '#FF5252' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
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
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
    fontWeight: '500',
  },
  inputMulti: { minHeight: 100 },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
    marginTop: 6,
    fontWeight: '500',
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
  },
  imageUploadIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  imageUploadIcon: { fontSize: 34 },
  imageUploadTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 6,
  },
  imageUploadSubtitle: {
    fontSize: 13,
    color: '#9E9E9E',
    marginBottom: 20,
    textAlign: 'center',
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
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  imageUploadOptionIcon: { fontSize: 24 },
  imageUploadOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  imageOverlayBtnRed: {
    backgroundColor: 'rgba(255,82,82,0.8)',
  },
  imageOverlayBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  imageSuccessBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageSuccessText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
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
    borderColor: '#E0E0E0',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryEmoji: { fontSize: 16 },
  categoryText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '600',
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
    borderColor: '#E0E0E0',
  },
  toggleInfo: { flex: 1 },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 12,
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
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  previewImagePlaceholderText: {
    fontSize: 10,
    color: '#BDBDBD',
    textAlign: 'center',
    fontWeight: '500',
  },
  previewInfo: { flex: 1 },
  previewMealTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  previewPrice: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '700',
    marginBottom: 2,
  },
  previewPortions: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 6,
  },
  previewMeta: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 3,
  },
  previewVegBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  previewVegText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '700',
  },

  submitButtonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
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
    gap: 10,
  },
  submitEmoji: { fontSize: 22 },
  submitText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  submitHint: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});