import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import MealCard from '../components/MealCard';
import { categories, dietaryFilters } from '../data/mockData';

export default function ExploreScreen({ navigation }) {
  const { meals } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDiet, setSelectedDiet] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  const filtered = meals.filter((meal) => {
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

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'price')
      return a.pricePerPortion - b.pricePerPortion;
    if (sortBy === 'newest')
      return new Date(b.createdAt) - new Date(a.createdAt);
    return 0;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Meals</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals, cuisines, tags..."
            placeholderTextColor="#BDBDBD"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearIcon}>✕</Text>
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
            { id: 'rating', label: '⭐ Rating' },
            { id: 'price', label: '💰 Price' },
            { id: 'newest', label: '🕐 Newest' },
          ].map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSortBy(s.id)}
              style={[
                styles.filterChip,
                sortBy === s.id && styles.sortChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  sortBy === s.id && styles.sortChipTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
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
            >
              <Text style={styles.categoryEmoji}>
                {cat.icon}
              </Text>
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

        {/* Results */}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>
            {sorted.length} meal
            {sorted.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        <View style={styles.mealsList}>
          {sorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
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
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 16,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  searchIcon: { fontSize: 18 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
  },
  clearIcon: {
    fontSize: 16,
    color: '#9E9E9E',
    fontWeight: '700',
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
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  sortChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterChipText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '600',
  },
  filterChipTextActive: { color: '#fff' },
  sortChipTextActive: { color: '#fff' },
  dividerV: {
    width: 1.5,
    height: 24,
    backgroundColor: '#E0E0E0',
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
  resultsRow: { paddingHorizontal: 20, paddingBottom: 8 },
  resultsText: {
    fontSize: 14,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  mealsList: { paddingHorizontal: 16 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 50, marginBottom: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 6,
  },
  emptySubtitle: { fontSize: 14, color: '#9E9E9E' },
});