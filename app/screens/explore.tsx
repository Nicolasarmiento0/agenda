import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { SelectedBusiness, useBusiness } from '../../context/BusinessContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors } from '../../styles/appStyles';

type Category = {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
};

type BusinessWithCategory = SelectedBusiness & {
  category_id: string;
};

export default function ExploreScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { setSelectedBusiness } = useBusiness();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [businesses, setBusinesses] = useState<BusinessWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [bizRes, catRes] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, name, description, address, phone, avatar_url, status, category_id')
        .in('status', ['approved', 'suspended'])
        .order('name'),
      supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
    ]);

    if (!bizRes.error && bizRes.data) {
      setBusinesses(bizRes.data as BusinessWithCategory[]);
    }
    if (!catRes.error && catRes.data) {
      setCategories(catRes.data as Category[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSelectBusiness = (b: SelectedBusiness) => {
    setSelectedBusiness(b);
    router.push('/screens/client-agenda' as any);
  };

  const parentCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id === selectedParentId);

  const filtered = businesses.filter(b => {
    const matchesSearch = !search.trim() ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase()) ||
      b.address?.toLowerCase().includes(search.toLowerCase());

    let matchesCategory = true;
    if (selectedSubId) {
      matchesCategory = b.category_id === selectedSubId;
    } else if (selectedParentId) {
      // Si solo hay un padre seleccionado, buscar todos los hijos de ese padre
      const validSubIds = categories.filter(c => c.parent_id === selectedParentId).map(c => c.id);
      matchesCategory = validSubIds.includes(b.category_id);
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={styles.iconBtn}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>EXPLORAR</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={styles.iconBtn}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Buscador ─────────────────────────────────────────────── */}
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar negocios..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Feather name="x" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Sectores Principales ─────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CATEGORÍAS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setSelectedParentId(null);
                setSelectedSubId(null);
              }}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                !selectedParentId && { backgroundColor: appColors.primary, borderColor: appColors.primary }
              ]}
            >
              <Feather name="grid" size={16} color={!selectedParentId ? '#fff' : appColors.primary} />
              <Text style={[styles.categoryLabel, { color: !selectedParentId ? '#fff' : colors.textPrimary }]}>TODOS</Text>
            </TouchableOpacity>

            {parentCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedParentId(cat.id === selectedParentId ? null : cat.id);
                  setSelectedSubId(null);
                }}
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedParentId === cat.id && { backgroundColor: appColors.primary, borderColor: appColors.primary }
                ]}
              >
                <Feather name={(cat.icon || 'tag') as any} size={16} color={selectedParentId === cat.id ? '#fff' : appColors.primary} />
                <Text style={[styles.categoryLabel, { color: selectedParentId === cat.id ? '#fff' : colors.textPrimary }]}>
                  {cat.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Especialidades (Subcategorías) ─────────────────────────── */}
          {selectedParentId && subCategories.length > 0 && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 28 }} contentContainerStyle={{ gap: 8 }}>
                {subCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedSubId(cat.id === selectedSubId ? null : cat.id)}
                    style={[
                      styles.subCategoryChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selectedSubId === cat.id && { backgroundColor: appColors.primary, borderColor: 'transparent' }
                    ]}
                  >
                    <Text style={[styles.subCategoryLabel, { color: selectedSubId === cat.id ? '#fff' : colors.textSecondary }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* ── Lista de negocios ────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {search.trim() ? 'RESULTADOS' : 'NEGOCIOS DISPONIBLES'}
          </Text>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Cargando...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="map-pin" size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {search.trim() ? 'SIN RESULTADOS' : 'SIN NEGOCIOS'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {search.trim()
                  ? 'Intenta con otra búsqueda.'
                  : 'Aún no hay negocios disponibles.'}
              </Text>
            </View>
          ) : (
            filtered.map((b) => (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.75}
                onPress={() => handleSelectBusiness(b)}
                style={[styles.businessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Avatar */}
                <View style={[styles.businessAvatar, { backgroundColor: appColors.primary + '18' }]}>
                  <Text style={[styles.businessInitial, { color: appColors.primary }]}>
                    {b.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={[styles.businessName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {b.name}
                    </Text>
                    {b.status === 'suspended' && (
                      <View style={styles.suspendedBadge}>
                        <Text style={styles.suspendedText}>SUSPENDIDO</Text>
                      </View>
                    )}
                  </View>
                  {b.description ? (
                    <Text style={[styles.businessDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {b.description}
                    </Text>
                  ) : null}
                  {b.address ? (
                    <View style={styles.addressRow}>
                      <Feather name="map-pin" size={10} color={colors.textSecondary} />
                      <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {'  '}{b.address}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* CTA */}
                <View style={[styles.bookBtn, { backgroundColor: appColors.primary }]}>
                  <Feather name="calendar" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            ))
          )}

        </Animated.View>
      </ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '600',
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    letterSpacing: 0.4,
  },

  // Sections
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Categories horizontal
  categoriesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  subCategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  subCategoryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Business cards
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  businessAvatar: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  businessInitial: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  suspendedBadge: {
    backgroundColor: '#EF444420',
    borderColor: '#EF4444',
    borderWidth: 0.5,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  suspendedText: {
    color: '#EF4444',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  businessDesc: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  addressText: {
    fontSize: 11,
    letterSpacing: 0.3,
    flex: 1,
  },
  bookBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Empty states
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    letterSpacing: 2,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    padding: 36,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
  },
  emptySubtitle: {
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 18,
  },
});
