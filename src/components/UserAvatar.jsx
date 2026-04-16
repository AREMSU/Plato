import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

export default function UserAvatar({
  uri,
  name,
  size = 50,
  loading = false,
  borderColor = '#fff',
  borderWidth = 2,
}) {
  const fontSize = size * 0.38;
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: borderWidth,
    borderColor: borderColor,
  };

  if (loading) {
    return (
      <View style={[styles.loadingBox, containerStyle]}>
        <ActivityIndicator color="#FF6B35" size="small" />
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={[styles.defaultBox, containerStyle]}>
        <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, containerStyle]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {},
  loadingBox: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultBox: {
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: '800',
  },
});
