import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { appColors, appStyles } from '../styles/appStyles';

type PublicBusiness = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar_url?: string;
  opening_time?: string;
  closing_time?: string;
  instagram_url?: string;
  maps_url?: string;
  photos?: string[];
  status: string;
};

type PublicData = {
  business: PublicBusiness;
  services: { id: string; name: string; price: number; duration_min: number }[];
  workers: { id: string; name: string; avatar_url?: string }[];
  rating: number;
  reviews_count: number;
};

const PENDING_BOOKING_KEY = 'pendingBooking';

export default function PublicBusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session, profile } = useAuth();
  const { colors } = useTheme();

  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!slug) return;
    loadBusiness(slug as string);
  }, [slug]);

  useEffect(() => {
    if (!data) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [data]);

  const loadBusiness = async (businessSlug: string) => {
    setLoading(true);
    setNotFound(false);
    const { data: result, error } = await supabase
      .rpc('get_public_business', { p_slug: businessSlug });

    setLoading(false);

    if (error || !result) {
      setNotFound(true);
      return;
    }

    setData(result as PublicData);
  };

  const handleReserve = async () => {
    if (!data?.business) return;

    if (session && profile?.role === 'client') {
      router.push(`/calendar?businessId=${data.business.id}` as any);
      return;
    }

    if (session && profile?.role && profile.role !== 'client') {
      return;
    }

    await AsyncStorage.setItem(
      PENDING_BOOKING_KEY,
      JSON.stringify({ slug: data.business.slug, businessId: data.business.id })
    );
    router.push(
      `/signup?returnTo=/${data.business.slug}&forceRole=client` as any
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  if (loading) {
    return (
      <View style={[styles.pageContainer, { backgroundColor: colors.background }]}>
        <View style={[appStyles.clientProfileBackBtn, { backgroundColor: colors.surface, zIndex: 10 }]}>
          <Feather name="arrow-left" size={20} color={colors.textSecondary} style={{ opacity: 0.4 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={appStyles.clientProfileContent}>
            <View style={[appStyles.clientProfileAvatarContainer, { borderColor: colors.background, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
              <Skeleton width={72} height={72} borderRadius={36} />
            </View>
            <Skeleton width={180} height={20} style={{ alignSelf: 'center', marginTop: 12 }} />
            <Skeleton width={130} height={16} style={{ alignSelf: 'center', marginTop: 8 }} />
            <View style={{ gap: 6, width: '100%', alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
              <Skeleton width="80%" height={12} />
              <Skeleton width="55%" height={12} />
            </View>
            <View style={styles.galleryContainer}>
              <Skeleton width={110} height={16} style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Skeleton width={150} height={110} borderRadius={12} />
                <Skeleton width={150} height={110} borderRadius={12} />
                <Skeleton width={50} height={110} borderRadius={12} />
              </View>
            </View>
            <View style={[appStyles.clientProfileDetailsContainer, { gap: 16 }]}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Skeleton width={36} height={36} borderRadius={8} />
                  <View style={{ gap: 6, flex: 1 }}>
                    <Skeleton width={140} height={13} />
                    <Skeleton width={80} height={10} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Skeleton width="100%" height={48} borderRadius={10} />
        </View>
      </View>
    );
  }

  if (notFound || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="slash" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
        <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
          Negocio no disponible
        </Text>
        <Text style={[styles.notFoundSub, { color: colors.textSecondary }]}>
          Este link no existe o el negocio ya no está activo.
        </Text>
        <TouchableOpacity style={{ marginTop: 24 }} onPress={handleBack}>
          <Text style={{ color: appColors.primary, fontSize: 14, letterSpacing: 1 }}>VOLVER</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { business, services, rating, reviews_count } = data;
  const { name, description, avatar_url, opening_time, closing_time, instagram_url, maps_url, photos } = business;
  const isCompanyPreview = session && profile?.role && profile.role !== 'client';

  return (
    <View style={[styles.pageContainer, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleBack}
        style={[appStyles.clientProfileBackBtn, { backgroundColor: colors.surface, zIndex: 10 }]}
      >
        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Animated.View
          style={[appStyles.clientProfileContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Avatar */}
          <View style={[appStyles.clientProfileAvatarContainer, { borderColor: colors.background, backgroundColor: colors.surface }]}>
            {avatar_url ? (
              <Image source={{ uri: avatar_url }} style={appStyles.clientProfileAvatar} />
            ) : (
              <Text style={[appStyles.clientProfileAvatarInitial, { color: appColors.primary }]}>
                {name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <Text style={[appStyles.clientProfileName, { color: colors.textPrimary }]}>{name}</Text>

          {/* Rating */}
          <View style={appStyles.clientProfileRatingBadge}>
            <Ionicons name="star" size={14} color="#F0A030" />
            <Text style={[appStyles.clientProfileRatingScore, { color: colors.textPrimary }]}>
              {reviews_count > 0 ? rating : 'Nuevo'}
            </Text>
            <Text style={[appStyles.clientProfileRatingTotal, { color: colors.textSecondary }]}>
              ({reviews_count > 0 ? `${reviews_count} opiniones` : 'Sé el primero'})
            </Text>
          </View>

          {description ? (
            <Text style={[appStyles.clientProfileDescription, { color: colors.textSecondary }]}>
              {description}
            </Text>
          ) : null}

          {/* Services */}
          {services && services.length > 0 ? (
            <View style={styles.servicesContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Servicios</Text>
              {services.map((svc) => (
                <View key={svc.id} style={[styles.serviceRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.serviceName, { color: colors.textPrimary }]}>{svc.name}</Text>
                    {svc.duration_min > 0 && (
                      <Text style={[styles.serviceDuration, { color: colors.textSecondary }]}>
                        {svc.duration_min} min
                      </Text>
                    )}
                  </View>
                  {svc.price > 0 && (
                    <Text style={[styles.servicePrice, { color: appColors.primary }]}>
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(svc.price)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : null}

          {/* Gallery */}
          {photos && photos.length > 0 ? (
            <View style={styles.galleryContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Nuestro Trabajo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                {photos.map((url, index) => (
                  <TouchableOpacity
                    key={url}
                    activeOpacity={0.9}
                    onPress={() => { setActivePhotoIndex(index); setLightboxVisible(true); }}
                    style={[styles.galleryItem, { borderColor: colors.border }]}
                  >
                    <Image source={{ uri: url }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Info rows */}
          <View style={appStyles.clientProfileDetailsContainer}>
            {!!opening_time && !!closing_time && (
              <View style={appStyles.clientProfileDetailRow}>
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="clock" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Horario de atención</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]}>
                    {opening_time.substring(0, 5)} - {closing_time.substring(0, 5)} hrs
                  </Text>
                </View>
              </View>
            )}

            {!!maps_url && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => Linking.openURL(maps_url)}
                style={appStyles.clientProfileDetailRow}
              >
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="map-pin" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Google Maps</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Abrir ubicación
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {!!instagram_url && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => Linking.openURL(instagram_url)}
                style={appStyles.clientProfileDetailRow}
              >
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="instagram" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Instagram</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Ver perfil
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* CTA — flex child (not absolute) so it stays visible on web/PC */}
      {!isCompanyPreview && (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[appStyles.primaryButton, { width: '100%' }]}
            onPress={handleReserve}
          >
            <Text style={appStyles.primaryButtonText}>RESERVAR HORA</Text>
          </TouchableOpacity>
          {!session && (
            <Text style={[styles.ctaHint, { color: colors.textSecondary }]}>
              Se te pedirá crear cuenta gratis para confirmar
            </Text>
          )}
        </View>
      )}

      {/* Lightbox */}
      {photos && photos.length > 0 && (
        <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setLightboxVisible(false)} activeOpacity={0.7}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.lightboxContent}>
              <Image source={{ uri: photos[activePhotoIndex] }} style={styles.lightboxImage} resizeMode="contain" />
            </View>
            {photos.length > 1 && (
              <View style={styles.lightboxNav}>
                <TouchableOpacity
                  style={[styles.lightboxNavBtn, activePhotoIndex === 0 && { opacity: 0.4 }]}
                  disabled={activePhotoIndex === 0}
                  onPress={() => setActivePhotoIndex(i => Math.max(0, i - 1))}
                >
                  <Feather name="chevron-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.lightboxNavText}>{activePhotoIndex + 1} / {photos.length}</Text>
                <TouchableOpacity
                  style={[styles.lightboxNavBtn, activePhotoIndex === photos.length - 1 && { opacity: 0.4 }]}
                  disabled={activePhotoIndex === photos.length - 1}
                  onPress={() => setActivePhotoIndex(i => Math.min(photos.length - 1, i + 1))}
                >
                  <Feather name="chevron-right" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  servicesContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  serviceDuration: {
    fontSize: 12,
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  galleryContainer: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  galleryScroll: {
    gap: 12,
    paddingRight: 20,
  },
  galleryItem: {
    width: 150,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  ctaHint: {
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 0.3,
    marginTop: 8,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lightboxContent: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '90%',
    height: '100%',
  },
  lightboxNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '60%',
    position: 'absolute',
    bottom: 50,
  },
  lightboxNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxNavText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
