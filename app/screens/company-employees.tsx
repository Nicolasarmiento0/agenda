import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { appColors, appStyles } from '../../styles/appStyles';

export default function CompanyEmployeesScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);

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
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>EMPLEADOS</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Botón invitar */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[localStyles.addButton, { borderColor: appColors.primary }]}
          >
            <Feather name="user-plus" size={18} color={appColors.primary} />
            <Text style={[localStyles.addButtonText, { color: appColors.primary }]}>INVITAR EMPLEADO</Text>
          </TouchableOpacity>

          {/* Stats */}
          <View style={localStyles.statsRow}>
            {[
              { label: 'TOTAL', value: '0' },
              { label: 'ACTIVOS', value: '0' },
            ].map((stat, i) => (
              <View key={i} style={[localStyles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[localStyles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                <Text style={[localStyles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Estado vacío */}
          <View style={localStyles.emptyContainer}>
            <View style={[localStyles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="users" size={28} color={colors.textSecondary} />
            </View>
            <Text style={[localStyles.emptyTitle, { color: colors.textPrimary }]}>SIN EMPLEADOS</Text>
            <Text style={[localStyles.emptySubtitle, { color: colors.textSecondary }]}>
              Invita a tu equipo para gestionar citas y servicios juntos.
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    marginBottom: 24,
  },
  addButtonText: { fontSize: 12, letterSpacing: 2, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  statLabel: { fontSize: 9, letterSpacing: 2 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 3 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', letterSpacing: 0.5, lineHeight: 20 },
});
