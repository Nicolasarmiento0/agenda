import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import EmptyState from '../../components/EmptyState';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

type ProfileUser = {
  id: string;
  nickname: string | null;
  role: 'client' | 'company' | 'worker' | 'admin' | null;
  created_at: string;
};

type SortOrder = 'newest' | 'oldest';
type RoleFilter = 'all' | 'client' | 'company' | 'worker' | 'admin';

const ROLE_LABELS: Record<string, string> = {
  admin: 'ADMIN',
  company: 'EMPRESA',
  worker: 'TRABAJADOR',
  client: 'CLIENTE',
  null: 'SIN ROL',
};

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  admin: { bg: '#EF44441A', border: '#EF444450', text: '#EF4444' },
  company: { bg: '#10B9811A', border: '#10B98150', text: '#10B981' },
  worker: { bg: '#F59E0B1A', border: '#F59E0B50', text: '#F59E0B' },
  client: { bg: '#3B82F61A', border: '#3B82F650', text: '#3B82F6' },
  null: { bg: '#6B72801A', border: '#6B728050', text: '#6B7280' },
};

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [sortOrder]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, role, created_at')
      .order('created_at', { ascending: sortOrder === 'oldest' });

    if (!error && data) {
      setUsers(data as ProfileUser[]);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || (u.role === roleFilter);
    const matchesSearch =
      !searchQuery.trim() ||
      (u.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ROLE_LABELS[u.role || 'null'] || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getRoleCount = (role: RoleFilter) => {
    if (role === 'all') return users.length;
    return users.filter((u) => u.role === role).length;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderUserCard = ({ item }: { item: ProfileUser }) => {
    const roleKey = item.role || 'null';
    const colorsTheme = ROLE_COLORS[roleKey] || ROLE_COLORS.null;
    const initials = (item.nickname || 'U').substring(0, 2).toUpperCase();

    return (
      <GlassCard style={styles.userCard}>
        <View style={styles.userCardContent}>
          <View style={[styles.avatarBox, { backgroundColor: colorsTheme.bg, borderColor: colorsTheme.text }]}>
            <Text style={[styles.avatarText, { color: colorsTheme.text }]}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.nickname || 'Sin Nombre'}
            </Text>
            <Text style={[styles.userDate, { color: colors.textSecondary }]}>
              Registrado: {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colorsTheme.bg, borderColor: colorsTheme.border }]}>
            <Text style={[styles.roleBadgeText, { color: colorsTheme.text }]}>
              {ROLE_LABELS[roleKey]}
            </Text>
          </View>
        </View>
      </GlassCard>
    );
  };

  const FILTERS: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: `TODOS (${getRoleCount('all')})` },
    { key: 'client', label: `CLIENTES (${getRoleCount('client')})` },
    { key: 'company', label: `EMPRESAS (${getRoleCount('company')})` },
    { key: 'worker', label: `EQUIPO (${getRoleCount('worker')})` },
    { key: 'admin', label: `ADMINS (${getRoleCount('admin')})` },
  ];

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="USUARIOS" onLeft={() => setSidebarVisible(true)} leftIcon="menu" />

      <Animated.View style={{ opacity: fadeAnim, flex: 1, paddingHorizontal: 16 }}>
        {/* Filtro de Roles */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={FILTERS}
            keyExtractor={(f) => f.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            renderItem={({ item: f }) => (
              <TouchableOpacity
                onPress={() => setRoleFilter(f.key)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: roleFilter === f.key ? appColors.primary : colors.border,
                    backgroundColor: roleFilter === f.key ? `${appColors.primary}18` : colors.surface,
                  },
                ]}
              >
                <Text style={[styles.filterText, { color: roleFilter === f.key ? appColors.primary : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Buscador y Ordenamiento */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Feather name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar por nombre..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
            style={[
              styles.sortButton,
              {
                borderColor: colors.border,
                backgroundColor: sortOrder === 'newest' ? `${appColors.primary}10` : colors.surface,
              },
            ]}
          >
            <Feather
              name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'}
              size={16}
              color={sortOrder === 'newest' ? appColors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.sortText,
                { color: sortOrder === 'newest' ? appColors.primary : colors.textSecondary },
              ]}
            >
              {sortOrder === 'newest' ? 'Recientes' : 'Antiguos'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Usuarios */}
        {loading ? (
          <View style={appStyles.centerFlex}>
            <ActivityIndicator size="large" color={appColors.primary} />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={appStyles.centerFlex}>
            <EmptyState
              icon="users"
              title="SIN RESULTADOS"
              subtitle={searchQuery ? 'Prueba con otra búsqueda' : 'No hay usuarios en este rol'}
            />
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            onRefresh={fetchUsers}
            refreshing={loading}
          />
        )}
      </Animated.View>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: { marginBottom: 12 },
  filterScroll: { gap: 8, paddingVertical: 4 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  filterText: { fontSize: 10, letterSpacing: 1, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, height: '100%', fontFamily: 'Inter_400Regular' },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 6,
  },
  sortText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listContainer: { paddingBottom: 32, gap: 10 },
  userCard: { padding: 14, borderRadius: 20 },
  userCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
  userDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  roleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, fontFamily: 'Inter_800ExtraBold' },
});
