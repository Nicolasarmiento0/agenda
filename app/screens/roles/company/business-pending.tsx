import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GlassCard from '../../../../components/GlassCard';
import ScreenHeader from '../../../../components/ScreenHeader';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { appColors, appStyles } from '../../../../styles/appStyles';

export default function BusinessPendingScreen() {
  const { profile, business, signOut, refreshProfile } = useAuth();
  const { colors } = useTheme();

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
      router.replace('/screens/roles/company/dashboard-company' as any);
    }
  }, [business?.status]);

  const isRejected = business?.status === 'rejected';

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isRejected ? 'SOLICITUD RECHAZADA' : 'EN REVISIÓN'}
        leftIcon="log-out"
        onLeft={signOut}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <View style={styles.content}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', width: '100%' }}>

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
              <GlassCard style={styles.businessCard}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>NEGOCIO REGISTRADO</Text>
                <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{business.name}</Text>
              </GlassCard>
            )}

            <GlassCard style={styles.businessCard}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>PROPIETARIO</Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{profile?.nickname ?? '—'}</Text>
            </GlassCard>

            {/* Info de estado pendiente */}
            {!isRejected && (
              <View style={[styles.infoBox, { backgroundColor: `${appColors.primary}10`, borderColor: `${appColors.primary}40` }]}>
                <Feather name="info" size={16} color={appColors.primary} />
                <Text style={[styles.infoText, { color: appColors.primary }]}>
                  {'Su cuenta está en revisión, para una rápida atención enviar mensaje directo a través de instagram a '}
                  <Text
                    style={styles.infoLink}
                    onPress={() => Linking.openURL('https://www.instagram.com/nucorapp/')}
                  >
                    @nucorapp
                  </Text>
                  {', al abrir la app después de la aprobación, serás redirigido automáticamente a tu panel.'}
                </Text>
              </View>
            )}

            {/* Botón volver a registrar (solo si rechazado) */}
            {isRejected && (
              <TouchableOpacity
                style={[appStyles.primaryButton, { marginTop: 24, width: '100%' }]}
                activeOpacity={0.8}
                onPress={() => router.replace('/screens/roles/company/business-setup' as any)}
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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 16 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardLabel: { fontSize: 10, letterSpacing: 3, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  cardValue: { fontSize: 15, letterSpacing: 0.5, fontWeight: '500', fontFamily: 'Inter_500Medium', textAlign: 'center' },
  infoBox: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    width: '100%',
  },
  infoText: { fontSize: 12, letterSpacing: 0.3, lineHeight: 18, textAlign: 'center' },
  infoLink: { textDecorationLine: 'underline', fontFamily: 'Inter_600SemiBold' },
});