import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/helpers';

const Header = ({ title, subtitle, onBack, rightText, onRight }) => {
  return (
    <LinearGradient colors={['#1a1025', '#0a0a0f']} style={styles.header}>
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleArea}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightText && (
          <TouchableOpacity onPress={onRight} style={styles.rightBtn}>
            <Text style={styles.rightText}>{rightText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  backText: { fontSize: 22, color: COLORS.accent },
  titleArea: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  rightBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.accentGlow, borderRadius: 8 },
  rightText: { color: COLORS.accent, fontWeight: '600', fontSize: 13 },
});

export default Header;
