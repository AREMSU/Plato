import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RatingStars({ rating, size = 16 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const filled = rating >= star;
        const halfFilled = !filled && rating >= star - 0.5;
        return (
          <Text
            key={star}
            style={[styles.star, { fontSize: size }]}
          >
            {filled ? '★' : halfFilled ? '½' : '☆'}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    color: '#FFC107',
    marginRight: 1,
  },
});
