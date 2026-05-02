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
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { appColors, appStyles } from '../../styles/appStyles';

export default function CompanyBusinessScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { profile, business } = useAuth();
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

  const statusColor =
    business?.status === 'approved' ? '#4CAF50'
      : business?.status === 'pending' ? '#FFA726'
        : business?.status === 'rejected' ? '#EF5350'
          : appColors.primary;

  const statusLabel =
    business?.status === 'approved' ? 'APROBADO'
      : business?.status === 'pending' ? 'PENDIENTE'
        : business?.status === 'rejected' ? 'RECHAZADO'
          : 'SUSPENDIDO';

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={[localStyles.hamburger, { color: colors.textPrimary }]}>≡</Text>
        </TouchableOpacity>
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>MI NEGOCIO</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Badge */}
          <View style={localStyles.badge}>
            <View style={[localStyles.badgeDot, { backgroundColor: statusColor }]} />
            <Text style={[localStyles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <Text style={[appStyles.title, { paddingVertical: 10, color: colors.textPrimary }]}>
            {business?.name ?? 'MI\nNEGOCIO'}
          </Text>

          <View style={[localStyles.divider, { backgroundColor: colors.border }]} />

          {/* Info cards */}
          {[
            { label: 'NOMBRE', value: business?.name ?? '—' },
            { label: 'PROPIETARIO', value: profile?.nickname ?? '—' },
            { label: 'ESTADO', value: statusLabel },
          ].map((item, i) => (
            <View key={i} style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[localStyles.cardLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[localStyles.cardValue, { color: colors.textPrimary }]}>{item.value}</Text>
            </View>
          ))}

          {/* Botón editar (placeholder) */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[localStyles.editButton, { backgroundColor: appColors.primary }]}
          >
            <Feather name="edit-2" size={16} color="#fff" />
            <Text style={localStyles.editButtonText}>EDITAR INFORMACIÓN</Text>
          </TouchableOpacity>

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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 11, letterSpacing: 3 },
  divider: { height: 1, marginVertical: 28 },
  card: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 4,
  },
  cardLabel: { fontSize: 10, letterSpacing: 3 },
  cardValue: { fontSize: 14, letterSpacing: 0.5 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 4,
    marginTop: 8,
  },
  editButtonText: { color: '#fff', fontSize: 13, letterSpacing: 2, fontWeight: '600' },
});
