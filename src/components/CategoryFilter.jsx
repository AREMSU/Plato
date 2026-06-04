import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';

const CATEGORY_META = {
  all:         { emoji: '🍽️', color: '#FFF1F2' },
  Nepali:      { emoji: '🍲', color: '#FEF3C7' },
  Continental: { emoji: '🍕', color: '#FFEDD5' },
  Chinese:     { emoji: '🥢', color: '#DCFCE7' },
  Snacks:      { emoji: '🍔', color: '#F3E8FF' },
  Breakfast:   { emoji: '🍳', color: '#FEF9C3' },
};

export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollStyle}
    >
      {categories.map((cat) => {
        const isActive = selected === cat.id;
        const meta = CATEGORY_META[cat.id] || { emoji: '🥘', color: '#F1F5F9' };
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={styles.categoryItem}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.circle,
                { backgroundColor: meta.color },
                isActive && styles.circleActive,
              ]}
            >
              <Text style={styles.emojiText}>{meta.emoji}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollStyle: {
    marginVertical: 4,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 16,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  circle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  circleActive: {
    borderColor: '#FC8019',
    borderWidth: 2,
    shadowColor: '#FC8019',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  emojiText: {
    fontSize: 28,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  labelActive: {
    color: '#FC8019',
    fontWeight: '800',
  },
});