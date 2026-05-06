import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { appColors, appStyles } from '../../styles/appStyles';

export default function BusinessPendingScreen() {
  const { profile, business, signOut, refreshProfile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [refreshing, setRefreshing] = useState(false);

  // Animar entrada
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Pulso continuo en el ícono de reloj
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  // Refrescar perfil/negocio cada vez que se vuelve a esta pantalla
  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  // Cuando el admin aprueba, business.status cambia a 'approved' -> redirigir al dashboard
  useEffect(() => {
    if (business?.status === 'approved') {
      router.replace('/screens/dashboard-company' as any);
    }
  }, [business?.status]);

  const isRejected = business?.status === 'rejected';

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={signOut} activeOpacity={0.7} style={styles.headerBtn}>
          <Feather name="log-out" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
          {isRejected ? 'SOLICITUD RECHAZADA' : 'EN REVISIÓN'}
        </Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={[styles.headerBtn, { alignItems: 'flex-end' }]}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <View style={styles.content}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>

            {/* Ícono animado */}
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isRejected ? '#FF3B3020' : `${appColors.primary}18`,
                  borderColor: isRejected ? '#FF3B30' : appColors.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Feather
                name={isRejected ? 'x-circle' : 'clock'}
                size={48}
                color={isRejected ? '#FF3B30' : appColors.primary}
              />
            </Animated.View>

            {/* Título */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {isRejected ? 'SOLICITUD\nRECHAZADA' : 'EN\nREVISIÓN'}
            </Text>

            {/* Subtítulo */}
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isRejected
                ? 'Tu solicitud fue rechazada. Puedes crear un nuevo negocio con la información corregida.'
                : 'Estamos verificando la información de tu negocio. Te notificaremos cuando sea aprobado.'}
            </Text>

            {/* Card del negocio */}
            {business?.name && (
              <View style={[styles.businessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>NEGOCIO REGISTRADO</Text>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{business.name}</Text>
              </View>
            )}

            <View style={[styles.businessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>PROPIETARIO</Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{profile?.nickname ?? '—'}</Text>
            </View>

            {/* Info de estado pendiente */}
            {!isRejected && (
              <View style={[styles.infoBox, { backgroundColor: `${appColors.primary}10`, borderColor: `${appColors.primary}40` }]}>
                <Feather name="info" size={14} color={appColors.primary} />
                <Text style={[styles.infoText, { color: appColors.primary }]}>
                  Al abrir la app después de la aprobación, serás redirigido automáticamente a tu panel.
                </Text>
              </View>
            )}

            {/* Botón volver a registrar (solo si rechazado) */}
            {isRejected && (
              <TouchableOpacity
                style={[appStyles.primaryButton, { marginTop: 24 }]}
                activeOpacity={0.8}
                onPress={() => router.replace('/screens/business-setup' as any)}
              >
                <Text style={appStyles.primaryButtonText}>REGISTRAR NUEVO NEGOCIO</Text>
              </TouchableOpacity>
            )}

          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
  },
  headerBtn: { width: 40 },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  businessCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 4,
  },
  cardLabel: { fontSize: 10, letterSpacing: 3 },
  cardValue: { fontSize: 15, letterSpacing: 0.5, fontWeight: '500' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
    marginTop: 8,
    width: '100%',
  },
  infoText: { flex: 1, fontSize: 12, letterSpacing: 0.3, lineHeight: 18 },
});