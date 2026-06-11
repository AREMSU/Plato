import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/helpers';

const StatCard = ({ ionicon, icon, value, label, color = COLORS.accentGlow, onPress }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        {ionicon
          ? <Ionicons name={ionicon} size={20} color={COLORS.accent} />
          : <Text style={styles.icon}>{icon}</Text>
        }
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {onPress && (
        <Ionicons name="chevron-forward-outline" size={14} color={COLORS.textMuted} style={styles.arrow} />
      )}
    </Wrapper>
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
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  icon: { fontSize: 18 },
  value: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  arrow: { position: 'absolute', top: 12, right: 12 },
});

export default StatCard;
