import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/helpers';

const Header = ({ title, subtitle, onBack, rightText, onRight }) => {
  return (
    <LinearGradient colors={[COLORS.accent, COLORS.accentLight]} style={styles.header}>
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
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  backText: { fontSize: 22, color: '#FFFFFF' },
  titleArea: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  rightBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  rightText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});

export default Header;
