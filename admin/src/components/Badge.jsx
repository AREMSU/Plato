import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/helpers';

const BADGE_STYLES = {
  success: { bg: COLORS.successBg, color: COLORS.success },
  danger: { bg: COLORS.dangerBg, color: COLORS.danger },
  warning: { bg: COLORS.warningBg, color: COLORS.warning },
  info: { bg: COLORS.infoBg, color: COLORS.info },
  purple: { bg: COLORS.purpleBg, color: COLORS.purple },
  muted: { bg: 'rgba(255,255,255,0.06)', color: COLORS.textMuted },
};

const Badge = ({ text, type = 'muted' }) => {
  const style = BADGE_STYLES[type] || BADGE_STYLES.muted;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.color }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});

export default Badge;
