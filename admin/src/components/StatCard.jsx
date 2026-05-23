import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/helpers';

const StatCard = ({ icon, value, label, color = COLORS.accentGlow }) => {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    minWidth: 140,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 18 },
  value: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
});

export default StatCard;
