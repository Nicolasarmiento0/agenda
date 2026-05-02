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

export default function MyAppointmentsScreen() {
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
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>MIS CITAS</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }]}>

          {/* Tabs */}
          <View style={[localStyles.tabs, { borderColor: colors.border }]}>
            <View style={[localStyles.tabActive, { borderBottomColor: appColors.primary }]}>
              <Text style={[localStyles.tabText, { color: appColors.primary }]}>PRÓXIMAS</Text>
            </View>
            <TouchableOpacity style={localStyles.tab}>
              <Text style={[localStyles.tabText, { color: colors.textSecondary }]}>HISTORIAL</Text>
            </TouchableOpacity>
          </View>

          {/* Estado vacío */}
          <View style={localStyles.emptyContainer}>
            <View style={[localStyles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="calendar" size={32} color={colors.textSecondary} />
            </View>
            <Text style={[localStyles.emptyTitle, { color: colors.textPrimary }]}>SIN CITAS</Text>
            <Text style={[localStyles.emptySubtitle, { color: colors.textSecondary }]}>
              Aún no tienes citas agendadas.{'\n'}Explora negocios y reserva una.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[localStyles.ctaButton, { backgroundColor: appColors.primary }]}
            >
              <Text style={localStyles.ctaText}>EXPLORAR NEGOCIOS</Text>
            </TouchableOpacity>
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 4,
    marginTop: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },
});
