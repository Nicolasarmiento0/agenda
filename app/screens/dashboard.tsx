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


export default function DashboardScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme(); // agrega esto
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
      <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7}>
        <Text style={[localStyles.hamburger, { color: colors.textPrimary }]}>≡</Text>
      </TouchableOpacity>
      <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>DASHBOARD</Text>
      <View style={{ width: 24 }} />
    </View>

      {/* Contenido principal */}
      <View style={localStyles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={localStyles.badge}>
            <View style={localStyles.badgeDot} />
            <Text style={localStyles.badgeText}>SESIÓN ACTIVA</Text>
          </View>

          <Text style={[appStyles.title, { paddingVertical: 10 }]}>
            YA ESTÁS{'\n'}DENTRO!
          </Text>

          <Text style={appStyles.subtitle}>
            Bienvenido, {profile?.nickname ?? 'Usuario'}.
          </Text>

          <View style={localStyles.divider} />

          <View style={localStyles.card}>
            <Text style={localStyles.cardLabel}>ROL</Text>
            <Text style={localStyles.cardValue}>
              {profile?.role === 'admin' ? 'Administrador' : 'Cliente'}
            </Text>
          </View>

          <View style={localStyles.card}>
            <Text style={localStyles.cardLabel}>ESTADO</Text>
            <Text style={localStyles.cardValue}>Autenticado</Text>
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