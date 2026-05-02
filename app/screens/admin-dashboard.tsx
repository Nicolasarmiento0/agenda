import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; // agrega import
import { appColors, appStyles } from '../../styles/appStyles';


export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme(); // agrega esto
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <View style={localStyles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={[localStyles.hamburger, { color: colors.textPrimary }]}>≡</Text>
        </TouchableOpacity>
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>ADMIN DASHBOARD</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
      <View style={localStyles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={localStyles.badge}>
            <View style={localStyles.badgeDot} />
            <Text style={localStyles.badgeText}>SESIÓN ACTIVA</Text>
          </View>

          {/* Textos principales */}
          <Text style={[appStyles.title, { paddingVertical: 10, color: colors.textPrimary }]}>
            PANEL DE{'\n'}ADMINISTRACIÓN
          </Text>

          <Text style={[appStyles.subtitle, { color: colors.textSecondary }]}>
            Bienvenido, {profile?.nickname ?? 'Usuario'}.
          </Text>

          <View style={[localStyles.divider, { backgroundColor: colors.border }]} />

          <View style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[localStyles.cardLabel, { color: colors.textSecondary }]}>ROL</Text>
            <Text style={[localStyles.cardValue, { color: colors.textPrimary }]}>
              {profile?.role === 'admin' ? 'Administrador' :
                profile?.role === 'company' ? 'Empresa' : 'Cliente'}
            </Text>
          </View>

          <View style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[localStyles.cardLabel, { color: colors.textSecondary }]}>ESTADO</Text>
            <Text style={[localStyles.cardValue, { color: colors.textPrimary }]}>Autenticado</Text>
          </View>


        </Animated.View>
      </View>

      {/* Sidebar */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

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
  hamburger: {
    color: appColors.textPrimary,
    fontSize: 26,
  },
  headerLabel: {
    color: appColors.textSecondary,
    fontSize: 11,
    letterSpacing: 3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: appColors.primary,
  },
  badgeText: {
    color: appColors.primary,
    fontSize: 11,
    letterSpacing: 3,
  },
  divider: {
    height: 1,
    backgroundColor: appColors.border,
    marginVertical: 28,
  },
  card: {
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 4,
    backgroundColor: appColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 4,
  },
  cardLabel: {
    color: appColors.textSecondary,
    fontSize: 10,
    letterSpacing: 3,
  },
  cardValue: {
    color: appColors.textPrimary,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});