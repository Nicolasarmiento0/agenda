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

const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const today = new Date().getDay(); // 0=dom, reindex
const todayIdx = today === 0 ? 6 : today - 1;

export default function CompanyAgendaScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(todayIdx);

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
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>AGENDA</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>

        {/* Selector de días */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.daysScroll}>
          {DAYS.map((day, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedDay(i)}
              style={[
                localStyles.dayChip,
                {
                  backgroundColor: selectedDay === i ? appColors.primary : colors.surface,
                  borderColor: selectedDay === i ? appColors.primary : colors.border,
                },
              ]}
            >
              <Text style={[localStyles.dayText, { color: selectedDay === i ? '#fff' : colors.textSecondary }]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats rápidas */}
        <View style={localStyles.statsRow}>
          {[
            { label: 'CITAS HOY', value: '0' },
            { label: 'PENDIENTES', value: '0' },
            { label: 'COMPLETADAS', value: '0' },
          ].map((stat, i) => (
            <View key={i} style={[localStyles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[localStyles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
              <Text style={[localStyles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Estado vacío */}
        <View style={[localStyles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="calendar" size={28} color={colors.textSecondary} />
          <Text style={[localStyles.emptyTitle, { color: colors.textPrimary }]}>SIN CITAS</Text>
          <Text style={[localStyles.emptySubtitle, { color: colors.textSecondary }]}>
            No hay citas agendadas para este día.
          </Text>
        </View>

      </Animated.View>

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
  daysScroll: { marginBottom: 20 },
  dayChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  dayText: { fontSize: 11, letterSpacing: 2, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
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
  emptyCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 3 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', letterSpacing: 0.5 },
});
