import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Map category IDs to Ionicons icon names
const CATEGORY_ICONS = {
  all:         { icon: 'apps',                  color: '#FF6B35' },
  Nepali:      { icon: 'flame-outline',         color: '#E53935' },
  Continental: { icon: 'pizza-outline',         color: '#F57C00' },
  Chinese:     { icon: 'leaf-outline',          color: '#43A047' },
  Snacks:      { icon: 'fast-food-outline',     color: '#8E24AA' },
  Breakfast:   { icon: 'sunny-outline',         color: '#FB8C00' },
};

export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isActive = selected === cat.id;
        const meta = CATEGORY_ICONS[cat.id] || { icon: 'grid-outline', color: '#FF6B35' };
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={[styles.chip, isActive && styles.chipActive]}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, isActive && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Ionicons
                name={meta.icon}
                size={16}
                color={isActive ? '#fff' : meta.color}
              />
            </View>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 26,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    gap: 7,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  chipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    elevation: 5,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  chipTextActive: { color: '#fff' },
});