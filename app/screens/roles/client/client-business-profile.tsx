import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBusiness } from '../../context/BusinessContext';
import { useTheme } from '../../context/ThemeContext';
import { appColors, appStyles } from '../../styles/appStyles';

const { width } = Dimensions.get('window');

export default function ClientBusinessProfileScreen() {
  const { selectedBusiness } = useBusiness();
  const { colors, isDarkMode } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!selectedBusiness) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>No hay información del negocio.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: appColors.primary }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { name, description, phone, avatar_url, opening_time, closing_time, instagram_url, maps_url } = selectedBusiness;


  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.back()}
        style={[styles.backBtn, { backgroundColor: colors.surface, zIndex: 10 }]}
      >
        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Avatar Section */}
          <View style={[styles.avatarContainer, { borderColor: colors.background, backgroundColor: colors.surface }]}>
            {avatar_url ? (
              <Image source={{ uri: avatar_url }} style={styles.avatar} />
            ) : (
              <Text style={[styles.avatarInitial, { color: appColors.primary }]}>
                {name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Info Section */}
          <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
          
          {description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
          ) : null}

          <View style={styles.detailsContainer}>
            {/* Horario */}
            {opening_time && closing_time && (
              <View style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="clock" size={16} color={appColors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Horario de atención</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                    {opening_time.substring(0, 5)} - {closing_time.substring(0, 5)} hrs
                  </Text>
                </View>
              </View>
            )}

            {/* Google Maps */}
            {maps_url && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(maps_url)} style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="map-pin" size={16} color={appColors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Google Maps</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Abrir ubicación
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Instagram */}
            {instagram_url && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(instagram_url)} style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="instagram" size={16} color={appColors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Instagram</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Ver perfil
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Teléfono */}
            {phone && (
              <View style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="phone" size={16} color={appColors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Contacto</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{phone}</Text>
                </View>
              </View>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {/* Floating Bottom Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[appStyles.primaryButton, { width: '100%' }]}
          onPress={() => router.push('/screens/client-agenda' as any)}
        >
          <Text style={appStyles.primaryButtonText}>VER AGENDA Y RESERVAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  detailsContainer: {
    gap: 20,
    marginTop: 10,
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
