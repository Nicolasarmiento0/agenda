import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { appColors, appStyles } from '../../styles/appStyles';

const CATEGORIES = [
  { icon: 'scissors', label: 'Barbería' },
  { icon: 'heart', label: 'Spa' },
  { icon: 'star', label: 'Uñas' },
  { icon: 'zap', label: 'Tatuajes' },
  { icon: 'sun', label: 'Bronceado' },
  { icon: 'smile', label: 'Estética' },
];

export default function ExploreScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [search, setSearch] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={[localStyles.hamburger, { color: colors.textPrimary }]}>≡</Text>
        </TouchableOpacity>
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>EXPLORAR</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Buscador */}
          <View style={[localStyles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={[localStyles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar negocios..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Categorías */}
          <Text style={[localStyles.sectionTitle, { color: colors.textSecondary }]}>CATEGORÍAS</Text>
          <View style={localStyles.categoriesGrid}>
            {CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                style={[localStyles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Feather name={cat.icon as any} size={22} color={appColors.primary} />
                <Text style={[localStyles.categoryLabel, { color: colors.textPrimary }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Estado vacío */}
          <View style={[localStyles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="map-pin" size={32} color={colors.textSecondary} />
            <Text style={[localStyles.emptyTitle, { color: colors.textPrimary }]}>DESCUBRE NEGOCIOS</Text>
            <Text style={[localStyles.emptySubtitle, { color: colors.textSecondary }]}>
              Próximamente podrás buscar y reservar citas con negocios cercanos a ti.
            </Text>
          </View>

        </Animated.View>
      </ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
  },
  hamburger: { fontSize: 26 },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 28,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 14,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  categoryCard: {
    width: '30%',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '500',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  emptySubtitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
});
