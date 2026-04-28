import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          onPress={() => onSelect(cat.id)}
          style={[
            styles.chip,
            selected === cat.id && styles.chipActive,
          ]}
          activeOpacity={0.8}
        >
          <Text style={styles.chipEmoji}>{cat.icon}</Text>
          <Text
            style={[
              styles.chipText,
              selected === cat.id && styles.chipTextActive,
            ]}
          >
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
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
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  chipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    elevation: 3,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
  },
  chipEmoji: { fontSize: 16 },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  chipTextActive: { color: '#fff' },
});