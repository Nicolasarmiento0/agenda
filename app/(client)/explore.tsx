import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import GlassCard from '../../components/GlassCard';
import Skeleton from '../../components/ui/Skeleton';
import Sidebar from '../../components/Sidebar';
import { SelectedBusiness, useBusiness } from '../../context/BusinessContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors } from '../../styles/appStyles';

const H_PADDING = 16;

const BIZ_COLORS = [
  '#E31937', '#5C90D2', '#3D9E5A', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E67E22', '#2980B9', '#8E44AD', '#27AE60',
];

function getBizColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BIZ_COLORS[Math.abs(hash) % BIZ_COLORS.length];
}

// Paleta curada para chips de categoría — evita el lime primario reservado para CTAs
const CATEGORY_PALETTE = [
  '#4F46E5', '#EC4899', '#F97316', '#14B8A6',
  '#EF4444', '#8B5CF6', '#EAB308', '#10B981',
  '#06B6D4', '#84CC16', '#F43F5E', '#D946EF',
];

function getCategoryColor(index: number) {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

type Category = {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
};

type Business = {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  maps_url?: string | null;
  instagram_url?: string | null;
  avatar_url?: string | null;
  category_id: string;
  status: string;
  opening_time?: string | null;
  closing_time?: string | null;
};


type RatingInfo = { avg: number; count: number };

const getBusinessStatus = (openingTime?: string | null, closingTime?: string | null) => {
  if (!openingTime || !closingTime) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const openMinutes = parseTime(openingTime);
  const closeMinutes = parseTime(closingTime);

  const effectiveClose = closeMinutes <= openMinutes ? closeMinutes + 24 * 60 : closeMinutes;
  let effectiveCurrent = currentMinutes;

  if (closeMinutes <= openMinutes && currentMinutes < openMinutes) {
    effectiveCurrent += 24 * 60;
  }

  if (effectiveCurrent >= openMinutes && effectiveCurrent < effectiveClose) {
    if (effectiveClose - effectiveCurrent <= 60) {
      return { text: 'Cierra pronto', color: '#F59E0B' };
    }
    return { text: 'Abierto', color: '#10B981' };
  } else {
    if (openMinutes > effectiveCurrent && openMinutes - effectiveCurrent <= 60) {
      return { text: 'Abre pronto', color: '#3B82F6' };
    }
    return { text: 'Cerrado', color: '#EF4444' };
  }
};

export default function ExploreScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { setSelectedBusiness } = useBusiness();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, RatingInfo>>({});
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
    const [bizRes, catRes, reviewsRes] = await Promise.all([
      supabase.from('businesses').select('*').eq('status', 'approved').order('name'),
      supabase.from('service_categories').select('*').eq('is_active', true).order('name'),
      supabase.from('reviews').select('business_id, score'),
    ]);

    if (!bizRes.error && bizRes.data) setBusinesses(bizRes.data as Business[]);
    if (!catRes.error && catRes.data) {
      // Exclude Gimnasios category (ID: 854d3db2-1e6c-4e61-be48-e7a3fb887bd9 or name matches)
      const filtered = (catRes.data as Category[]).filter(c => 
        c.id !== '854d3db2-1e6c-4e61-be48-e7a3fb887bd9' &&
        c.name.toLowerCase() !== 'gimnasios' &&
        c.name.toLowerCase() !== 'gimnasio'
      );
      setCategories(filtered);
    }

    if (!reviewsRes.error && reviewsRes.data) {
      const sums: Record<string, { sum: number; count: number }> = {};
      reviewsRes.data.forEach((r: any) => {
        if (!sums[r.business_id]) sums[r.business_id] = { sum: 0, count: 0 };
        sums[r.business_id].sum += Number(r.score);
        sums[r.business_id].count += 1;
      });
      const map: Record<string, RatingInfo> = {};
      Object.entries(sums).forEach(([id, { sum, count }]) => {
        map[id] = { avg: sum / count, count };
      });
      setRatingsMap(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSelectBusiness = (b: Business) => {
    setSelectedBusiness(b as unknown as SelectedBusiness);
    router.push(`/client-business-profile?id=${b.id}` as any);
  };

  const parentCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id === selectedParentId);

  const filtered = businesses.filter(b => {
    const matchesSearch =
      !search.trim() ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase()) ||
      b.address?.toLowerCase().includes(search.toLowerCase());

    let matchesCategory = true;
    if (selectedSubId) {
      matchesCategory = b.category_id === selectedSubId;
    } else if (selectedParentId) {
      const validSubIds = categories
        .filter(c => c.parent_id === selectedParentId)
        .map(c => c.id);
      matchesCategory = validSubIds.includes(b.category_id);
    }
    return matchesSearch && matchesCategory;
  });

  const glassChip = {
    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={styles.iconBtn}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>DESCUBRIR</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={styles.iconBtn}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 52 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Buscador ─────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: H_PADDING }}>
            <View style={[
              styles.searchBox,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
              },
            ]}>
              <Feather name="search" size={15} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Buscar negocios, categorías..."
                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <Feather name="x" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Categorías principales ────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 16 }}
            contentContainerStyle={{ paddingHorizontal: H_PADDING, gap: 8 }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { setSelectedParentId(null); setSelectedSubId(null); }}
              style={[styles.chip, !selectedParentId ? styles.chipActive : glassChip]}
            >
              <Feather name="grid" size={13} color={!selectedParentId ? '#111827' : colors.textSecondary} />
              <Text style={[styles.chipText, { color: !selectedParentId ? '#111827' : colors.textSecondary }]}>
                TODOS
              </Text>
            </TouchableOpacity>

            {parentCategories.map((cat, index) => {
              const active = selectedParentId === cat.id;
              const catColor = getCategoryColor(index);
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => { setSelectedParentId(active ? null : cat.id); setSelectedSubId(null); }}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: catColor, borderColor: catColor }
                      : { backgroundColor: catColor + '14', borderColor: catColor + '40' },
                  ]}
                >
                  <Feather
                    name={(cat.icon || 'tag') as any}
                    size={13}
                    color={active ? '#fff' : catColor}
                  />
                  <Text style={[styles.chipText, { color: active ? '#fff' : catColor }]}>
                    {cat.name.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Subcategorías ─────────────────────────────────────── */}
          {selectedParentId && subCategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
              contentContainerStyle={{ paddingHorizontal: H_PADDING, gap: 8 }}
            >
              {subCategories.map(cat => {
                const active = selectedSubId === cat.id;
                const parentIdx = Math.max(0, parentCategories.findIndex(p => p.id === selectedParentId));
                const parentColor = selectedParentId ? getCategoryColor(parentIdx) : appColors.primary;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedSubId(active ? null : cat.id)}
                    style={[
                      styles.subChip,
                      active
                        ? { backgroundColor: parentColor, borderColor: parentColor }
                        : { backgroundColor: parentColor + '12', borderColor: parentColor + '35' },
                    ]}
                  >
                    <Text style={[styles.subChipText, { color: active ? '#fff' : parentColor }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ── Contador ─────────────────────────────────────────── */}
          {!loading && (
            <View style={[styles.countRow, { paddingHorizontal: H_PADDING }]}>
              <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
                {search.trim() ? 'RESULTADOS' : 'NEGOCIOS DISPONIBLES'}
              </Text>
              <View style={[
                styles.countBadge,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}>
                <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>
                  {filtered.length}
                </Text>
              </View>
            </View>
          )}

          {/* ── Lista de negocios ─────────────────────────────────── */}
          {loading ? (
            <View style={{ paddingHorizontal: H_PADDING, gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <GlassCard key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Skeleton width={72} height={72} borderRadius={36} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton width={160} height={16} />
                      <Skeleton width={95} height={14} borderRadius={10} />
                      <Skeleton width={110} height={14} borderRadius={12} />
                      <Skeleton width={80} height={12} />
                    </View>
                  </View>
                  <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                  <View style={{ gap: 6 }}>
                    <Skeleton width="95%" height={12} />
                    <Skeleton width="70%" height={12} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Skeleton width={120} height={12} />
                  </View>
                </GlassCard>
              ))}
            </View>
          ) : filtered.length === 0 ? (
            <View style={[styles.emptyCard, { marginHorizontal: H_PADDING, borderColor: colors.border }]}>
              <View style={[
                styles.emptyIcon,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border },
              ]}>
                <Feather name="compass" size={28} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {search.trim() ? 'SIN RESULTADOS' : 'SIN NEGOCIOS'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {search.trim()
                  ? 'Intenta con otra búsqueda o categoría.'
                  : 'Aún no hay negocios disponibles.'}
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: H_PADDING, gap: 12 }}>
              {filtered.map(b => {
                const catIndex = categories.findIndex(c => c.id === b.category_id);
                const bizColor = catIndex !== -1 ? getCategoryColor(catIndex) : getBizColor(b.id);
                const categoryName = categories[catIndex]?.name;
                const rating = ratingsMap[b.id];
                const status = getBusinessStatus(b.opening_time, b.closing_time);
                const hasBody = b.description || b.maps_url || b.instagram_url || b.opening_time || b.closing_time;

                return (
                  <GlassCard key={b.id} style={styles.card}>
                    <TouchableOpacity
                      activeOpacity={0.72}
                      onPress={() => handleSelectBusiness(b)}
                    >

                      {/* ── Cabecera: avatar + nombre + categoría + rating ── */}
                      <View style={styles.cardHeader}>
                        {/* Avatar */}
                        {b.avatar_url ? (
                          <Image
                            source={{ uri: b.avatar_url }}
                            style={[styles.avatarImg, { borderColor: bizColor + '50' }]}
                          />
                        ) : (
                          <View style={[styles.avatarInitial, { backgroundColor: bizColor + '18', borderColor: bizColor + '35' }]}>
                            <Text style={[styles.avatarInitialText, { color: bizColor }]}>
                              {b.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}

                        {/* Info */}
                        <View style={{ flex: 1, gap: 5 }}>
                          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={2}>
                            {b.name}
                          </Text>

                          {categoryName ? (
                            <View style={[styles.catPill, { backgroundColor: bizColor + '15', borderColor: bizColor + '30' }]}>
                              <Text style={[styles.catPillText, { color: bizColor }]}>{categoryName}</Text>
                            </View>
                          ) : null}

                          {status && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDarkMode ? status.color + '20' : status.color + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }} accessible={true} accessibilityLabel={`Estado: ${status.text}`}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: status.color }} />
                              <Text style={{ fontSize: 9, fontWeight: '800', color: status.color, letterSpacing: 0.5 }}>{status.text.toUpperCase()}</Text>
                            </View>
                          )}

                          {/* Rating */}
                          {rating ? (
                            <View style={styles.ratingRow}>
                              {[1, 2, 3, 4, 5].map(s => (
                                <Ionicons
                                  key={s}
                                  name={s <= Math.round(rating.avg) ? 'star' : 'star-outline'}
                                  size={11}
                                  color={s <= Math.round(rating.avg)
                                    ? '#F59E0B'
                                    : (isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)')}
                                />
                              ))}
                              <Text style={styles.ratingAvg}>{rating.avg.toFixed(1)}</Text>
                              <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                                ({rating.count})
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.noRating, { color: colors.textSecondary }]}>
                              Aún sin valoración
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* ── Cuerpo: detalles ─────────────────────────────── */}
                      {hasBody ? (
                        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                      ) : null}

                      {/* Acerca de */}
                      {b.description ? (
                        <View style={styles.bodyRow}>
                          <Feather name="info" size={12} color={colors.textSecondary} style={{ marginTop: 1 }} />
                          <Text style={[styles.bodyText, { color: colors.textSecondary }]} numberOfLines={3}>
                            {b.description}
                          </Text>
                        </View>
                      ) : null}

                      {/* Google Maps */}
                      {b.maps_url ? (
                        <TouchableOpacity
                          style={styles.bodyRow}
                          activeOpacity={0.7}
                          onPress={e => { e.stopPropagation?.(); Linking.openURL(b.maps_url!); }}
                        >
                          <Feather name="map-pin" size={12} color={appColors.primary} />
                          <Text style={[styles.linkText, { color: appColors.primary }]}>Ver en Google Maps</Text>
                          <Feather name="external-link" size={11} color={appColors.primary} />
                        </TouchableOpacity>
                      ) : null}

                      {/* Instagram */}
                      {b.instagram_url ? (
                        <TouchableOpacity
                          style={styles.bodyRow}
                          activeOpacity={0.7}
                          onPress={e => { e.stopPropagation?.(); Linking.openURL(b.instagram_url!); }}
                        >
                          <Feather name="instagram" size={12} color="#0095F6" />
                          <Text style={[styles.linkText, { color: '#0095F6' }]}>Instagram</Text>
                          <Feather name="external-link" size={11} color="#0095F6" />
                        </TouchableOpacity>
                      ) : null}

                      {/* Horario */}
                      {(b.opening_time || b.closing_time) ? (
                        <View style={styles.bodyRow}>
                          <Feather name="clock" size={12} color={colors.textSecondary} />
                          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                            {b.opening_time?.substring(0, 5) ?? '--:--'}{' – '}{b.closing_time?.substring(0, 5) ?? '--:--'}
                          </Text>
                        </View>
                      ) : null}

                      {/* ── CTA ──────────────────────────────────────────── */}
                      <View style={styles.ctaRow}>
                        <Text style={[styles.ctaText, { color: appColors.primary }]}>Ver perfil completo</Text>
                        <Feather name="arrow-right" size={14} color={appColors.primary} />
                      </View>

                    </TouchableOpacity>
                  </GlassCard>
                );
              })}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
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

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.3,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary,
  },
  chipText: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
    fontFamily: 'Varien',
  },

  subChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  subChipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    marginBottom: 14,
  },
  countLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  loadingContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
  },

  // Card
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 0,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },

  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    flexShrink: 0,
  },
  avatarInitial: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitialText: {
    fontSize: 26,
    fontWeight: '700',
  },

  cardName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 20,
    fontFamily: 'Varien',
  },

  catPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingAvg: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 10,
    marginLeft: 1,
  },
  noRating: {
    fontSize: 10,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },

  // Body rows
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bodyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // CTA
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  // Empty
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
  },
  emptySubtitle: {
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: 'center',
    lineHeight: 18,
  },
});
