import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { SelectedBusiness, useBusiness } from '../../../../context/BusinessContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

const { width } = Dimensions.get('window');

export default function ClientBusinessProfileScreen() {
  const { selectedBusiness, setSelectedBusiness } = useBusiness();
  const { colors, isDarkMode } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [fetchedBusiness, setFetchedBusiness] = useState<SelectedBusiness | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Si no hay negocio en contexto (ej: recarga de página) pero hay un id en la URL,
  // lo fetcheamos directamente desde Supabase.
  useEffect(() => {
    if (selectedBusiness) {
      setFetchedBusiness(selectedBusiness);
      return;
    }
    if (!id) return;

    setFetchLoading(true);
    supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setFetchedBusiness(data);
          setSelectedBusiness(data); // repoblar contexto
        } else {
          console.error('ClientBusinessProfile: error fetching business by id', error);
        }
        setFetchLoading(false);
      });
  }, [id, selectedBusiness]);

  useEffect(() => {
    if (!fetchedBusiness) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fetchedBusiness]);

  if (fetchLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (!fetchedBusiness) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>No hay información del negocio.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: appColors.primary }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { name, description, avatar_url, opening_time, closing_time, instagram_url, maps_url } = fetchedBusiness;

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

          <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>

          {description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
          ) : null}

          <View style={styles.detailsContainer}>
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
          </View>

        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[appStyles.primaryButton, { width: '100%' }]}
          onPress={() => router.push((`/screens/roles/client/client-agenda?id=${fetchedBusiness.id}`) as any)}
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.1)' },
    }),
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.1)' },
    }),
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
