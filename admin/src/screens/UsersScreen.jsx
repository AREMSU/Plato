import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { getUsers } from '../api/client';
import { COLORS, timeAgo } from '../utils/helpers';

const FILTERS = ['all', 'active', 'inactive', 'staff'];

const UsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (filter !== 'all') params.set('filter', filter);
      const d = await getUsers(params.toString());
      setUsers(d.users);
      setTotal(d.total);
    } catch (e) { console.log(e); }
  }, [query, filter]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderUser = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('UserDetail', { userId: item.id })} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.email || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
        <Text style={styles.meta}>{item.first_name} {item.last_name} · {item.university || 'No uni'}</Text>
      </View>
      <View style={styles.badges}>
        <Badge text={item.is_active ? 'Active' : 'Inactive'} type={item.is_active ? 'success' : 'danger'} />
        {item.is_staff && <Badge text="Staff" type="info" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Users" subtitle={`${total} total`} />
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="🔍 Search users..."
          placeholderTextColor={COLORS.textMuted}
          onSubmitEditing={load}
        />
        <View style={styles.pills}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.pill, filter === f && styles.pillActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUser}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  toolbar: { paddingHorizontal: 16, paddingTop: 12 },
  search: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 14, marginBottom: 10,
  },
  pills: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.accentGlow, borderColor: 'rgba(255,107,53,0.3)' },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.accent },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.accentGlow,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  info: { flex: 1 },
  email: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badges: { gap: 4 },
  empty: { textAlign: 'center', color: COLORS.textMuted, padding: 40 },
});

export default UsersScreen;
