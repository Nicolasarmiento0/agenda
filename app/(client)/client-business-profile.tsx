import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { SelectedBusiness, useBusiness } from '../../context/BusinessContext';
import Skeleton from '../../components/ui/Skeleton';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';
import BusinessReviewsListModal from '../../components/client/BusinessReviewsListModal';

const { width } = Dimensions.get('window');

export default function ClientBusinessProfileScreen() {
  const { selectedBusiness, setSelectedBusiness } = useBusiness();
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { showAlert } = useAlert();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [fetchedBusiness, setFetchedBusiness] = useState<SelectedBusiness | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  // Reviews State
  const [reviewsData, setReviewsData] = useState({ score: 0, total: 0 });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewsListModal, setShowReviewsListModal] = useState(false);
  const [newScore, setNewScore] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lightbox Gallery State
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const handleOpenLightbox = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxVisible(true);
  };


  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchBusinessData = async (businessId: string) => {
    // 1. Fetch Reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('score')
      .eq('business_id', businessId);

    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.score, 0);
      setReviewsData({
        score: parseFloat((sum / reviews.length).toFixed(1)),
        total: reviews.length
      });
    } else {
      setReviewsData({ score: 0, total: 0 });
    }

    // Fetch Business Details
    setFetchLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (data) {
      setFetchedBusiness(data);
      setSelectedBusiness(data);
    }
    setFetchLoading(false);

  };

  useEffect(() => {
    const bizId = id || selectedBusiness?.id;
    if (bizId) fetchBusinessData(bizId);
  }, [id]);

  useEffect(() => {
    if (!fetchedBusiness) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fetchedBusiness]);

  const handleSubmitReview = async () => {
    if (!profile?.id || !fetchedBusiness?.id) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('reviews').insert([{
      business_id: fetchedBusiness.id,
      client_id: profile.id,
      score: newScore,
      comment: newComment.trim()
    }]);

    setIsSubmitting(false);

    if (error) {
      showAlert({ title: 'Error', message: 'No pudimos guardar tu opinión. Inténtalo más tarde.' });
    } else {
      setShowReviewModal(false);
      setNewComment('');
      setNewScore(5);
      showAlert({ title: '¡Gracias!', message: 'Tu opinión ha sido guardada.' });
      fetchBusinessData(fetchedBusiness.id);
    }
  };


  if (fetchLoading) {
    return (
      <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
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
        <View style={[appStyles.clientProfileFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Skeleton width="100%" height={48} borderRadius={10} />
        </View>
      </View>
    );
  }

  if (!fetchedBusiness) {
    return (
      <View style={[appStyles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>No hay información del negocio.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: appColors.primary }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { name, description, avatar_url, opening_time, closing_time, instagram_url, maps_url, photos, slug } = fetchedBusiness;
  const isPreviewMode = profile?.role === 'company';

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.back()}
        style={[appStyles.clientProfileBackBtn, { backgroundColor: colors.surface, zIndex: 10 }]}
      >
        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Animated.View style={[appStyles.clientProfileContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Avatar Section */}
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

          {/* Rating Section */}
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowReviewsListModal(true)} style={appStyles.clientProfileRatingBadge}>
            <Ionicons name="star" size={14} color="#F0A030" />
            <Text style={[appStyles.clientProfileRatingScore, { color: colors.textPrimary }]}>
              {reviewsData.total > 0 ? reviewsData.score : 'Nuevo'}
            </Text>
            <Text style={[appStyles.clientProfileRatingTotal, { color: colors.textSecondary }]}>
              ({reviewsData.total > 0 ? `${reviewsData.total} opiniones` : 'Se el primero'})
            </Text>
          </TouchableOpacity>

          {description ? (
            <Text style={[appStyles.clientProfileDescription, { color: colors.textSecondary }]}>{description}</Text>
          ) : null}

          {/* Gallery Showcase */}
          {photos && photos.length > 0 ? (
            <View style={styles.galleryContainer}>
              <Text style={[styles.galleryTitle, { color: colors.textPrimary }]}>Nuestro Trabajo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                {photos.map((url, index) => (
                  <TouchableOpacity
                    key={url}
                    activeOpacity={0.9}
                    onPress={() => handleOpenLightbox(index)}
                    style={[styles.galleryItem, { borderColor: colors.border }]}
                  >
                    <Image source={{ uri: url }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

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
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(maps_url)} style={appStyles.clientProfileDetailRow}>
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
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(instagram_url)} style={appStyles.clientProfileDetailRow}>
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

            {!!slug && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(`https://nucoraapp.vercel.app/${slug}`)} style={appStyles.clientProfileDetailRow}>
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="link" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Link de reservas</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    https://nucoraapp.vercel.app/{slug}
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {!isPreviewMode && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowReviewsListModal(true)} style={appStyles.clientProfileDetailRow}>
                <View style={[appStyles.clientProfileIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="chatbubble-outline" size={16} color={appColors.primary} />
                </View>
                <View style={appStyles.clientProfileDetailTextContainer}>
                  <Text style={[appStyles.clientProfileDetailLabel, { color: colors.textSecondary }]}>Reputación</Text>
                  <Text style={[appStyles.clientProfileDetailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    Ver opiniones de clientes
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {!isPreviewMode && (
        <View style={[appStyles.clientProfileFooter, { backgroundColor: colors.background, borderTopColor: colors.border, }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[appStyles.primaryButton, { width: '100%' }]}
            onPress={() => router.push(`/calendar`)}
          >
            <Text style={appStyles.primaryButtonText}>VER AGENDA Y RESERVAR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE RESEÑAS */}
      <Modal visible={showReviewModal} transparent animationType="fade">
        <View style={appStyles.clientProfileModalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowReviewModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={appStyles.clientProfileBlurCard}>
            <View style={[appStyles.clientProfileGlassContent, !isDarkMode && appStyles.clientProfileGlassContentLight]}>

              <Text style={[appStyles.clientProfileModalTitle, { color: colors.textPrimary }]}>¿Cómo calificarías a {name}?</Text>

              <View style={appStyles.clientProfileStarsContainer}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} activeOpacity={0.7} onPress={() => setNewScore(s)} style={appStyles.clientProfileStarBtn}>
                    <Ionicons name={s <= newScore ? "star" : "star-outline"} size={36} color="#F0A030" />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[appStyles.clientProfileReviewInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Opcional: Escribe tu opinión o sugerencia..."
                placeholderTextColor={colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={250}
              />

              <TouchableOpacity
                style={[appStyles.primaryButton, { marginTop: 16 }]}
                activeOpacity={0.8}
                disabled={isSubmitting}
                onPress={handleSubmitReview}
              >
                {isSubmitting ? <ActivityIndicator color="#111827" /> : <Text style={appStyles.primaryButtonText}>ENVIAR OPINIÓN</Text>}
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* DETALLE Y LISTADO DE OPINIONES */}
      <BusinessReviewsListModal
        visible={showReviewsListModal}
        onClose={() => setShowReviewsListModal(false)}
        businessId={fetchedBusiness.id}
        businessName={name}
        onWriteReview={() => setShowReviewModal(true)}
      />

      {/* LIGHTBOX MODAL */}
      {photos && photos.length > 0 && (
        <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setLightboxVisible(false)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.lightboxContent}>
              <Image
                source={{ uri: photos[activePhotoIndex] }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            </View>

            {photos.length > 1 && (
              <View style={styles.lightboxNavContainer}>
                <TouchableOpacity
                  style={[styles.lightboxNavBtn, activePhotoIndex === 0 && { opacity: 0.4 }]}
                  disabled={activePhotoIndex === 0}
                  onPress={() => setActivePhotoIndex(idx => Math.max(0, idx - 1))}
                >
                  <Feather name="chevron-left" size={24} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.lightboxNavText}>
                  {activePhotoIndex + 1} / {photos.length}
                </Text>

                <TouchableOpacity
                  style={[styles.lightboxNavBtn, activePhotoIndex === photos.length - 1 && { opacity: 0.4 }]}
                  disabled={activePhotoIndex === photos.length - 1}
                  onPress={() => setActivePhotoIndex(idx => Math.min(photos.length - 1, idx + 1))}
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
  galleryContainer: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
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
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  lightboxNavContainer: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxNavText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
