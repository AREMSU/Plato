import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import MealCard from '../components/MealCard';
import { categories, dietaryFilters } from '../utils/constants';
import { isMealOwner } from '../utils/helpers';

// Category icons mapping helper (consistent with CategoryFilter)
const CATEGORY_ICONS = {
  all:         'apps',
  Nepali:      'flame-outline',
  Continental: 'pizza-outline',
  Chinese:     'leaf-outline',
  Snacks:      'fast-food-outline',
  Breakfast:   'sunny-outline',
};
const getCategoryIcon = (id) => CATEGORY_ICONS[id] || 'grid-outline';

export default function ExploreScreen({ navigation }) {
  const { meals, user } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDiet, setSelectedDiet] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  const filtered = meals.filter((meal) => {
    if (isMealOwner(user, meal)) return false;
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
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9E9E9E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals, cuisines, tags..."
            placeholderTextColor="#BDBDBD"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#BDBDBD" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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