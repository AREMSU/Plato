import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import MealCard from '../components/MealCard';
import { categories, dietaryFilters } from '../utils/constants';
import { isMealOwner } from '../utils/helpers';

// Category icons mapping helper (consistent with CategoryFilter)
const CATEGORY_ICONS = {
  all: 'apps',
  Nepali: 'flame-outline',
  Continental: 'pizza-outline',
  Chinese: 'leaf-outline',
  Snacks: 'fast-food-outline',
  Breakfast: 'sunny-outline',
};
const getCategoryIcon = (id) => CATEGORY_ICONS[id] || 'grid-outline';

export default function ExploreScreen({ navigation }) {
  const { meals, user } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDiet, setSelectedDiet] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const isMealExpired = (meal) => {
    try {
      const dateStr = meal?.mealDate || new Date().toISOString().split('T')[0];
      const dt = new Date(`${dateStr} ${meal?.pickupTime}`);
      return !isNaN(dt.getTime()) && dt < new Date();
    } catch { return false; }
  };

  const filtered = meals.filter((meal) => {
    if (isMealOwner(user, meal)) return false;
    if (isMealExpired(meal)) return false;
    const matchSearch =
      meal.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      meal.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      meal.tags.some((t) =>
        t.includes(searchQuery.toLowerCase())
      );
    const matchCategory =
      selectedCategory === 'all' ||
      meal.category === selectedCategory;
    const matchDiet =
      selectedDiet === 'all' ||
      (selectedDiet === 'vegetarian' && meal.isVegetarian) ||
      (selectedDiet === 'non-veg' && !meal.isVegetarian);
    return matchSearch && matchCategory && matchDiet;
  });

  const getFeaturedFlag = (meal) => meal.isFeatured ?? meal.is_featured ?? false;

  const sorted = [...filtered].sort((a, b) => {
    const aFeatured = getFeaturedFlag(a) ? 1 : 0;
    const bFeatured = getFeaturedFlag(b) ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'price')
      return a.pricePerPortion - b.pricePerPortion;
    if (sortBy === 'newest')
      return new Date(b.createdAt) - new Date(a.createdAt);
    return 0;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E8500A" />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── Header (scrolls with content) ── */}
        <LinearGradient
          colors={['#E8500A', '#FF6B35', '#FF8C42']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Title row */}
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Explore</Text>
            <Text style={styles.resultsBadge}>{sorted?.length ?? 0} meals</Text>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
            <Ionicons name="search-outline" size={18} color={isFocused ? '#FF6B35' : '#94A3B8'} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search meals, cuisines, tags..."
              placeholderTextColor="#BDBDBD"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <View style={styles.searchDivider} />
            )}
          </View>
        </LinearGradient>

        {/* Filters Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {dietaryFilters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setSelectedDiet(filter.id)}
              style={[
                styles.filterChip,
                selectedDiet === filter.id &&
                styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDiet === filter.id &&
                  styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.dividerV} />

          {[
            { id: 'rating', label: 'Rating', icon: 'star' },
            { id: 'price', label: 'Price', icon: 'cash' },
            { id: 'newest', label: 'Newest', icon: 'time' },
          ].map((s) => {
            const isActive = sortBy === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSortBy(s.id)}
                style={[
                  styles.filterChip,
                  isActive && styles.sortChipActive,
                  { flexDirection: 'row', alignItems: 'center', gap: 6 }
                ]}
              >
                <Ionicons name={isActive ? s.icon : `${s.icon}-outline`} size={13} color={isActive ? '#fff' : '#64748B'} />
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.sortChipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id &&
                styles.categoryChipActive,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={getCategoryIcon(cat.id)}
                size={16}
                color={selectedCategory === cat.id ? '#fff' : '#64748B'}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.id &&
                  styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results label */}
        <View style={styles.resultsRow}>
          <Ionicons name="funnel-outline" size={13} color="#9E9E9E" />
          <Text style={styles.resultsText}>
            {sorted.length} result{sorted.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.mealsList}>
          {sorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={50} color="#CBD5E1" style={{ marginBottom: 14 }} />
              <Text style={styles.emptyTitle}>
                No meals found
              </Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your filters
              </Text>
            </View>
          ) : (
            sorted.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onPress={() =>
                  navigation.navigate('MealDetail', { meal })
                }
              />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-black',
  },
  resultsBadge: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: '#FF6B35',
    shadowOpacity: 0.15,
  },
  searchDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  sortChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  filterChipTextActive: { color: '#fff' },
  sortChipTextActive: { color: '#fff' },
  dividerV: {
    width: 1.5,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
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
    gap: 6,
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
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  mealsList: { paddingHorizontal: 16 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
});