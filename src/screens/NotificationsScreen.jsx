import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const CATEGORY_ICONS = {
  new_meals:       { name: 'restaurant',        color: '#FF6B35', bg: '#FFF3EE' },
  booking_updates: { name: 'receipt',            color: '#2196F3', bg: '#E3F2FD' },
  reminders:       { name: 'time',               color: '#9C27B0', bg: '#F3E5F5' },
  reviews:         { name: 'star',               color: '#FFC107', bg: '#FFF8E1' },
  promotions:      { name: 'gift',               color: '#4CAF50', bg: '#E8F5E9' },
};

const formatTime = (iso) => {
  if (!iso) return '';
  const cleaned = String(iso).replace(/(\.\d{3})\d+/, '$1');
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function NotificationsScreen({ navigation }) {
  const { notifications: notifList, loadNotifications, markNotificationsRead } = useApp();

  useEffect(() => {
    loadNotifications();
    markNotificationsRead();
  }, []);

  const getDestination = (n) => {
    const title = (n.title || '').toLowerCase();
    const msg   = (n.message || '').toLowerCase();
    const both  = title + ' ' + msg;

    // Wallet/payment — stack screen, back returns to Notifications ✓
    if (both.match(/wallet|topped up|top.up|refund|payment released|rs\.\d/)) {
      return { type: 'stack', screen: 'Wallet' };
    }
    // Pro/subscription — tab, open via profile param
    if (both.match(/pro activated|subscription|upgraded|renewed/)) {
      return { type: 'tab', tab: 'Profile', params: { openPremium: true } };
    }
    // Reviews — open reviews modal in Profile
    if (n.category === 'reviews' || both.match(/review|rated|feedback|new review/)) {
      return { type: 'tab', tab: 'Profile', params: { openReviews: true } };
    }
    // New meal nearby
    if (n.category === 'new_meals' || both.match(/new meal|listed|available at/)) {
      return { type: 'tab', tab: 'Explore' };
    }
    // Booking / order
    if (both.match(/booking|order|pickup|confirmed|cancelled|received|handed over|food ready|payment hold/)) {
      return { type: 'tab', tab: 'MyMeals' };
    }
    return null;
  };

  // Tab order must match AppNavigator
  const TAB_ORDER = ['Home', 'Explore', 'Add', 'MyMeals', 'Profile'];

  const handlePress = (n) => {
    const dest = getDestination(n);
    if (!dest) return;

    if (dest.type === 'stack') {
      // Stack screens (Wallet, etc.) — back correctly returns to Notifications
      navigation.navigate(dest.screen, dest.params);
    } else {
      // Tab screens — reset directly to the target tab, no Home flash
      const tabIndex = TAB_ORDER.indexOf(dest.tab);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{
            name: 'Main',
            state: {
              index: tabIndex >= 0 ? tabIndex : 0,
              routes: TAB_ORDER.map((name) =>
                name === dest.tab && dest.params
                  ? { name, params: dest.params }
                  : { name }
              ),
            },
          }],
        })
      );
    }
  };

  const renderItem = ({ item: n }) => {
    const cat = CATEGORY_ICONS[n.category] || { name: 'notifications', color: '#64748B', bg: '#F1F5F9' };
    const isRead = n.isRead || n.is_read;
    const dest = getDestination(n);

    return (
      <TouchableOpacity
        style={[styles.row, !isRead && styles.rowUnread]}
        onPress={() => handlePress(n)}
        activeOpacity={dest ? 0.75 : 1}
        disabled={!dest}
      >
        <View style={[styles.iconBox, { backgroundColor: cat.bg }]}>
          <Ionicons name={cat.name} size={20} color={cat.color} />
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, !isRead && styles.rowTitleUnread]} numberOfLines={1}>
              {n.title}
            </Text>
            <Text style={styles.rowTime}>{formatTime(n.createdAt || n.created_at)}</Text>
          </View>
          <Text style={styles.rowMsg} numberOfLines={3}>{n.message}</Text>
        </View>
        <View style={styles.rowRight}>
          {!isRead && <View style={styles.unreadDot} />}
          {dest && <Ionicons name="chevron-forward" size={14} color="#CBD5E1" style={{ marginTop: !isRead ? 4 : 0 }} />}
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = (notifList || []).filter(n => !n.isRead && !n.is_read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Profile', { openNotifications: true })}
        >
          <Ionicons name="settings-outline" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={notifList || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="notifications-outline" size={48} color="#FF6B35" />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>
              New meal alerts, booking updates and payment notifications will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8F9FA',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20, fontWeight: '800', color: '#1A1A1A',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  headerSub: {
    fontSize: 12, color: '#FF6B35', fontWeight: '600', marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif',
  },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8F9FA',
    alignItems: 'center', justifyContent: 'center',
  },
  listContent: { paddingVertical: 8, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginVertical: 4,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  rowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  rowTitle: {
    fontSize: 14, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  rowTitleUnread: { color: '#1A1A1A', fontWeight: '800' },
  rowTime: { fontSize: 11, color: '#94A3B8', flexShrink: 0 },
  rowMsg: {
    fontSize: 13, color: '#6B7280', lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
  rowRight: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    gap: 4,
    minWidth: 16,
  },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  separator: { height: 0 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconBox: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#FFF3EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  emptySub: {
    fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif',
  },
});
